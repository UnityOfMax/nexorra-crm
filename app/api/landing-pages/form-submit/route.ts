import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { enrollNewLead } from '@/lib/automations/enrollment';
import { triggerContactCreated, triggerDealStageChanged } from '@/lib/workflow-engine/triggers';
import { stopContactWorkflows } from '@/lib/workflow-engine/stop-workflows';
import { sendPushToAccountOwnerIfEnabled } from '@/lib/push/send-notification';
import { normalizePhone, phoneVariants } from '@/lib/utils/phone';
import { sendCapiEvent } from '@/lib/meta/capi';
import { updateLeadScore } from '@/lib/ai/lead-scoring';

// POST /api/landing-pages/form-submit
// Creates or updates a contact from landing page form submission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      accountId,
      first_name,
      last_name,
      phone,
      email,
      source,
      custom_fields,
      agentName,
      fbc,
      fbp,
      event_id,
      session_id,
      page_id,
      slug,
      pipeline_stage_id,
      pipeline_id,
      stage_name,
      stage_probability,
    } = body;

    if (!accountId || (!phone && !email)) {
      return NextResponse.json({ error: 'accountId and phone or email required' }, { status: 400 });
    }

    // Normalize phone to E.164 so lookups match regardless of input format
    const normalizedPhone = phone ? normalizePhone(phone) : null;

    // Check if contact already exists by phone or email
    let existingContact = null;

    if (normalizedPhone) {
      const variants = phoneVariants(phone);
      const orFilter = variants.map((v) => `phone.eq.${v}`).join(',');
      const { data } = await supabaseAdmin
        .from('contacts')
        .select('id, custom_fields')
        .eq('account_id', accountId)
        .or(orFilter)
        .limit(1)
        .maybeSingle();
      existingContact = data;
    }

    if (!existingContact && email) {
      const { data } = await supabaseAdmin
        .from('contacts')
        .select('id, custom_fields')
        .eq('account_id', accountId)
        .eq('email', email)
        .single();
      existingContact = data;
    }

    let contactId: string;

    // Try INSERT first. If unique constraint fires (23505 — same phone or email already
    // exists in this account), fall back to SELECT + UPDATE.
    // This is race-proof: the DB partial unique indexes block any duplicate regardless
    // of concurrent submissions. .upsert() is NOT used because it doesn't work with
    // partial unique indexes in PostgREST.
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('contacts')
      .insert({
        account_id:   accountId,
        first_name:   first_name || null,
        last_name:    last_name  || null,
        phone:        normalizedPhone || null,
        email:        email || null,
        status:       'lead',
        source:       source || 'Landing Page',
        custom_fields: custom_fields || {},
        fbc:          fbc || null,
        fbp:          fbp || null,
        funnel_stage: 'lead',
      })
      .select('id')
      .single();

    if (!insertErr) {
      contactId = inserted.id;
    } else if (insertErr.code === '23505') {
      // Duplicate — find and update the existing contact
      if (!existingContact) {
        // Re-query in case the race happened after our earlier lookup
        const lookup = normalizedPhone
          ? supabaseAdmin.from('contacts').select('id, custom_fields').eq('account_id', accountId).eq('phone', normalizedPhone)
          : supabaseAdmin.from('contacts').select('id, custom_fields').eq('account_id', accountId).eq('email', email!);
        const { data: found } = await lookup.maybeSingle();
        existingContact = found;
      }
      if (!existingContact) throw insertErr;
      const mergedFields = { ...(existingContact.custom_fields || {}), ...(custom_fields || {}) };
      await supabaseAdmin.from('contacts').update({
        first_name:   first_name    || undefined,
        last_name:    last_name     || undefined,
        phone:        normalizedPhone || undefined,
        email:        email         || undefined,
        source:       source        || 'Landing Page',
        custom_fields: mergedFields,
        fbc:          fbc           || undefined,
        fbp:          fbp           || undefined,
        updated_at:   new Date().toISOString(),
      }).eq('id', existingContact.id);
      contactId = existingContact.id;
    } else {
      throw insertErr;
    }

    // Write per-step funnel events from answered questions (non-blocking)
    const stepFieldMap: Record<string, string> = {
      'Intent': 'intent', 'Current Situation': 'situation', 'Timeline': 'timeline',
      'Budget': 'budget', 'Wishlist': 'wishlist', 'Also Selling': 'sell_also',
      'Employer': 'employment', 'Annual Income': 'income',
      'Best Call Time': 'call_time', 'Serious Buyer': 'serious',
    };
    const answeredSteps = Object.entries(custom_fields || {})
      .filter(([key, val]) => stepFieldMap[key] && val)
      .map(([key, val]) => ({
        account_id: accountId,
        contact_id: contactId,
        event_type: 'form_step',
        channel: 'web',
        metadata: { step: stepFieldMap[key], value: val, session_id: session_id || null },
      }));
    if (answeredSteps.length) {
      void supabaseAdmin.from('funnel_events').insert(answeredSteps);
    }

    // Funnel tracking + lead score (non-blocking, always)
    void supabaseAdmin
      .from('funnel_events')
      .insert({
        account_id: accountId,
        contact_id: contactId,
        event_type: 'form_submit',
        channel: 'web',
      });

    updateLeadScore(contactId).catch((err) =>
      console.error('[form-submit] lead score error:', err)
    );

    // New contacts only: CAPI Lead event, automation enrollment, workflow trigger, push
    const contactName = [first_name, last_name].filter(Boolean).join(' ') || 'there';
    if (!existingContact) {
      const capiEventId = event_id || crypto.randomUUID();
      sendCapiEvent({
        eventName: 'Lead',
        eventId: capiEventId,
        userData: {
          email: email || undefined,
          phone: normalizedPhone || undefined,
          firstName: first_name || undefined,
          lastName: last_name || undefined,
          fbc: fbc || undefined,
          fbp: fbp || undefined,
          externalId: contactId,
        },
        accountId,
        contactId,
      }).catch((err) => console.error('[form-submit] CAPI error:', err));

      enrollNewLead({
        accountId,
        contactId,
        contactName,
        agentName: agentName || 'Your Agent',
      }).catch((err) => console.error('[form-submit] automation enrollment error:', err));

      triggerContactCreated(accountId, contactId).catch((err) =>
        console.error('[form-submit] workflow trigger error:', err)
      );

      sendPushToAccountOwnerIfEnabled(accountId, 'new_leads', {
        title: '🔥 New Lead',
        body: `${contactName} just submitted a form`,
        tag: 'new-lead',
        url: `/contacts/${contactId}`,
      }).catch((err) => console.error('[form-submit] push notification error:', err));
    }

    // ── Deal upsert (pipeline stage progression) ──────────────────────────────
    if (pipeline_stage_id) {
      try {
        const contactName = [first_name, last_name].filter(Boolean).join(' ') || 'Lead';

        // Find any existing open deal for this contact
        const { data: existingDeal } = await supabaseAdmin
          .from('deals')
          .select('id, pipeline_stage_id')
          .eq('account_id', accountId)
          .eq('contact_id', contactId)
          .eq('status', 'open')
          .limit(1)
          .maybeSingle();

        if (existingDeal) {
          // Only advance — never demote. Check positions first.
          if (existingDeal.pipeline_stage_id !== pipeline_stage_id) {
            const { data: stageRows } = await supabaseAdmin
              .from('pipeline_stages')
              .select('id, position')
              .in('id', [existingDeal.pipeline_stage_id, pipeline_stage_id]);

            const currentPos = stageRows?.find(s => s.id === existingDeal.pipeline_stage_id)?.position ?? -1;
            const newPos     = stageRows?.find(s => s.id === pipeline_stage_id)?.position ?? -1;

            if (newPos > currentPos) {
              await supabaseAdmin
                .from('deals')
                .update({
                  pipeline_stage_id,
                  stage:       stage_name       || undefined,
                  probability: stage_probability ?? undefined,
                  updated_at:  new Date().toISOString(),
                })
                .eq('id', existingDeal.id);
              // Stop lower-stage workflows, then fire stage-changed workflow
              stopContactWorkflows(accountId, contactId).catch(err =>
                console.error('[form-submit] stop-workflows error:', err)
              );
              triggerDealStageChanged(
                accountId,
                existingDeal.id,
                contactId,
                existingDeal.pipeline_stage_id,
                pipeline_stage_id,
              ).catch(err => console.error('[form-submit] workflow trigger error:', err));
            }
          }
        } else {
          // Create new deal at this stage
          await supabaseAdmin
            .from('deals')
            .insert({
              account_id:        accountId,
              contact_id:        contactId,
              pipeline_id:       pipeline_id || null,
              pipeline_stage_id,
              title:             `${contactName} — ${source || 'Landing Page'}`,
              stage:             stage_name       || null,
              probability:       stage_probability ?? null,
              status:            'open',
            });
          // Fire stage-changed workflow for new deals too
          triggerDealStageChanged(
            accountId,
            'new',
            contactId,
            '',
            pipeline_stage_id,
          ).catch(err => console.error('[form-submit] workflow trigger error:', err));
        }
      } catch (dealErr) {
        console.error('[form-submit] deal upsert error:', dealErr);
      }
    }

    return NextResponse.json({ success: true, contactId });
  } catch (error: any) {
    console.error('Form submit error:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit form' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/deals?accountId=xxx&pipelineId=xxx - List deals
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const pipelineId = searchParams.get('pipelineId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from('deals')
      .select('*, contacts(first_name, last_name, email)')
      .eq('account_id', accountId);

    if (pipelineId) {
      query = query.eq('pipeline_id', pipelineId);
    }

    const { data: deals, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching deals:', error);
      return NextResponse.json(
        { error: 'Failed to fetch deals' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: deals || [] });
  } catch (error: any) {
    console.error('Deals GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch deals' },
      { status: 500 }
    );
  }
}

// POST /api/deals - Create a new deal
export async function POST(request: NextRequest) {
  try {
    const {
      accountId,
      contactId,
      title,
      value,
      pipelineId,
      pipelineStageId,
      probability,
      expectedCloseDate,
      assignedTo,
    } = await request.json();

    if (!accountId || !title) {
      return NextResponse.json(
        { error: 'accountId and title are required' },
        { status: 400 }
      );
    }

    const { data: deal, error } = await supabaseAdmin
      .from('deals')
      .insert({
        account_id: accountId,
        contact_id: contactId,
        title,
        value: value || 0,
        pipeline_id: pipelineId,
        pipeline_stage_id: pipelineStageId,
        probability: probability !== undefined ? probability : 50,
        expected_close_date: expectedCloseDate,
        assigned_to: assignedTo,
        status: 'open',
      })
      .select()
      .single();

    if (error || !deal) {
      console.error('Error creating deal:', error);
      return NextResponse.json(
        { error: 'Failed to create deal' },
        { status: 500 }
      );
    }

    // Log activity
    await supabaseAdmin.from('activities').insert({
      account_id: accountId,
      contact_id: contactId,
      deal_id: deal.id,
      type: 'note',
      subject: 'Deal Created',
      description: `New deal created: ${title}`,
      completed: true,
      created_by: accountId, // TODO: Get actual user ID
    });

    // Trigger workflows for deal creation
    const { triggerDealCreated } = await import('@/lib/workflow-engine/triggers');
    triggerDealCreated(accountId, deal.id, contactId).catch((err) => {
      console.error('Error triggering deal_created workflows:', err);
    });

    return NextResponse.json({ deal });
  } catch (error: any) {
    console.error('Deal POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create deal' },
      { status: 500 }
    );
  }
}

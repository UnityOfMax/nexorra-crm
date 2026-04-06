import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/internal/call-completed
 *
 * Called by the Audio Bridge when a call ends.
 * Saves transcript lines, updates call_sessions, marks lead as called.
 *
 * Auth: Bearer token = CRON_SECRET (internal only, not a public webhook)
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    call_session_id,
    transcript_lines = [],
    outcome,
    duration_seconds,
    transcript,
    calendly_event_uri,
  } = body;

  if (!call_session_id) {
    return NextResponse.json({ error: 'Missing call_session_id' }, { status: 400 });
  }

  // Update call_sessions
  const { error: sessionError } = await supabaseAdmin
    .from('call_sessions')
    .update({
      status: 'completed',
      outcome: outcome || 'completed',
      duration_seconds: duration_seconds || null,
      transcript: transcript || null,
      calendly_booked: !!calendly_event_uri,
      calendly_event_uri: calendly_event_uri || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', call_session_id);

  if (sessionError) {
    console.error('[call-completed] session update error:', sessionError);
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  // Insert transcript lines (batch insert, ignore errors for individual lines)
  if (transcript_lines.length > 0) {
    const rows = transcript_lines.map((line: any) => ({
      call_session_id,
      speaker: line.speaker || 'unknown',
      text: line.text || '',
      timestamp_ms: line.timestamp_ms || null,
      classification: line.classification || null,
    }));

    const { error: transcriptError } = await supabaseAdmin
      .from('call_transcript_lines')
      .insert(rows);

    if (transcriptError) {
      console.warn('[call-completed] transcript insert warning:', transcriptError.message);
      // Non-fatal — session is already saved
    }
  }

  // Update the lead's call_status
  const { data: session } = await supabaseAdmin
    .from('call_sessions')
    .select('lead_id')
    .eq('id', call_session_id)
    .single();

  if (session?.lead_id) {
    const leadStatus =
      outcome === 'booked' ? 'booked' :
      outcome === 'not_interested' ? 'not_interested' :
      outcome === 'no_answer' ? 'no_answer' :
      'called';

    void supabaseAdmin
      .from('leads')
      .update({
        call_status: leadStatus,
        last_called_at: new Date().toISOString(),
      })
      .eq('id', session.lead_id);
  }

  return NextResponse.json({ ok: true });
}

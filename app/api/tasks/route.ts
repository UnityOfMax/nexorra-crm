import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/require-account-access';

export const dynamic = 'force-dynamic';

// GET /api/tasks — list all tasks
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { data, error } = await supabaseAdmin
    .from('task_board')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data || [] });
}

// POST /api/tasks — create a task
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { title, description, priority, assigned_agent, assigned_department } = body;

  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('task_board')
    .insert({
      title,
      description: description || null,
      priority: priority || 'normal',
      status: 'todo',
      assigned_agent: assigned_agent || null,
      assigned_department: assigned_department || null,
      created_by: 'user',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}

// PATCH /api/tasks?id=... — update task status/assignment
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates = await request.json();
  const allowed = ['status', 'priority', 'assigned_agent', 'assigned_department', 'title', 'description'];
  const safe: Record<string, any> = {};
  for (const key of allowed) {
    if (key in updates) safe[key] = updates[key];
  }
  if (updates.status === 'done') safe.completed_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('task_board')
    .update(safe)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}

// DELETE /api/tasks?id=...
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabaseAdmin.from('task_board').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

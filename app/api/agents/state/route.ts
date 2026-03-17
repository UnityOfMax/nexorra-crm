import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-account-access';
import fs from 'fs';
import path from 'path';

const CRM_ROOT = process.cwd();

const ALLOWED_AGENTS = ['jeff', 'stacey'] as const;
const STATE_FILES: Record<string, string> = {
  jeff: 'agents/state/jeff-state.json',
  stacey: 'agents/state/stacey-state.json',
};

// GET /api/agents/state?agent=jeff
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const agent = request.nextUrl.searchParams.get('agent');
  if (!agent || !ALLOWED_AGENTS.includes(agent as any)) {
    return NextResponse.json({ error: 'Invalid agent' }, { status: 400 });
  }

  const filePath = path.join(CRM_ROOT, STATE_FILES[agent]);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return NextResponse.json(JSON.parse(content));
  } catch {
    return NextResponse.json({ mode: 'both' });
  }
}

// PATCH /api/agents/state
// Body: { agent: 'jeff' | 'stacey', mode: 'email' | 'instagram' | 'both' }
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { agent, mode } = body;

  if (!agent || !ALLOWED_AGENTS.includes(agent)) {
    return NextResponse.json({ error: 'Invalid agent' }, { status: 400 });
  }
  if (!['email', 'instagram', 'both'].includes(mode)) {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  }

  const filePath = path.join(CRM_ROOT, STATE_FILES[agent]);
  let current: Record<string, unknown> = {};
  try {
    current = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {}

  current.mode = mode;
  fs.writeFileSync(filePath, JSON.stringify(current, null, 2));

  return NextResponse.json({ ok: true, agent, mode });
}

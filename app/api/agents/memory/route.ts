import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-account-access';
import { readFileSync } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// GET /api/agents/memory?file=agents/memory/lead-gen.md
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const file = request.nextUrl.searchParams.get('file');
  if (!file) {
    return NextResponse.json({ error: 'file parameter required' }, { status: 400 });
  }

  // Security: only allow reading from agents/ directory, no path traversal
  const normalized = path.normalize(file);
  if (!normalized.startsWith('agents/') || normalized.includes('..')) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
  }

  try {
    const filePath = path.join(process.cwd(), normalized);
    const content = readFileSync(filePath, 'utf-8');
    return NextResponse.json({ content, file: normalized });
  } catch {
    return NextResponse.json({ content: '', file: normalized, error: 'File not found' });
  }
}

import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { writeLeadNote, VAULT_ROOT, ensureVault } from './client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SYNC_STATE_PATH = path.join(VAULT_ROOT, '.sync-state.json');

interface SyncState {
  last_sync: string | null;
}

async function readSyncState(): Promise<SyncState> {
  try {
    const raw = await fs.readFile(SYNC_STATE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { last_sync: null };
  }
}

async function writeSyncState(state: SyncState): Promise<void> {
  await ensureVault();
  await fs.writeFile(SYNC_STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

/** Check if a lead note already exists in the vault */
async function leadNoteExists(lead: any): Promise<boolean> {
  const firstName = (lead.first_name || 'Unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const lastName = (lead.last_name || 'Unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const filename = `${firstName}-${lastName}.md`;
  const filepath = path.join(VAULT_ROOT, 'Leads', filename);

  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sync leads from Supabase to the Obsidian vault.
 * Only syncs leads with research_status = 'completed' or modified since last sync.
 */
export async function syncLeads(): Promise<{ created: number; updated: number }> {
  await ensureVault();
  const syncState = await readSyncState();

  let query = supabaseAdmin
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (syncState.last_sync) {
    query = query.gt('created_at', syncState.last_sync);
  }
  // Limit to 200 per sync to avoid overwhelming the vault
  query = query.limit(200);

  const { data: leads, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch leads: ${error.message}`);
  }

  if (!leads || leads.length === 0) {
    console.log('No leads to sync.');
    await writeSyncState({ last_sync: new Date().toISOString() });
    return { created: 0, updated: 0 };
  }

  let created = 0;
  let updated = 0;

  for (const lead of leads) {
    const exists = await leadNoteExists(lead);
    await writeLeadNote(lead);

    if (exists) {
      updated++;
    } else {
      created++;
    }
  }

  await writeSyncState({ last_sync: new Date().toISOString() });

  console.log(`Sync complete: ${created} created, ${updated} updated (${leads.length} total processed)`);
  return { created, updated };
}

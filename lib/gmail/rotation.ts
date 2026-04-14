/**
 * Gmail round-robin rotation across 5 accounts with ramp schedule.
 *
 * Ramp: Day 1 = 5/account, +1/day, cap at 30/account (Day 26+).
 * Total: 5 accounts × 30 = 150/day at steady state.
 */

import type { GmailAccount } from './client';

// Minimal DB interface — avoids SupabaseClient generic variance issues
interface DbClient {
  from(table: string): {
    select(cols: string, opts?: { count?: string; head?: boolean }): any;
  };
}

// ── Ramp schedule ──────────────────────────────────────────────────────────

const BASE_LIMIT = 5;   // sends per account on day 1
const MAX_LIMIT = 30;   // cap per account (reached day 26)

/** Sends allowed per account for the given day number (1-based). */
export function getDailyLimitPerAccount(dayNumber: number): number {
  const limit = BASE_LIMIT + (dayNumber - 1);
  return Math.min(limit, MAX_LIMIT);
}

/** Total daily sends across all accounts. */
export function getTotalDailyLimit(dayNumber: number, numAccounts: number): number {
  return getDailyLimitPerAccount(dayNumber) * numAccounts;
}

// ── Account picker ─────────────────────────────────────────────────────────

/**
 * Pick the next account to send from (round-robin).
 * Skips accounts that have already hit their per-account cap today.
 * Returns null if all accounts are at cap.
 */
export async function pickAccount(
  db: DbClient,
  accounts: GmailAccount[],
  dayNumber: number,
): Promise<GmailAccount | null> {
  const perAccountCap = getDailyLimitPerAccount(dayNumber);
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Count today's sends per account
  const counts: Record<string, number> = {};
  for (const acct of accounts) {
    const result = await (db.from('local_biz_leads') as any)
      .select('id', { count: 'exact', head: true })
      .eq('email_sent', true)
      .eq('gmail_account', acct.email)
      .gte('email_sent_at', `${today}T00:00:00Z`);
    counts[acct.email] = result.count ?? 0;
  }

  // Pick account with fewest sends today that is under cap
  let best: GmailAccount | null = null;
  let bestCount = Infinity;

  for (const acct of accounts) {
    const sent = counts[acct.email] ?? 0;
    if (sent < perAccountCap && sent < bestCount) {
      best = acct;
      bestCount = sent;
    }
  }

  return best;
}

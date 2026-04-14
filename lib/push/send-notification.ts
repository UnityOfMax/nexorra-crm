import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabase';

// Configure VAPID once — these are read from environment variables.
// Generate with: npx web-push generate-vapid-keys
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@example.com';
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
}

export interface PushPayload {
  title: string;
  body: string;
  tag: string;
  url: string;
}

/**
 * Sends a push notification to all active browser subscriptions for a user.
 * Stale subscriptions (410/404 from the push service) are automatically removed.
 *
 * This is fire-and-forget — call with `.catch(console.error)` if you don't
 * want to await it in a hot path.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('[push] VAPID keys not configured — skipping push notification');
    return;
  }

  // Fetch all subscriptions for this user
  const { data: subs, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (error) {
    console.error('[push] Failed to fetch subscriptions:', error.message);
    return;
  }

  if (!subs || subs.length === 0) return;

  const notification = JSON.stringify(payload);
  const staleIds: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          notification
        );
      } catch (err: any) {
        // 410 Gone or 404 Not Found = subscription is no longer valid
        if (err.statusCode === 410 || err.statusCode === 404) {
          staleIds.push(sub.id);
        } else {
          console.error('[push] Send failed for', sub.endpoint, err.message);
        }
      }
    })
  );

  // Clean up expired subscriptions
  if (staleIds.length > 0) {
    await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .in('id', staleIds);
  }
}

/**
 * Sends a push notification to the primary owner/admin of an account.
 * Falls back through: account owner → any admin → any member.
 */
export async function sendPushToAccountOwner(
  accountId: string,
  payload: PushPayload
): Promise<void> {
  // Find the account's primary user — oldest owner first
  const { data: members } = await supabaseAdmin
    .from('account_members')
    .select('user_id, role')
    .eq('account_id', accountId)
    .order('created_at', { ascending: true });

  if (!members || members.length === 0) return;

  // Prefer owner, then any member
  const owner = members.find((m) => m.role === 'owner') ?? members[0];
  await sendPushToUser(owner.user_id, payload);
}

export type NotificationType = 'new_leads' | 'new_texts' | 'new_emails' | 'new_bookings' | 'reports';

/**
 * Sends a push notification only if the user has the notification type enabled.
 * Defaults to enabled if no preferences are set.
 */
export async function sendPushToUserIfEnabled(
  userId: string,
  accountId: string,
  notificationType: NotificationType,
  payload: PushPayload
): Promise<void> {
  const { data: member } = await supabaseAdmin
    .from('account_members')
    .select('notification_preferences')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .maybeSingle();

  const prefs = member?.notification_preferences as Record<string, boolean> | null;
  if (prefs && prefs[notificationType] === false) return;

  await sendPushToUser(userId, payload);
}

/**
 * Sends a push notification to the account owner, respecting their notification preferences.
 */
export async function sendPushToAccountOwnerIfEnabled(
  accountId: string,
  notificationType: NotificationType,
  payload: PushPayload
): Promise<void> {
  const { data: members } = await supabaseAdmin
    .from('account_members')
    .select('user_id, role')
    .eq('account_id', accountId)
    .order('created_at', { ascending: true });

  if (!members || members.length === 0) return;

  const owner = members.find((m) => m.role === 'owner') ?? members[0];
  await sendPushToUserIfEnabled(owner.user_id, accountId, notificationType, payload);
}

'use client';

import { useEffect } from 'react';

// Convert a base64url VAPID public key to a Uint8Array for the Push API
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return new Uint8Array(Array.from(raw).map((c) => c.charCodeAt(0)));
}

interface PushNotificationSetupProps {
  accountId: string;
}

export default function PushNotificationSetup({ accountId }: PushNotificationSetupProps) {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      return;
    }

    const setup = async () => {
      try {
        // 1. Register the service worker
        const registration = await navigator.serviceWorker.register('/sw.js');

        // 2. Check if we already have a push subscription
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
          // Already subscribed — ensure server has it
          await saveSubscription(existingSubscription, accountId);
          return;
        }

        // 3. Request notification permission (don't prompt if already decided)
        if (Notification.permission === 'denied') return;

        const permission =
          Notification.permission === 'granted'
            ? 'granted'
            : await Notification.requestPermission();

        if (permission !== 'granted') return;

        // 4. Subscribe to push
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          console.warn('[PWA] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set — skipping push subscription');
          return;
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
        });

        // 5. Send subscription to server
        await saveSubscription(subscription, accountId);
      } catch (err) {
        console.error('[PWA] Push notification setup failed:', err);
      }
    };

    setup();
  }, [accountId]);

  // This component renders nothing — it's purely a side-effect hook
  return null;
}

async function saveSubscription(subscription: PushSubscription, accountId: string) {
  try {
    const json = subscription.toJSON();
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId,
        endpoint: json.endpoint,
        keys: json.keys,
      }),
    });
  } catch (err) {
    console.error('[PWA] Failed to save push subscription:', err);
  }
}

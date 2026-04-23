'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
import { User } from '@supabase/supabase-js';
import AuthForm from '@/components/AuthForm';
import Shell from '@/components/Shell';

function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    // Supabase stores the session in localStorage — read it synchronously so the
    // page renders immediately without waiting for a network round-trip.
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || '';
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          return parsed?.user ?? null;
        }
      }
    }
  } catch { /* ignore */ }
  return null;
}

function HomeContent() {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [loading, setLoading] = useState(!getStoredUser());
  const searchParams = useSearchParams();
  const initialView = searchParams.get('view') || undefined;
  const initialAccountId = searchParams.get('account') || undefined;

  useEffect(() => {
    // Refresh session in the background — updates state if token changed or expired
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <main className="min-h-[100dvh]">
      {!user ? <AuthForm /> : <Shell user={user} initialView={initialView} initialAccountId={initialAccountId} />}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}

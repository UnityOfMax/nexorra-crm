'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { User } from '@supabase/supabase-js';
import AuthForm from '@/components/AuthForm';
import Dashboard from '@/components/Dashboard';

interface SubAccountPageProps {
  slug: string;
  initialView?: string;
}

export default function SubAccountPage({ slug, initialView }: SubAccountPageProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      {!user
        ? <AuthForm />
        : <Dashboard user={user} initialAccountSlug={slug} initialView={initialView} />
      }
    </main>
  );
}

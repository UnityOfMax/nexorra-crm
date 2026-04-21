'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-browser';
import type { Contact } from '@/types';
import type { SubAccount } from '../Sidebar';
import dynamic from 'next/dynamic';
const Conversations = dynamic(() => import('../Conversations'), { ssr: false });

interface InboxViewProps {
  sub: SubAccount;
  accountId: string;
  userId: string;
}

export default function InboxView({ sub, accountId, userId }: InboxViewProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    supabase
      .from('contacts')
      .select('*')
      .eq('account_id', accountId)
      .limit(100)
      .then(({ data }) => setContacts(data || []));
  }, [accountId]);

  return <Conversations accountId={accountId} contacts={contacts} />;
}

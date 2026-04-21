'use client';
import React, { useState, useEffect } from 'react';
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
    fetch(`/api/contacts?accountId=${accountId}&limit=100`)
      .then(r => r.ok ? r.json() : { contacts: [] })
      .then(d => setContacts(d.contacts || []));
  }, [accountId]);

  return <Conversations accountId={accountId} contacts={contacts} />;
}

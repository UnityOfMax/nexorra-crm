'use client';
import React, { useState, useEffect } from 'react';
import type { Contact } from '@/types';
import type { SubAccount } from '../Sidebar';

// Dynamic import to avoid SSR issues
import dynamic from 'next/dynamic';
const ContactsList = dynamic(() => import('../ContactsList'), { ssr: false });

interface ContactsViewProps {
  sub: SubAccount;
  accountId: string;
  userId: string;
}

export default function ContactsView({ sub, accountId, userId }: ContactsViewProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const loadContacts = async () => {
    try {
      const res = await fetch(`/api/contacts?accountId=${accountId}&limit=200`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadContacts(); }, [accountId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, color: 'var(--ink-3)' }}>
        Loading contacts...
      </div>
    );
  }

  return (
    <ContactsList
      contacts={contacts}
      accountId={accountId}
      accountName={sub.name}
      onRefresh={loadContacts}
    />
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { Contact } from '@/types';
function IcoSend({ size = 15 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
}
function IcoMsgSq({ size = 24, style }: { size?: number; style?: React.CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}
function IcoPhone({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
}
function IcoMail({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
}
function IcoLoader({ size = 24 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>;
}
function IcoSearch({ style }: { style?: React.CSSProperties }) {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}
function IcoX() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function IcoBot({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><circle cx="8" cy="16" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="16" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="16" r="1" fill="currentColor" stroke="none"/></svg>;
}
function IcoSparkles() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.88 5.76L20 10l-6.12 1.24L12 17l-1.88-5.76L4 10l6.12-1.24L12 3z"/></svg>;
}
function IcoChevDown() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
}
function IcoChevRight() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
}
function IcoClock() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ConversationsProps {
  accountId: string;
  contacts: Contact[];
  selectedContactId?: string;
}

interface Message {
  id: string;
  contact_id: string;
  direction: 'inbound' | 'outbound';
  type: 'sms' | 'email' | 'call';
  content: string;
  from_address: string;
  to_address: string;
  status: string;
  is_ai_generated?: boolean;
  ai_metadata?: Record<string, any>;
  metadata?: {
    subject?: string;
    intent?: string;
  };
  created_at: string;
}

const INTENT_COLORS: Record<string, { bg: string; color: string; dot: string }> = {
  booking_signal: { bg: 'oklch(91% 0.04 160 / 0.35)', color: 'var(--green)',  dot: 'var(--green)' },
  interested:     { bg: 'oklch(91% 0.04 258 / 0.35)', color: 'var(--blue)',   dot: 'var(--blue)' },
  objection:      { bg: 'oklch(91% 0.04 75 / 0.35)',  color: 'var(--amber)',  dot: 'var(--amber)' },
  qualifying:     { bg: 'oklch(86% 0 0 / 0.15)',       color: 'var(--ink-3)', dot: 'var(--ink-3)' },
  stop_request:   { bg: 'oklch(91% 0.04 10 / 0.35)',  color: 'var(--rose)',   dot: 'var(--rose)' },
};
const INTENT_LABELS: Record<string, string> = {
  booking_signal: 'Booking signal', interested: 'Interested',
  objection: 'Objection', qualifying: 'Qualifying', stop_request: 'Stop',
};

function IntentBadge({ intent }: { intent: string }) {
  const c = INTENT_COLORS[intent];
  if (!c) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px',
      borderRadius: 999, fontSize: 11, fontWeight: 500, background: c.bg, color: c.color,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {INTENT_LABELS[intent] || intent}
    </span>
  );
}

interface FollowUpEntry {
  id: string;
  channel: 'sms' | 'email';
  follow_up_count: number;
  next_follow_up_at: string;
  contacts: { first_name: string | null; last_name: string | null; phone: string | null } | null;
}

function relativeTime(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  const hours = Math.round(diff / (60 * 60 * 1000));
  if (hours < 1) return 'soon';
  if (hours === 1) return 'in 1 hour';
  if (hours < 24) return `in ${hours} hours`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days > 1 ? 's' : ''}`;
}

interface AiConfig {
  enabled: boolean;
  mode: 'suggest' | 'auto';
  channels: { sms: boolean; email: boolean };
}

type MessageType = 'sms' | 'email';
type ChannelFilter = 'all' | 'sms' | 'email';

const AVATAR_COLORS = ['var(--blue)', 'var(--violet)', 'var(--green)', 'var(--amber)', 'var(--rose)'];

function ContactAvatar({ name, idx, size = 38 }: { name: string; idx: number; size?: number }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map(s => s[0]).join('').toUpperCase() || '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--grad)', color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 600, fontSize: Math.round(size * 0.36), fontFamily: 'Geist Mono, monospace',
      flexShrink: 0,
    }}>{initials}</div>
  );
}

export default function Conversations({ accountId, contacts, selectedContactId }: ConversationsProps) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('sms');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);

  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [contactAiEnabled, setContactAiEnabled] = useState(true);

  const [followUpQueue, setFollowUpQueue] = useState<FollowUpEntry[]>([]);
  const [queueExpanded, setQueueExpanded] = useState(true);

  useEffect(() => {
    fetch(`/api/ai/config?accountId=${accountId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setAiConfig(d.config))
      .catch(() => {});
  }, [accountId]);

  useEffect(() => {
    const loadQueue = async () => {
      try {
        const res = await fetch(`/api/ai/follow-up-queue?accountId=${accountId}`);
        if (res.ok) {
          const data = await res.json();
          setFollowUpQueue(data.queue ?? []);
        }
      } catch {}
    };
    loadQueue();
    const interval = setInterval(loadQueue, 60000);
    return () => clearInterval(interval);
  }, [accountId]);

  const cancelFollowUp = async (id: string) => {
    setFollowUpQueue(prev => prev.filter(e => e.id !== id));
    await fetch(`/api/ai/follow-up-queue/cancel?accountId=${accountId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  useEffect(() => {
    if (selectedContact) {
      const draftKey = `draft_${selectedContact.id}`;
      const subjectKey = `subject_${selectedContact.id}`;
      const savedDraft = localStorage.getItem(draftKey);
      const savedSubject = localStorage.getItem(subjectKey);
      if (savedDraft) setNewMessage(savedDraft);
      if (savedSubject) setEmailSubject(savedSubject);
      setContactAiEnabled(selectedContact.ai_enabled !== false);
    } else {
      setNewMessage('');
      setEmailSubject('');
    }
  }, [selectedContact]);

  useEffect(() => {
    if (selectedContact && newMessage) {
      localStorage.setItem(`draft_${selectedContact.id}`, newMessage);
    }
  }, [newMessage, selectedContact]);

  useEffect(() => {
    if (selectedContact && emailSubject) {
      localStorage.setItem(`subject_${selectedContact.id}`, emailSubject);
    }
  }, [emailSubject, selectedContact]);

  useEffect(() => {
    if (selectedContactId) {
      const contact = contacts.find(c => c.id === selectedContactId);
      if (contact) setSelectedContact(contact);
    }
  }, [selectedContactId, contacts]);

  const lastKnownMsgId = useRef<string | null>(null);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (selectedContact) {
      initialLoadDone.current = false;
      lastKnownMsgId.current = null;
      loadMessages();

      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/messages?accountId=${accountId}&contactId=${selectedContact.id}`);
          if (!res.ok) return;
          const data = await res.json();
          const fetched: Message[] = data.messages || [];

          setMessages(prev => {
            if (fetched.length === prev.length && fetched[fetched.length - 1]?.id === prev[prev.length - 1]?.id) return prev;
            return fetched;
          });

          if (initialLoadDone.current && fetched.length > 0) {
            const last = fetched[fetched.length - 1];
            if (last.id !== lastKnownMsgId.current && last.direction === 'inbound') {
              if (aiConfig?.enabled && contactAiEnabled) {
                const ch: MessageType = last.type === 'email' ? 'email' : 'sms';
                if (aiConfig.channels[ch]) {
                  if (aiConfig.mode === 'auto') handleAiAutoRespond(ch);
                  else handleAiSuggest(ch);
                }
              }
            }
            lastKnownMsgId.current = last.id;
          }
        } catch {}
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [selectedContact, aiConfig, contactAiEnabled, accountId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    if (!selectedContact) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/messages?accountId=${accountId}&contactId=${selectedContact.id}`);
      if (res.ok) {
        const data = await res.json();
        const msgs: Message[] = data.messages || [];
        setMessages(msgs);
        if (msgs.length > 0) lastKnownMsgId.current = msgs[msgs.length - 1].id;
        initialLoadDone.current = true;
      }
    } catch {}
    setLoading(false);
  };

  const handleAiSuggest = async (channel: MessageType) => {
    if (!selectedContact || aiGenerating) return;
    setAiGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, contactId: selectedContact.id, channel }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewMessage(data.response);
        if (data.subject && channel === 'email') {
          setEmailSubject(data.subject);
          setMessageType('email');
          setShowEmailComposer(true);
        }
      }
    } catch {}
    setAiGenerating(false);
  };

  const handleAiAutoRespond = async (channel: MessageType) => {
    if (!selectedContact) return;
    try {
      await fetch('/api/ai/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, contactId: selectedContact.id, channel }),
      });
    } catch {}
  };

  const handleGenerateAiResponse = () => {
    handleAiSuggest(messageType === 'email' ? 'email' : 'sms');
  };

  const toggleContactAi = async () => {
    if (!selectedContact) return;
    const newValue = !contactAiEnabled;
    setContactAiEnabled(newValue);
    await fetch(`/api/contacts/${selectedContact.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ai_enabled: newValue }),
    });
  };

  const handleSendSMS = async () => {
    if (!selectedContact?.phone || !newMessage.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, to: selectedContact.phone, message: newMessage.trim(), contactId: selectedContact.id }),
      });
      if (res.ok) {
        if (selectedContact) localStorage.removeItem(`draft_${selectedContact.id}`);
        setNewMessage('');
        loadMessages();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to send message');
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
    setSending(false);
  };

  const handleSendEmail = async () => {
    if (!selectedContact?.email || !newMessage.trim() || !emailSubject.trim()) {
      toast.error('Please enter both subject and message');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId, to: selectedContact.email, subject: emailSubject.trim(),
          textContent: newMessage.trim(),
          htmlContent: `<p>${newMessage.trim().replace(/\n/g, '<br>')}</p>`,
          contactId: selectedContact.id,
        }),
      });
      if (res.ok) {
        if (selectedContact) {
          localStorage.removeItem(`draft_${selectedContact.id}`);
          localStorage.removeItem(`subject_${selectedContact.id}`);
        }
        setNewMessage('');
        setEmailSubject('');
        setShowEmailComposer(false);
        loadMessages();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to send email');
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
    setSending(false);
  };

  const handleSend = () => {
    if (messageType === 'email') handleSendEmail();
    else handleSendSMS();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && messageType === 'sms') {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredContacts = contacts.filter(c => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || [c.first_name, c.last_name, c.email, c.phone].some(f => f?.toLowerCase().includes(q));
    const matchChannel = channelFilter === 'all' ? true : channelFilter === 'sms' ? !!c.phone : !!c.email;
    return matchSearch && matchChannel;
  });

  const isAiActive = aiConfig?.enabled && contactAiEnabled;
  const contactName = selectedContact ? `${selectedContact.first_name || ''} ${selectedContact.last_name || ''}`.trim() : '';
  const contactInitials = contactName.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase() || '?';

  return (
    <div style={{ height: 'calc(100vh - 57px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
          Conversations
        </h1>
      </div>

      {/* Body */}
      <div
        style={{ flex: 1, display: 'grid', gridTemplateColumns: '320px 1fr', overflow: 'hidden', minHeight: 0 }}
        className="nx-inbox-grid"
        data-mobile-view={mobileView}
      >
        {/* Left: conversation list */}
        <div
          style={{ borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', minHeight: 0 }}
          className="nx-inbox-list"
        >
          {/* Channel filter pills */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 4 }}>
            {(['all', 'sms', 'email'] as ChannelFilter[]).map(f => (
              <button key={f} onClick={() => setChannelFilter(f)} style={{
                padding: '5px 10px', fontSize: 12, borderRadius: 999, cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap',
                background: channelFilter === f ? 'var(--grad)' : 'var(--paper-2)',
                color: channelFilter === f ? 'white' : 'var(--ink-2)',
                border: channelFilter === f ? 'none' : '1px solid var(--line)',
                textTransform: 'capitalize',
              }}>{f === 'all' ? 'All' : f.toUpperCase()}</button>
            ))}
            <div style={{ position: 'relative', flex: 1 }}>
              <IcoSearch style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', pointerEvents: 'none' }} />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search..."
                style={{
                  width: '100%', padding: '5px 8px 5px 24px', fontSize: 12,
                  border: '1px solid var(--line)', background: 'var(--paper-2)',
                  borderRadius: 999, outline: 'none', color: 'var(--ink)', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Contact list */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {filteredContacts.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                No contacts found
              </div>
            ) : filteredContacts.map((c, idx) => {
              const name = `${c.first_name || ''} ${c.last_name || ''}`.trim();
              const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase() || '?';
              const active = selectedContact?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => { setSelectedContact(c); setMobileView('chat'); }}
                  style={{
                    padding: '11px 14px', display: 'flex', gap: 10, cursor: 'pointer',
                    background: active ? 'var(--paper-3)' : 'transparent',
                    borderLeft: active ? '2px solid var(--blue)' : '2px solid transparent',
                    borderBottom: '1px solid var(--line)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--paper-2)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: 'var(--grad)', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 600, fontSize: 13, fontFamily: 'Geist Mono, monospace',
                    }}>{initials}</div>
                    <div style={{
                      position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: '50%',
                      background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: c.phone ? 'var(--green)' : 'var(--blue)',
                      border: '1px solid var(--line)',
                    }}>
                      {c.phone ? <IcoPhone size={9} /> : <IcoMail size={9} />}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink)' }}>
                        {name || 'Unknown'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.phone || c.email || 'No contact info'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Follow-up queue */}
          {followUpQueue.length > 0 && (
            <div style={{ flexShrink: 0, borderTop: '1px solid var(--line)', background: 'var(--paper-2)' }}>
              <button
                onClick={() => setQueueExpanded(v => !v)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IcoClock />
                  <span style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>Scheduled</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 16, height: 16, borderRadius: '50%', background: 'var(--violet)', color: 'white', fontSize: 10, fontWeight: 700,
                  }}>{followUpQueue.length}</span>
                </div>
                {queueExpanded ? <IcoChevDown /> : <IcoChevRight />}
              </button>
              {queueExpanded && (
                <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                  {followUpQueue.map(entry => {
                    const n = [entry.contacts?.first_name, entry.contacts?.last_name].filter(Boolean).join(' ') || 'Unknown';
                    return (
                      <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderTop: '1px solid var(--line)' }} className="group">
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', background: 'var(--violet)', color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0,
                        }}>{n[0]}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                            Follow-up {entry.follow_up_count + 1} · {relativeTime(entry.next_follow_up_at)}
                          </div>
                        </div>
                        <button
                          onClick={() => cancelFollowUp(entry.id)}
                          style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', flexShrink: 0 }}
                          title="Cancel"
                        ><IcoX /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: chat view */}
        {!selectedContact ? (
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper-2)' }}
            className="nx-inbox-chat"
          >
            <div style={{ textAlign: 'center' }}>
              <IcoMsgSq size={48} style={{ color: 'var(--ink-4, #ccc)', marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>Select a conversation</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Choose a contact to view messages</div>
            </div>
          </div>
        ) : (
          <div
            style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--paper)', flex: 1 }}
            className="nx-inbox-chat"
          >
            {/* Chat header */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              {/* Mobile back */}
              <button
                onClick={() => { setSelectedContact(null); setMobileView('list'); }}
                className="nx-inbox-back"
                style={{
                  width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line)',
                  background: 'var(--paper-2)', color: 'var(--ink-2)', display: 'none',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <div style={{
                width: 34, height: 34, borderRadius: '50%', background: 'var(--grad)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontFamily: 'Geist Mono, monospace', fontSize: 12,
                flexShrink: 0,
              }}>{contactInitials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)' }}>{contactName || 'Unknown'}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: 'Geist Mono, monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {messageType === 'email' ? <IcoMail size={10} /> : <IcoPhone size={10} />} {messageType}
                  </span>
                  <span>·</span>
                  <span>{selectedContact.phone || selectedContact.email || 'No contact info'}</span>
                </div>
              </div>
              {/* AI toggle */}
              {aiConfig?.enabled && (
                <button
                  onClick={toggleContactAi}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line)',
                    background: isAiActive ? 'oklch(91% 0.04 285 / 0.3)' : 'var(--paper-2)',
                    color: isAiActive ? 'var(--violet)' : 'var(--ink-3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}
                  title={isAiActive ? `AI Active (${aiConfig.mode})` : 'AI Disabled'}
                >
                  <IcoBot size={14} />
                </button>
              )}
              {/* Channel toggle */}
              {selectedContact.phone && (
                <button
                  onClick={() => { setMessageType('sms'); setShowEmailComposer(false); }}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line)',
                    background: messageType === 'sms' ? 'oklch(91% 0.04 160 / 0.3)' : 'var(--paper-2)',
                    color: messageType === 'sms' ? 'var(--green)' : 'var(--ink-3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}
                  title="SMS"
                ><IcoPhone size={14} /></button>
              )}
              {selectedContact.email && (
                <button
                  onClick={() => { setMessageType('email'); setShowEmailComposer(true); }}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line)',
                    background: messageType === 'email' ? 'oklch(91% 0.04 258 / 0.3)' : 'var(--paper-2)',
                    color: messageType === 'email' ? 'var(--blue)' : 'var(--ink-3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}
                  title="Email"
                ><IcoMail size={14} /></button>
              )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
              <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '4px 0 8px' }}>
                Messages
              </div>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                  <IcoLoader size={24} />
                </div>
              ) : messages.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, flexDirection: 'column', gap: 8 }}>
                  <IcoMsgSq size={32} style={{ color: 'var(--ink-4, #ccc)' }} />
                  <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>No messages yet</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Send your first message below</div>
                </div>
              ) : messages.map(msg => {
                const me = msg.direction === 'outbound';
                const isEmail = msg.type === 'email';
                const expanded = expandedMessageId === msg.id;
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: me ? 'row-reverse' : 'row', gap: 8, maxWidth: '100%' }}>
                    <div style={{ maxWidth: isEmail ? '85%' : '72%', display: 'flex', flexDirection: 'column', alignItems: me ? 'flex-end' : 'flex-start' }}>
                      {isEmail ? (
                        <div
                          onClick={() => setExpandedMessageId(expanded ? null : msg.id)}
                          style={{
                            background: me ? 'var(--grad)' : 'var(--paper-2)',
                            color: me ? 'white' : 'var(--ink)',
                            border: me ? 'none' : '1px solid var(--line)',
                            borderRadius: me ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                            overflow: 'hidden', minWidth: 200, cursor: 'pointer',
                          }}
                        >
                          <div style={{
                            padding: '9px 14px 8px',
                            borderBottom: me ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--line)',
                            display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
                            opacity: 0.9, fontFamily: 'Geist Mono, monospace', letterSpacing: '0.04em', textTransform: 'uppercase',
                          }}>
                            <IcoMail size={11} /> Email
                            {msg.is_ai_generated && (
                              <span style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <IcoBot size={10} /> AI
                              </span>
                            )}
                          </div>
                          {msg.metadata?.subject && (
                            <div style={{ padding: '10px 14px 4px', fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.005em' }}>
                              {msg.metadata.subject}
                            </div>
                          )}
                          <div style={{ padding: msg.metadata?.subject ? '4px 14px 12px' : '12px 14px', fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                            {expanded ? msg.content : msg.content.substring(0, 150) + (msg.content.length > 150 ? '…' : '')}
                          </div>
                          {msg.direction === 'inbound' && msg.metadata?.intent && msg.metadata.intent !== 'neutral' && (
                            <div style={{ padding: '0 14px 10px' }}>
                              <IntentBadge intent={msg.metadata.intent} />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{
                          background: me ? 'var(--grad)' : 'var(--paper-2)',
                          color: me ? 'white' : 'var(--ink)',
                          border: me ? 'none' : '1px solid var(--line)',
                          borderRadius: me ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          padding: '8px 13px', fontSize: 13.5, lineHeight: 1.45, wordBreak: 'break-word',
                        }}>
                          {msg.is_ai_generated && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, marginBottom: 4, opacity: 0.8 }}>
                              <IcoBot size={10} /> AI Reply
                            </div>
                          )}
                          {msg.content}
                          {msg.direction === 'inbound' && msg.metadata?.intent && msg.metadata.intent !== 'neutral' && (
                            <div style={{ marginTop: 6 }}>
                              <IntentBadge intent={msg.metadata.intent} />
                            </div>
                          )}
                        </div>
                      )}
                      <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 4, fontFamily: 'Geist Mono, monospace', padding: '0 4px' }}>
                        {me ? 'Sent · ' : ''}{format(new Date(msg.created_at), 'h:mm a')}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div style={{ borderTop: '1px solid var(--line)', padding: '10px 12px', background: 'var(--paper-2)', flexShrink: 0 }}>
              {/* Channel tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                {[
                  { v: 'sms' as MessageType, l: 'SMS', icon: <IcoPhone size={11} />, disabled: !selectedContact.phone },
                  { v: 'email' as MessageType, l: 'Email', icon: <IcoMail size={11} />, disabled: !selectedContact.email },
                ].map(c => (
                  <button key={c.v} onClick={() => { setMessageType(c.v); setShowEmailComposer(c.v === 'email'); }} disabled={c.disabled} style={{
                    padding: '4px 10px', fontSize: 11.5, borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 5, cursor: c.disabled ? 'not-allowed' : 'pointer',
                    background: messageType === c.v ? 'var(--paper)' : 'transparent',
                    color: messageType === c.v ? 'var(--ink)' : 'var(--ink-3)',
                    border: messageType === c.v ? '1px solid var(--line)' : '1px solid transparent',
                    fontWeight: 500, opacity: c.disabled ? 0.4 : 1,
                  }}>{c.icon}{c.l}</button>
                ))}
                {isAiActive && (
                  <button
                    onClick={handleGenerateAiResponse}
                    disabled={aiGenerating}
                    style={{
                      padding: '4px 10px', fontSize: 11.5, borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: 'transparent', border: '1px solid transparent',
                      color: 'var(--violet)', cursor: aiGenerating ? 'not-allowed' : 'pointer', fontWeight: 500, marginLeft: 'auto',
                    }}
                  >
                    {aiGenerating ? <IcoLoader size={11} /> : <IcoSparkles />}
                    AI Draft
                  </button>
                )}
              </div>
              {/* Subject field for email */}
              {messageType === 'email' && (
                <input
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  placeholder="Subject"
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid var(--line)',
                    background: 'var(--paper)', borderRadius: 8, fontSize: 13, outline: 'none',
                    color: 'var(--ink)', marginBottom: 6, boxSizing: 'border-box',
                  }}
                />
              )}
              {/* No contact info warning */}
              {!selectedContact.phone && !selectedContact.email ? (
                <div style={{ padding: '10px 12px', background: 'oklch(91% 0.06 75 / 0.3)', borderRadius: 8, fontSize: 13, color: 'var(--amber)', textAlign: 'center' }}>
                  No phone or email on this contact.
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <textarea
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={messageType === 'email' ? 'Write your email...' : 'Type a message...'}
                    rows={messageType === 'email' ? 3 : 1}
                    style={{
                      flex: 1, padding: '9px 12px', border: '1px solid var(--line)',
                      background: 'var(--paper)', borderRadius: messageType === 'email' ? 10 : 999,
                      fontSize: 13.5, outline: 'none', resize: 'none',
                      fontFamily: 'inherit', lineHeight: 1.5, minHeight: 38,
                      color: 'var(--ink)',
                    }}
                    disabled={(messageType === 'sms' && !selectedContact.phone) || (messageType === 'email' && !selectedContact.email)}
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !newMessage.trim() || (messageType === 'sms' && !selectedContact.phone) || (messageType === 'email' && (!selectedContact.email || !emailSubject.trim()))}
                    style={{
                      width: 38, height: 38, borderRadius: '50%', background: 'var(--grad)', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      border: 'none', cursor: sending ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 8px -2px oklch(58% 0.18 258 / 0.5)',
                      opacity: !newMessage.trim() ? 0.5 : 1,
                    }}
                  >
                    {sending ? <IcoLoader size={15} /> : <IcoSend />}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Contact, Activity, Deal } from '@/types';
import { supabase } from '@/lib/supabase-browser';
import { normalizePhone } from '@/lib/utils/phone';
import { toast } from 'sonner';

// Extend Contact with fields that may exist in DB but not in the type
interface ContactExtended extends Contact {
  last_message_at?: string;
  job_title?: string;
}

interface ContactsListProps {
  contacts: Contact[];
  accountId: string;
  accountName?: string;
  onRefresh: () => void;
  onContactClick?: (contactId: string) => void;
  onSmsClick?: (contact: Contact) => void;
  onEmailClick?: (contact: Contact) => void;
}

// ── Avatar ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['var(--blue)', 'var(--violet)', 'var(--green)', 'var(--amber)', 'var(--rose)'];
const AVATAR_COLORS_NAMED = ['blue', 'violet', 'green', 'amber', 'rose'] as const;

function Avatar({ name, idx, size = 30, color }: { name: string; idx?: number; size?: number; color?: string }) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map(s => s[0]).join('').toUpperCase() || '?';
  const bg = color || (idx !== undefined ? AVATAR_COLORS[idx % 5] : 'var(--blue)');
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 600, fontSize: Math.round(size * 0.38),
      fontFamily: 'Geist Mono, monospace',
      flexShrink: 0,
    }}>{initials}</div>
  );
}

// ── Badge ──────────────────────────────────────────────────────────────────

type BadgeTone = 'blue' | 'violet' | 'amber' | 'green' | 'rose' | 'neutral';

const BADGE_STYLE: Record<BadgeTone, { bg: string; color: string }> = {
  blue:    { bg: 'var(--blue-soft)',   color: 'var(--blue)' },
  violet:  { bg: 'var(--violet-soft)', color: 'var(--violet)' },
  amber:   { bg: 'var(--amber-soft)',  color: 'var(--amber)' },
  green:   { bg: 'var(--green-soft)',  color: 'var(--green)' },
  rose:    { bg: 'var(--rose-soft)',   color: 'var(--rose)' },
  neutral: { bg: 'var(--paper-3)',     color: 'var(--ink-3)' },
};

function tagTone(tag: string): BadgeTone {
  if (tag === 'buyer')   return 'blue';
  if (tag === 'seller')  return 'violet';
  if (tag === 'luxury')  return 'amber';
  return 'neutral';
}

function Badge({ tone, children, style }: { tone: BadgeTone; children: React.ReactNode; style?: React.CSSProperties }) {
  const cfg = BADGE_STYLE[tone];
  return (
    <span style={{
      display: 'inline-block',
      padding: '1px 7px',
      fontSize: 10.5,
      borderRadius: 5,
      background: cfg.bg,
      color: cfg.color,
      fontWeight: 500,
      ...style,
    }}>{children}</span>
  );
}

// ── Lead score bar ──────────────────────────────────────────────────────────

function LeadScoreBar({ score }: { score: number }) {
  const s = Math.min(100, Math.max(0, score));
  const color = s > 70 ? 'var(--green)' : s > 50 ? 'var(--amber)' : 'var(--ink-4)';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 50, height: 5, background: 'var(--line)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${s}%`, height: '100%', background: color }} />
      </div>
      <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12, minWidth: 24, color: 'var(--ink-2)' }}>{s}</span>
    </div>
  );
}

// ── Relative time ───────────────────────────────────────────────────────────

function relativeTime(d?: string | null): string {
  if (!d) return '—';
  const ms = Date.now() - new Date(d).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Inline SVG icons ────────────────────────────────────────────────────────

const Icons = {
  search: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  ),
  chevronRight: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  ),
  download: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  plus: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  x: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  ),
  mail: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  ),
  phone: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  calendar: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
    </svg>
  ),
  note: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/><line x1="9" x2="15" y1="13" y2="13"/><line x1="9" x2="11" y1="17" y2="17"/>
    </svg>
  ),
  bolt: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  callIcon: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  sms: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
};

// ── Contact Detail Drawer ───────────────────────────────────────────────────

interface DrawerProps {
  contact: ContactExtended;
  accountId: string;
  onClose: () => void;
  onSmsClick?: (c: Contact) => void;
  onEmailClick?: (c: Contact) => void;
  idx: number;
}

function ContactDetailDrawer({ contact, accountId, onClose, onSmsClick, onEmailClick, idx }: DrawerProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email || '—';
  const tags = contact.tags || [];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setActivities([]);
    setDeals([]);

    const fetchData = async () => {
      try {
        const [activResult, dealResult] = await Promise.all([
          supabase
            .from('activities')
            .select('*')
            .eq('account_id', accountId)
            .eq('contact_id', contact.id)
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('deals')
            .select('id,title,value,stage,expected_close_date,status')
            .eq('account_id', accountId)
            .eq('contact_id', contact.id)
            .eq('status', 'open'),
        ]);
        if (cancelled) return;
        setActivities((activResult.data as Activity[]) || []);
        setDeals((dealResult.data as Deal[]) || []);
      } catch {
        // silently fail — drawer still shows contact details
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchData();
    return () => { cancelled = true; };
  }, [contact.id, accountId]);

  function activityIcon(type: string) {
    if (type === 'call') return Icons.callIcon;
    if (type === 'email') return Icons.mail;
    if (type === 'meeting') return Icons.calendar;
    if (type === 'sms') return Icons.sms;
    return Icons.bolt;
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.25)',
          zIndex: 49,
        }}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed', right: 0, top: 0,
        height: '100%', width: 'min(520px, 100vw)',
        background: 'var(--paper)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
        zIndex: 50,
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{
              fontSize: 11.5, color: 'var(--ink-3)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              fontFamily: 'Geist Mono, monospace',
            }}>Contact</span>
            <button
              onClick={onClose}
              style={{ padding: 6, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >{Icons.x}</button>
          </div>

          <div style={{ display: 'flex', gap: 14 }}>
            <Avatar name={name} idx={idx} size={56} />
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--ink)' }}>{name}</h2>
              {(contact.job_title || contact.company) && (
                <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 2 }}>
                  {[contact.job_title, contact.company].filter(Boolean).join(' · ')}
                </div>
              )}
              {tags.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  {tags.map(t => (
                    <Badge key={t} tone={tagTone(t)}>{t}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {[
              { label: 'Email', icon: Icons.mail, onClick: () => onEmailClick?.(contact) },
              { label: 'Call', icon: Icons.phone, onClick: undefined },
              { label: 'Meeting', icon: Icons.calendar, onClick: undefined },
              { label: 'Note', icon: Icons.note, onClick: undefined },
            ].map(({ label, icon, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                style={{
                  flex: 1,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  padding: '6px 0', fontSize: 12.5, fontWeight: 500,
                  background: 'var(--paper-2)', border: '1px solid var(--line)',
                  borderRadius: 8, color: 'var(--ink-2)', cursor: onClick ? 'pointer' : 'default',
                }}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--line)' }}>
          <div style={{
            fontSize: 11.5, color: 'var(--ink-3)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            fontWeight: 500, marginBottom: 10,
            fontFamily: 'Geist Mono, monospace',
          }}>Details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['Email', contact.email],
              ['Phone', contact.phone],
              ['Company', contact.company],
              ['Source', contact.funnel_stage || contact.source || 'Direct'],
              ['Lead score', `${contact.lead_score ?? 0} / 100`],
              ['Last activity', relativeTime(contact.last_message_at || contact.updated_at)],
            ].map(([k, v]) => v && (
              <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, gap: 8 }}>
                <span style={{ color: 'var(--ink-3)' }}>{k}</span>
                <span style={{ fontWeight: 500, color: 'var(--ink)', textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Open Deals */}
        {deals.length > 0 && (
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--line)' }}>
            <div style={{
              fontSize: 11.5, color: 'var(--ink-3)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              fontWeight: 500, marginBottom: 10,
              fontFamily: 'Geist Mono, monospace',
            }}>Open Deals</div>
            {deals.map(d => (
              <div key={d.id} style={{
                padding: '10px 0', borderTop: '1px solid var(--line)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{d.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>
                    {d.stage}{d.expected_close_date ? ` · ${d.expected_close_date}` : ''}
                  </div>
                </div>
                <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
                  ${d.value?.toLocaleString() ?? '0'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Timeline */}
        <div style={{ padding: '18px 24px' }}>
          <div style={{
            fontSize: 11.5, color: 'var(--ink-3)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            fontWeight: 500, marginBottom: 12,
            fontFamily: 'Geist Mono, monospace',
          }}>Timeline</div>
          {loading && (
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', paddingBottom: 8 }}>Loading…</div>
          )}
          {!loading && activities.length === 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>No activity yet</div>
          )}
          {activities.slice(0, 10).map((a, i) => (
            <div key={a.id} style={{ display: 'flex', gap: 12, paddingBottom: 14, position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: 'var(--paper-3)', color: 'var(--ink-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 1, flexShrink: 0,
                }}>
                  {activityIcon(a.type)}
                </div>
                {i < activities.length - 1 && (
                  <div style={{ width: 1, flex: 1, background: 'var(--line)', marginTop: 2 }} />
                )}
              </div>
              <div style={{ flex: 1, paddingBottom: 8 }}>
                <div style={{ fontSize: 12.5, color: 'var(--ink)' }}>
                  <strong style={{ fontWeight: 500 }}>{a.type}</strong>
                  {a.subject && <span style={{ color: 'var(--ink-3)' }}> · {a.subject}</span>}
                  {a.description && <span style={{ color: 'var(--ink-3)' }}> · {a.description}</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>
                  {relativeTime(a.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Tag filter tabs ─────────────────────────────────────────────────────────

const TAG_FILTERS = ['all', 'buyer', 'seller', 'luxury', 'referral'] as const;
type TagFilter = typeof TAG_FILTERS[number];

// ── Main component ──────────────────────────────────────────────────────────

export default function ContactsList({
  contacts,
  accountId,
  accountName = 'Account',
  onRefresh,
  onSmsClick,
  onEmailClick,
}: ContactsListProps) {
  const [showModal, setShowModal] = useState(false);
  const [openContact, setOpenContact] = useState<ContactExtended | null>(null);
  const [openContactIdx, setOpenContactIdx] = useState(0);
  const [localContacts, setLocalContacts] = useState<ContactExtended[]>(contacts as ContactExtended[]);
  const [searchQ, setSearchQ] = useState('');
  const [tagFilter, setTagFilter] = useState<TagFilter>('all');
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '', company: '', status: 'lead' as const,
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!openContact) {
      setLocalContacts(contacts as ContactExtended[]);
    }
  }, [contacts, openContact]);

  const filtered = localContacts.filter(c => {
    const q = searchQ.toLowerCase();
    const name = [c.first_name, c.last_name].filter(Boolean).join(' ');
    const matchSearch = !q || [name, c.email, c.company].some(f => f?.toLowerCase().includes(q));
    const matchTag = tagFilter === 'all' || (c.tags || []).includes(tagFilter);
    return matchSearch && matchTag;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          accountId,
          phone: formData.phone ? normalizePhone(formData.phone) : formData.phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create contact');
      setShowModal(false);
      setFormData({ first_name: '', last_name: '', email: '', phone: '', company: '', status: 'lead' });
      onRefresh();
    } catch (err: any) {
      toast.error('Error creating contact: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  function openDrawer(c: ContactExtended, idx: number) {
    setOpenContact(c);
    setOpenContactIdx(idx);
  }

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 1280, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          {/* Breadcrumb */}
          <div style={{
            fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{
              width: 16, height: 16, borderRadius: '50%',
              background: 'var(--grad)', flexShrink: 0,
            }} />
            {accountName}
            {Icons.chevronRight}
            Contacts
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            Contacts
            <span style={{ color: 'var(--ink-3)', fontWeight: 400, marginLeft: 10, fontSize: 18 }}>
              {localContacts.length}
            </span>
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', fontSize: 13, fontWeight: 500,
            background: 'var(--paper)', border: '1px solid var(--line)',
            borderRadius: 8, color: 'var(--ink-2)', cursor: 'pointer',
          }}>
            {Icons.download} Export
          </button>
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', fontSize: 13, fontWeight: 500,
              background: 'var(--grad)', border: 'none',
              borderRadius: 8, color: 'white', cursor: 'pointer',
            }}
          >
            {Icons.plus} New contact
          </button>
        </div>
      </div>

      {/* ── Table card ── */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderBottom: '1px solid var(--line)',
          flexWrap: 'wrap',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 360, minWidth: 160 }}>
            <span style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--ink-3)', pointerEvents: 'none', display: 'flex',
            }}>
              {Icons.search}
            </span>
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search contacts..."
              style={{
                width: '100%', padding: '7px 12px 7px 32px',
                border: '1px solid var(--line)', background: 'var(--paper-2)',
                borderRadius: 8, fontSize: 13, outline: 'none', color: 'var(--ink)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Filter tabs */}
          <div style={{
            display: 'flex', background: 'var(--paper-2)',
            border: '1px solid var(--line)', borderRadius: 8, padding: 2,
          }}>
            {TAG_FILTERS.map(t => (
              <button
                key={t}
                onClick={() => setTagFilter(t)}
                style={{
                  padding: '5px 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
                  background: tagFilter === t ? 'var(--paper)' : 'transparent',
                  color: tagFilter === t ? 'var(--ink)' : 'var(--ink-3)',
                  border: tagFilter === t ? '1px solid var(--line)' : '1px solid transparent',
                  textTransform: 'capitalize',
                }}
              >{t}</button>
            ))}
          </div>

          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-3)' }}>
            {filtered.length} shown
          </span>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 900 }}>
            <thead>
              <tr style={{ background: 'var(--paper-2)', borderBottom: '1px solid var(--line)' }}>
                {(['Name', 'Company', 'Last activity', 'Source', 'Lead score', 'Tags'] as const).map((h, i) => (
                  <th key={h} style={{
                    textAlign: i === 4 ? 'right' : 'left',
                    padding: '11px 16px',
                    fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{
                    padding: '48px 16px', textAlign: 'center',
                    color: 'var(--ink-3)', fontSize: 13,
                  }}>
                    {searchQ || tagFilter !== 'all'
                      ? 'No contacts match your filters'
                      : 'No contacts yet. Add your first contact.'}
                  </td>
                </tr>
              ) : filtered.map((c, i) => {
                const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || '—';
                const tags = c.tags || [];
                return (
                  <tr
                    key={c.id}
                    onClick={() => openDrawer(c, i)}
                    style={{
                      borderBottom: i < filtered.length - 1 ? '1px solid var(--line)' : 'none',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--paper-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Name */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={name} idx={i} size={30} />
                        <div>
                          <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{name}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{c.email || c.phone || ''}</div>
                        </div>
                      </div>
                    </td>

                    {/* Company */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 13, color: 'var(--ink)' }}>{c.company || '—'}</div>
                      {c.job_title && (
                        <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{c.job_title}</div>
                      )}
                    </td>

                    {/* Last activity */}
                    <td style={{ padding: '12px 16px', color: 'var(--ink-2)', fontFamily: 'Geist Mono, monospace', fontSize: 12.5 }}>
                      {relativeTime(c.last_message_at || c.updated_at)}
                    </td>

                    {/* Source */}
                    <td style={{ padding: '12px 16px', color: 'var(--ink-2)' }}>
                      {c.funnel_stage || c.source || 'Direct'}
                    </td>

                    {/* Lead score */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <LeadScoreBar score={c.lead_score ?? 0} />
                    </td>

                    {/* Tags */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {tags.map(t => (
                          <Badge key={t} tone={tagTone(t)} style={{ fontSize: 10.5, padding: '1px 7px' }}>{t}</Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Contact detail drawer ── */}
      {openContact && (
        <ContactDetailDrawer
          contact={openContact}
          accountId={accountId}
          onClose={() => setOpenContact(null)}
          onSmsClick={c => { setOpenContact(null); onSmsClick?.(c); }}
          onEmailClick={c => { setOpenContact(null); onEmailClick?.(c); }}
          idx={openContactIdx}
        />
      )}

      {/* ── New contact modal ── */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 16,
        }}>
          <div style={{
            background: 'var(--paper)', borderRadius: 16,
            width: '100%', maxWidth: 480,
            border: '1px solid var(--line)',
          }}>
            <div style={{
              padding: '20px 24px 16px', borderBottom: '1px solid var(--line)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>New Contact</h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ padding: '4px 8px', color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
              >{Icons.x}</button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {(['first_name', 'last_name'] as const).map(key => (
                  <div key={key}>
                    <label style={{
                      display: 'block', fontSize: 11.5, color: 'var(--ink-3)',
                      textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
                    }}>
                      {key === 'first_name' ? 'First Name' : 'Last Name'}
                    </label>
                    <input
                      type="text"
                      value={formData[key]}
                      onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                      required={key === 'first_name'}
                      style={{
                        width: '100%', padding: '8px 12px',
                        border: '1px solid var(--line)', background: 'var(--paper-2)',
                        borderRadius: 8, fontSize: 13, outline: 'none', color: 'var(--ink)',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ))}
              </div>
              {(['email', 'phone', 'company'] as const).map(key => (
                <div key={key}>
                  <label style={{
                    display: 'block', fontSize: 11.5, color: 'var(--ink-3)',
                    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
                  }}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </label>
                  <input
                    type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'}
                    value={formData[key]}
                    onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                    style={{
                      width: '100%', padding: '8px 12px',
                      border: '1px solid var(--line)', background: 'var(--paper-2)',
                      borderRadius: 8, fontSize: 13, outline: 'none', color: 'var(--ink)',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1, padding: '9px 0', fontSize: 13.5, borderRadius: 8,
                    border: '1px solid var(--line)', background: 'var(--paper)',
                    color: 'var(--ink-2)', cursor: 'pointer', fontWeight: 500,
                  }}
                >Cancel</button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    flex: 1, padding: '9px 0', fontSize: 13.5, borderRadius: 8,
                    border: 'none', background: 'var(--grad)',
                    color: 'white', cursor: creating ? 'not-allowed' : 'pointer',
                    fontWeight: 500, opacity: creating ? 0.7 : 1,
                  }}
                >{creating ? 'Creating…' : 'Create Contact'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

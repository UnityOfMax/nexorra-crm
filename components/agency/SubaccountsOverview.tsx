'use client';

import { useState, useEffect } from 'react';
import { Plus, LayoutGrid, List, ChevronRight, MapPin, Users, TrendingUp, Search } from 'lucide-react';
import type { Account } from '@/types';
import CreateSubAccountModal from './CreateSubAccountModal';

interface SubaccountsOverviewProps {
  agencyAccount: Account;
  userId: string;
  clientAccounts: Account[];
  onEnterClient: (accountId: string) => void;
  onRefreshClients: () => void;
}

interface ClientMetrics {
  accountId: string;
  contactCount: number;
  leadCount: number;
  dealCount: number;
}

// Color palette cycling for avatar backgrounds
const AVATAR_COLORS = [
  'linear-gradient(135deg, oklch(58% 0.18 258) 0%, oklch(60% 0.22 295) 100%)', // blue-violet
  'linear-gradient(135deg, oklch(60% 0.22 295) 0%, oklch(62% 0.18 20) 100%)',   // violet-rose
  'linear-gradient(135deg, oklch(62% 0.14 155) 0%, oklch(58% 0.18 258) 100%)',  // green-blue
  'linear-gradient(135deg, oklch(74% 0.14 75) 0%, oklch(62% 0.18 20) 100%)',    // amber-rose
  'linear-gradient(135deg, oklch(62% 0.18 20) 0%, oklch(74% 0.14 75) 100%)',    // rose-amber
  'linear-gradient(135deg, oklch(58% 0.18 258) 0%, oklch(62% 0.14 155) 100%)',  // blue-green
];

function getAvatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'C';
}

function AccountAvatar({ name, index, size = 40 }: { name: string; index: number; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: getAvatarColor(index),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontSize: size * 0.36, fontWeight: 600,
      letterSpacing: '-0.02em', flexShrink: 0,
    }}>
      {getInitials(name)}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: 'var(--green-soft)', color: 'var(--green)', label: 'Active' },
    onboarding: { bg: 'var(--blue-soft)', color: 'var(--blue)', label: 'Onboarding' },
    paused: { bg: 'var(--amber-soft)', color: 'var(--amber)', label: 'Paused' },
    demo: { bg: 'var(--violet-soft)', color: 'var(--violet)', label: 'Demo' },
  };
  const c = cfg[status] || cfg.active;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 99, fontSize: 11.5, fontWeight: 500,
      background: c.bg, color: c.color,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 99, background: 'currentColor' }} />
      {c.label}
    </span>
  );
}

function ClientCard({
  account,
  index,
  metrics,
  onClick,
}: {
  account: Account;
  index: number;
  metrics?: ClientMetrics;
  onClick: () => void;
}) {
  const isMock = account.id.startsWith('mock-');
  const since = account.created_at
    ? new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(account.created_at))
    : null;

  return (
    <div
      onClick={onClick}
      style={{
        border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden',
        background: 'var(--paper)', cursor: 'pointer', transition: 'border-color 150ms, box-shadow 150ms',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--blue)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <AccountAvatar name={account.name} index={index} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{
                fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink)',
              }}>
                {account.name}
              </div>
              <StatusBadge status={isMock ? 'demo' : 'active'} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
              {since && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ opacity: 0.6 }}>Since</span> {since}</span>}
            </div>
          </div>
          <ChevronRight size={15} style={{ color: 'var(--ink-4)', flexShrink: 0, marginTop: 2 }} />
        </div>
      </div>

      {/* Metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid var(--line)' }}>
        {[
          { label: 'Contacts', value: metrics?.contactCount ?? '—' },
          { label: 'Leads', value: metrics?.leadCount ?? '—' },
          { label: 'Deals', value: metrics?.dealCount ?? '—' },
        ].map((m, i) => (
          <div
            key={m.label}
            style={{
              padding: '12px 14px',
              borderRight: i < 2 ? '1px solid var(--line)' : 'none',
            }}
          >
            <div style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>{m.label}</div>
            <div style={{ fontSize: 16, fontWeight: 500, marginTop: 2, color: 'var(--ink)', fontFamily: 'Geist Mono, monospace' }}>
              {isMock ? '—' : m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          {isMock ? 'Demo workspace' : (account as any).slug ? `/${(account as any).slug}` : 'Client workspace'}
        </span>
        <span style={{
          fontSize: 12, color: 'var(--blue)', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          Open <ChevronRight size={12} />
        </span>
      </div>
    </div>
  );
}

function ClientTableRow({
  account,
  index,
  metrics,
  onClick,
}: {
  account: Account;
  index: number;
  metrics?: ClientMetrics;
  onClick: () => void;
}) {
  const isMock = account.id.startsWith('mock-');
  const since = account.created_at
    ? new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(account.created_at))
    : '—';

  return (
    <tr
      onClick={onClick}
      style={{ borderBottom: '1px solid var(--line)', cursor: 'pointer' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--paper-2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AccountAvatar name={account.name} index={index} size={28} />
          <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 13.5 }}>{account.name}</div>
        </div>
      </td>
      <td style={{ padding: '12px 16px', color: 'var(--ink-3)', fontSize: 13 }}>{since}</td>
      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'Geist Mono, monospace', fontSize: 13 }}>
        {isMock ? '—' : (metrics?.contactCount ?? '—')}
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'Geist Mono, monospace', fontSize: 13 }}>
        {isMock ? '—' : (metrics?.leadCount ?? '—')}
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'Geist Mono, monospace', fontSize: 13 }}>
        {isMock ? '—' : (metrics?.dealCount ?? '—')}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <StatusBadge status={isMock ? 'demo' : 'active'} />
      </td>
      <td style={{ padding: '12px 16px', color: 'var(--ink-3)', textAlign: 'right' }}>
        <ChevronRight size={15} />
      </td>
    </tr>
  );
}

export default function SubaccountsOverview({
  agencyAccount,
  userId,
  clientAccounts,
  onEnterClient,
  onRefreshClients,
}: SubaccountsOverviewProps) {
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [metrics, setMetrics] = useState<Record<string, ClientMetrics>>({});

  // Fetch metrics for real client accounts
  useEffect(() => {
    const realAccounts = clientAccounts.filter(a => !a.id.startsWith('mock-'));
    if (realAccounts.length === 0) return;

    Promise.all(
      realAccounts.map(async acc => {
        try {
          const res = await fetch(`/api/contacts?accountId=${acc.id}`);
          if (!res.ok) return null;
          const { contacts } = await res.json();
          const all: Array<{ status: string }> = contacts || [];
          return {
            accountId: acc.id,
            contactCount: all.length,
            leadCount: all.filter(c => c.status === 'lead').length,
            dealCount: 0,
          } as ClientMetrics;
        } catch {
          return null;
        }
      })
    ).then(results => {
      const map: Record<string, ClientMetrics> = {};
      results.forEach(r => { if (r) map[r.accountId] = r; });
      setMetrics(map);
    });
  }, [clientAccounts]);

  const realClients = clientAccounts.filter(a => !a.id.startsWith('mock-'));
  const mockClients = clientAccounts.filter(a => a.id.startsWith('mock-'));
  const allClients = [...realClients, ...mockClients];

  const filtered = allClients.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalContacts = realClients.reduce((sum, a) => sum + (metrics[a.id]?.contactCount ?? 0), 0);
  const totalLeads = realClients.reduce((sum, a) => sum + (metrics[a.id]?.leadCount ?? 0), 0);

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 1480, margin: '0 auto' }}>
      {/* Hero / portfolio summary */}
      <div style={{
        borderRadius: 16, padding: '26px 28px',
        background: 'var(--grad-soft)',
        border: '1px solid var(--line)', marginBottom: 24, position: 'relative', overflow: 'hidden',
      }}>
        {/* decorative orbs */}
        <div style={{
          position: 'absolute', right: -60, top: -60, width: 260, height: 260, borderRadius: '50%',
          background: 'radial-gradient(circle, oklch(60% 0.22 295 / 0.14), transparent 70%)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', right: 80, bottom: -80, width: 240, height: 240, borderRadius: '50%',
          background: 'radial-gradient(circle, oklch(58% 0.18 258 / 0.12), transparent 70%)', pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, position: 'relative' }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12, background: 'var(--grad)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em',
          }}>
            N
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500, marginBottom: 3, fontFamily: 'Geist Mono, monospace' }}>
              {agencyAccount.name} · Agency Rollup
            </div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
              {realClients.length} client workspace{realClients.length !== 1 ? 's' : ''}
              <span style={{ color: 'var(--ink-3)', fontWeight: 400, marginLeft: 8, fontSize: 20 }}>
                + {mockClients.length} demo
              </span>
            </h1>
          </div>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
          background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden',
        }}>
          {[
            { label: 'Total Clients', value: String(realClients.length) },
            { label: 'Total Contacts', value: String(totalContacts) },
            { label: 'Active Leads', value: String(totalLeads) },
          ].map((k, i) => (
            <div key={i} style={{ background: 'var(--paper)', padding: '14px 20px' }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 500, marginTop: 5, letterSpacing: '-0.01em', fontFamily: 'Geist Mono, monospace', color: 'var(--ink)' }}>{k.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)' }}>Client workspaces</h2>
          <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink-3)' }}>Click any workspace to enter it.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients..."
              style={{
                padding: '7px 10px 7px 30px', fontSize: 12.5,
                border: '1px solid var(--line)', background: 'var(--paper)',
                borderRadius: 8, outline: 'none', color: 'var(--ink)', width: 180,
              }}
            />
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 8, padding: 2 }}>
            {([['cards', LayoutGrid], ['table', List]] as const).map(([v, Icon]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '5px 9px', fontSize: 12.5, borderRadius: 6,
                  background: view === v ? 'var(--paper)' : 'transparent',
                  color: view === v ? 'var(--ink)' : 'var(--ink-3)',
                  border: view === v ? '1px solid var(--line)' : '1px solid transparent',
                  display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                }}
              >
                <Icon size={13} />
                {v === 'cards' ? 'Cards' : 'Table'}
              </button>
            ))}
          </div>

          {/* New client */}
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', fontSize: 13, fontWeight: 500, borderRadius: 8,
              background: 'var(--grad)', color: 'white', border: 'none', cursor: 'pointer',
              boxShadow: '0 1px 3px oklch(58% 0.18 258 / 0.3)',
            }}
          >
            <Plus size={14} />
            New client
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ink-3)' }}>
          <Users size={32} style={{ opacity: 0.4, marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 14 }}>
            {search ? 'No clients match your search.' : 'No client workspaces yet. Add one to get started.'}
          </p>
        </div>
      ) : view === 'cards' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map((acc, i) => (
            <ClientCard
              key={acc.id}
              account={acc}
              index={i}
              metrics={metrics[acc.id]}
              onClick={() => onEnterClient(acc.id)}
            />
          ))}
        </div>
      ) : (
        <div style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', background: 'var(--paper)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: 'var(--paper-2)', borderBottom: '1px solid var(--line)' }}>
                {['Workspace', 'Since', 'Contacts', 'Leads', 'Deals', 'Status', ''].map((h, i) => (
                  <th key={i} style={{
                    textAlign: i >= 2 && i <= 4 ? 'right' : 'left',
                    padding: '10px 16px', fontSize: 11, fontWeight: 500, color: 'var(--ink-3)',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((acc, i) => (
                <ClientTableRow
                  key={acc.id}
                  account={acc}
                  index={i}
                  metrics={metrics[acc.id]}
                  onClick={() => onEnterClient(acc.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create sub-account modal */}
      {showCreate && (
        <CreateSubAccountModal
          agencyId={agencyAccount.id}
          userId={userId}
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            onRefreshClients();
          }}
        />
      )}
    </div>
  );
}

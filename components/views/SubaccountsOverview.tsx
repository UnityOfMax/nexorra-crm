'use client';
import React, { useState, useEffect } from 'react';
import { Card, Avatar, Badge, Button, SectionHead } from '../ui/primitives';
import { Sparkline } from '../ui/charts';
import { Icons } from '../Icons';
import type { SubAccount } from '../Sidebar';

interface SubaccountsOverviewProps {
  sub: SubAccount;
  accountId: string;
  userId: string;
  onOpen: (id: string) => void;
}

interface ClientStats {
  leads30: number;
  spend30: number;
  cpl: number;
  roas: number;
  listings: number;
  revenue: number[];
}

const fmt$ = (n: number, short?: boolean) => {
  if (short) {
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
    return '$' + n;
  }
  return '$' + n.toLocaleString('en-US');
};
const fmtN = (n: number) => n.toLocaleString('en-US');

export default function SubaccountsOverview({ sub, accountId, userId, onOpen }: SubaccountsOverviewProps) {
  const [clients, setClients] = useState<SubAccount[]>([]);
  const [clientStats, setClientStats] = useState<Record<string, ClientStats>>({});
  const [overview, setOverview] = useState({ leads30: 0, spend30: 0, cpl: 0, roas: 0, clientCount: 0 });
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [sort, setSort] = useState('leads');
  const [loading, setLoading] = useState(true);
  const [showNewClient, setShowNewClient] = useState(false);

  async function loadClients() {
    try {
      const res = await fetch(`/api/agency/clients?agencyId=${accountId}&userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        const raw: Record<string, unknown>[] = Array.isArray(data) ? data : (data.clients || []);
        const COLORS = ['blue', 'violet', 'green', 'amber', 'rose'];
        const mapped: SubAccount[] = raw.map((c, i) => {
          const name = (c.name as string) || 'Client';
          const words = name.trim().split(/\s+/);
          const tag = words.length >= 2
            ? (words[0][0] + words[1][0]).toUpperCase()
            : name.slice(0, 2).toUpperCase();
          const settings = (c.settings as Record<string, unknown>) || {};
          const loc = settings.location as Record<string, unknown> | string | undefined;
          const locStr = typeof loc === 'object' && loc
            ? [(loc as Record<string, unknown>).first_name, (loc as Record<string, unknown>).last_name].filter(Boolean).join(' ')
            : (typeof loc === 'string' ? loc : '');
          return {
            id: c.id as string,
            name,
            kind: 'client' as const,
            tag,
            color: COLORS[i % COLORS.length],
            location: locStr,
            leads30: 0,
            status: 'healthy',
          };
        });
        setClients(mapped);
      }
    } catch {}
  }

  useEffect(() => {
    async function load() {
      await loadClients();
      try {
        const ovRes = await fetch(`/api/analytics/overview?accountId=${accountId}`);
        if (ovRes.ok) {
          const ov = await ovRes.json();
          setOverview(ov);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [accountId, userId]);

  const sorted = [...clients].sort((a, b) => {
    const sa = clientStats[a.id] || {} as ClientStats;
    const sb = clientStats[b.id] || {} as ClientStats;
    if (sort === 'leads') return (sb.leads30 || 0) - (sa.leads30 || 0);
    if (sort === 'spend') return (sb.spend30 || 0) - (sa.spend30 || 0);
    if (sort === 'roas') return (sb.roas || 0) - (sa.roas || 0);
    return a.name.localeCompare(b.name);
  });

  const heroStats = [
    { l: 'Leads / 30d', v: fmtN(overview.leads30 || 0), d: '+12.4%', positive: true },
    { l: 'Ad spend / 30d', v: fmt$(overview.spend30 || 0, true), d: '+4.1%', positive: true },
    { l: 'Blended CPL', v: overview.cpl ? `$${overview.cpl.toFixed(2)}` : '—', d: '−6.2%', positive: true },
    { l: 'Portfolio ROAS', v: overview.roas ? `${overview.roas.toFixed(1)}×` : '—', d: '+0.4', positive: true },
  ];

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 1480, margin: '0 auto' }} className="nx-pad-mobile">
      {/* Hero banner */}
      <div style={{
        borderRadius: 16, padding: '28px 28px 24px',
        background: 'var(--grad-soft)', border: '1px solid var(--line)',
        marginBottom: 24, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', right: -60, top: -60, width: 280, height: 280, borderRadius: '50%',
          background: 'radial-gradient(circle, oklch(60% 0.22 295 / 0.12), transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', right: 80, bottom: -100, width: 260, height: 260, borderRadius: '50%',
          background: 'radial-gradient(circle, oklch(58% 0.18 258 / 0.12), transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, position: 'relative' }}>
          <Avatar tag="NX" color="grad" size={48} />
          <div>
            <div style={{
              fontSize: 11.5, color: 'var(--ink-3)', textTransform: 'uppercase',
              letterSpacing: '0.1em', fontWeight: 500, marginBottom: 4, fontFamily: 'Geist Mono, monospace',
            }}>Nexorra HQ · Agency Rollup</div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>
              {clients.length} client workspaces
              <span style={{ color: 'var(--ink-3)', fontWeight: 400, marginLeft: 8 }}>/ {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </h1>
          </div>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--line)',
          border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', marginTop: 20,
        }} className="nx-2col-mobile">
          {heroStats.map((k, i) => (
            <div key={i} style={{ background: 'var(--paper)', padding: '16px 20px' }}>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>{k.l}</div>
              <div className="mono" style={{ fontSize: 22, fontWeight: 500, marginTop: 6, letterSpacing: '-0.01em' }}>{k.v}</div>
              <div style={{ fontSize: 12, color: k.positive ? 'var(--green)' : 'var(--rose)', marginTop: 4 }}>{k.d} vs last 30d</div>
            </div>
          ))}
        </div>
      </div>

      <SectionHead
        title="Client subaccounts"
        subtitle="Click any workspace to enter it."
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 8, padding: 2 }}>
              {(['cards', 'table'] as const).map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: '5px 10px', fontSize: 12.5, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                  background: view === v ? 'var(--paper)' : 'transparent',
                  color: view === v ? 'var(--ink)' : 'var(--ink-3)',
                  border: view === v ? '1px solid var(--line)' : '1px solid transparent',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {v === 'cards' ? <Icons.grid size={13} /> : <Icons.list size={13} />}
                  {v === 'cards' ? 'Cards' : 'Table'}
                </button>
              ))}
            </div>
            <select
              value={sort} onChange={e => setSort(e.target.value)}
              style={{ padding: '7px 10px', fontSize: 12.5, border: '1px solid var(--line)', background: 'var(--paper)', borderRadius: 8, outline: 'none', color: 'var(--ink)', fontFamily: 'inherit' }}
            >
              <option value="leads">Sort: Leads</option>
              <option value="spend">Sort: Spend</option>
              <option value="roas">Sort: ROAS</option>
              <option value="name">Sort: Name</option>
            </select>
            <Button variant="grad" icon={<Icons.plus size={15} />} onClick={() => setShowNewClient(true)}>New client</Button>
          </div>
        }
      />

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 200, borderRadius: 12, background: 'var(--paper-2)', border: '1px solid var(--line)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <Card padding={48} style={{ textAlign: 'center' }}>
          <Icons.building size={36} style={{ color: 'var(--ink-3)', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>No client accounts yet</div>
          <div style={{ color: 'var(--ink-3)', fontSize: 13.5 }}>Add your first client subaccount to get started.</div>
        </Card>
      ) : view === 'cards' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {sorted.map(s => (
            <ClientCard key={s.id} s={s} stats={clientStats[s.id]} onClick={() => onOpen(s.id)} />
          ))}
        </div>
      ) : (
        <ClientTable rows={sorted} stats={clientStats} onClick={onOpen} />
      )}

      {showNewClient && (
        <NewClientModal
          agencyId={accountId}
          userId={userId}
          onClose={() => setShowNewClient(false)}
          onSuccess={() => { setShowNewClient(false); loadClients(); }}
        />
      )}
    </div>
  );
}

function ClientCard({ s, stats, onClick }: { s: SubAccount; stats?: ClientStats; onClick: () => void }) {
  const trend = stats?.revenue || [10, 12, 14, 13, 15, 17];
  const leads30 = stats?.leads30 || s.leads30 || 0;
  const cpl = stats?.cpl || 0;
  const roas = stats?.roas || 0;
  const colorVar = { blue: 'var(--blue)', violet: 'var(--violet)', green: 'var(--green)', amber: 'var(--amber)', rose: 'var(--rose)' }[s.color] || 'var(--blue)';

  return (
    <Card hoverable onClick={onClick} padding={0} style={{ overflow: 'hidden' }}>
      <div style={{ padding: 18, borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <Avatar tag={s.tag} color={s.color} size={42} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.005em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
              {s.status === 'attention' && <Badge tone="amber" dot style={{ padding: '1px 7px', fontSize: 10.5 }}>Attention</Badge>}
              {s.status === 'onboarding' && <Badge tone="blue" dot style={{ padding: '1px 7px', fontSize: 10.5 }}>Onboarding</Badge>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icons.pin size={11} />{s.location}
              </span>
              {stats?.listings && <><span style={{ color: 'var(--line-2)' }}>·</span><span>{stats.listings} listings</span></>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
        <div style={{ padding: '0 18px', borderRight: '1px solid var(--line)' }}>
          <div style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>Leads 30d</div>
          <div className="mono" style={{ fontSize: 16, fontWeight: 500, marginTop: 2 }}>{fmtN(leads30)}</div>
        </div>
        <div style={{ padding: '0 18px', borderRight: '1px solid var(--line)' }}>
          <div style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>CPL</div>
          <div className="mono" style={{ fontSize: 16, fontWeight: 500, marginTop: 2 }}>{cpl ? `$${cpl.toFixed(2)}` : '—'}</div>
        </div>
        <div style={{ padding: '0 18px' }}>
          <div style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>ROAS</div>
          <div className="mono" style={{ fontSize: 16, fontWeight: 500, marginTop: 2, color: roas >= 5 ? 'var(--green)' : roas >= 4 ? 'var(--ink)' : roas > 0 ? 'var(--rose)' : 'var(--ink-3)' }}>
            {roas ? `${roas.toFixed(1)}×` : '—'}
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Revenue — last 6 mo</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            <span className="mono" style={{ fontSize: 14, fontWeight: 500 }}>{fmt$(trend[trend.length - 1] * 1000)}</span>
            {trend.length >= 2 && (
              <span style={{ fontSize: 11.5, color: trend[trend.length - 1] > trend[0] ? 'var(--green)' : 'var(--rose)' }}>
                {trend[trend.length - 1] > trend[0] ? '+' : ''}{Math.round((trend[trend.length - 1] - trend[0]) / Math.max(1, trend[0]) * 100)}%
              </span>
            )}
          </div>
        </div>
        <Sparkline data={trend} w={96} h={32} color={colorVar} />
      </div>
    </Card>
  );
}

// ── New Client Modal ──────────────────────────────────────────────────────────

const TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix'];
const TZ_LABELS: Record<string, string> = {
  'America/New_York': 'Eastern (ET)',
  'America/Chicago': 'Central (CT)',
  'America/Denver': 'Mountain (MT)',
  'America/Los_Angeles': 'Pacific (PT)',
  'America/Phoenix': 'Arizona (no DST)',
};

function NewClientModal({ agencyId, userId, onClose, onSuccess }: {
  agencyId: string; userId: string; onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({ name: '', firstName: '', lastName: '', email: '', phone: '', city: '', state: '', timezone: 'America/New_York' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Account name is required'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/agency/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyId, userId, name: form.name.trim(),
          location: form.firstName ? { first_name: form.firstName, last_name: form.lastName, email: form.email, phone: form.phone } : undefined,
          timezone: form.timezone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create account');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', fontSize: 13.5, border: '1px solid var(--line)',
    borderRadius: 8, background: 'var(--paper-2)', color: 'var(--ink)', outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  };
  const label: React.CSSProperties = { fontSize: 12.5, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 5, display: 'block' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'oklch(0% 0 0 / 0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 24px 48px oklch(0% 0 0 / 0.2)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>New client workspace</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>Creates an account with a default pipeline.</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={submit}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <div style={{ background: 'oklch(55% 0.22 25 / 0.1)', border: '1px solid oklch(55% 0.22 25 / 0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--rose)' }}>{error}</div>}
            <div>
              <label style={label}>Account name *</label>
              <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Jane Smith Real Estate" required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={label}>Client first name</label>
                <input style={inp} value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Jane" />
              </div>
              <div>
                <label style={label}>Client last name</label>
                <input style={inp} value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Smith" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={label}>Email</label>
                <input style={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@example.com" />
              </div>
              <div>
                <label style={label}>Phone</label>
                <input style={inp} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 555 000 0000" />
              </div>
            </div>
            <div>
              <label style={label}>Timezone</label>
              <select style={{ ...inp }} value={form.timezone} onChange={e => set('timezone', e.target.value)}>
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{TZ_LABELS[tz]}</option>)}
              </select>
            </div>
          </div>
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 18px', fontSize: 13.5, border: '1px solid var(--line)', borderRadius: 8, background: 'var(--paper-2)', color: 'var(--ink)', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding: '9px 20px', fontSize: 13.5, border: 'none', borderRadius: 8, background: 'var(--blue)', color: '#fff', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit', fontWeight: 500 }}>
              {saving ? 'Creating…' : 'Create workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ClientTable({ rows, stats, onClick }: { rows: SubAccount[]; stats: Record<string, ClientStats>; onClick: (id: string) => void }) {
  return (
    <Card padding={0} style={{ overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
        <thead>
          <tr style={{ background: 'var(--paper-2)', borderBottom: '1px solid var(--line)' }}>
            {['Workspace', 'Location', 'Listings', 'Leads / 30d', 'Spend / 30d', 'CPL', 'ROAS', 'Status', ''].map((h, i) => (
              <th key={i} style={{
                textAlign: i >= 2 && i <= 6 ? 'right' : 'left', padding: '11px 16px',
                fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => {
            const st = stats[s.id] || {} as ClientStats;
            return (
              <tr key={s.id} onClick={() => onClick(s.id)}
                style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--line)' : 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--paper-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar tag={s.tag} color={s.color} size={28} />
                    <div style={{ fontWeight: 500 }}>{s.name}</div>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--ink-2)' }}>{s.location}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'Geist Mono, monospace' }}>{st.listings || '—'}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'Geist Mono, monospace' }}>{fmtN(st.leads30 || s.leads30 || 0)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'Geist Mono, monospace' }}>{st.spend30 ? fmt$(st.spend30, true) : '—'}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'Geist Mono, monospace' }}>{st.cpl ? `$${st.cpl.toFixed(2)}` : '—'}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'Geist Mono, monospace', color: (st.roas || 0) >= 5 ? 'var(--green)' : (st.roas || 0) >= 4 ? 'var(--ink)' : 'var(--rose)' }}>
                  {st.roas ? `${st.roas.toFixed(1)}×` : '—'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {s.status === 'healthy' && <Badge tone="green" dot>Healthy</Badge>}
                  {s.status === 'attention' && <Badge tone="amber" dot>Attention</Badge>}
                  {s.status === 'onboarding' && <Badge tone="blue" dot>Onboarding</Badge>}
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--ink-3)', textAlign: 'right' }}>
                  <Icons.chevR size={15} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

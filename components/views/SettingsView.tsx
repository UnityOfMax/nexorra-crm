'use client';
import React, { useState, useEffect, CSSProperties } from 'react';
import { Card, Avatar, Badge, Button, Toggle } from '../ui/primitives';
import { Placeholder } from '../ui/primitives';
import { Icons } from '../Icons';
import type { SubAccount } from '../Sidebar';

interface SettingsViewProps {
  sub: SubAccount;
  accountId: string;
  userId: string;
  userRole?: string;
}

const SECTIONS = [
  { id: 'general', label: 'General', icon: <Icons.settings size={14} /> },
  { id: 'preferences', label: 'Preferences', icon: <Icons.sun size={14} /> },
  { id: 'team', label: 'Team & access', icon: <Icons.user size={14} /> },
  { id: 'billing', label: 'Billing', icon: <Icons.dollar size={14} /> },
  { id: 'integrations', label: 'Integrations', icon: <Icons.link size={14} /> },
  { id: 'portal', label: 'Client portal', icon: <Icons.globe size={14} /> },
  { id: 'automations', label: 'Automation rules', icon: <Icons.bolt size={14} /> },
  { id: 'notifications', label: 'Notifications', icon: <Icons.bell size={14} /> },
];

export default function SettingsView({ sub, accountId, userId, userRole = 'member' }: SettingsViewProps) {
  const [section, setSection] = useState('general');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return (localStorage.getItem('nx.theme') as 'light' | 'dark') || 'dark'; } catch { return 'dark'; }
  });

  const applyTheme = (t: 'light' | 'dark') => {
    setTheme(t);
    try { localStorage.setItem('nx.theme', t); } catch {}
    document.documentElement.setAttribute('data-theme', t);
    if (t === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Avatar tag={sub.tag} color={sub.color} size={16} /> {sub.name} <Icons.chevR size={12} /> Settings
        </div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>Settings</h1>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }} className="nx-settings-grid">
        <div className="nx-settings-nav" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8,
              background: section === s.id ? 'var(--paper-3)' : 'transparent',
              color: section === s.id ? 'var(--ink)' : 'var(--ink-2)', fontSize: 13.5,
              fontWeight: section === s.id ? 500 : 400, textAlign: 'left', whiteSpace: 'nowrap', flexShrink: 0,
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <span style={{ color: 'var(--ink-3)' }}>{s.icon}</span>{s.label}
            </button>
          ))}
        </div>
        <div>
          {section === 'general' && <GeneralSettings sub={sub} accountId={accountId} />}
          {section === 'preferences' && <PreferencesSettings theme={theme} setTheme={applyTheme} />}
          {section === 'team' && <TeamSettings accountId={accountId} />}
          {section === 'integrations' && <IntegrationsSettings accountId={accountId} userRole={userRole} />}
          {!['general', 'preferences', 'team', 'integrations'].includes(section) && (
            <Card padding={28}><Placeholder h={320} label={`${section} settings`} /></Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ── General ───────────────────────────────────────────────────────────────────

function GeneralSettings({ sub, accountId }: { sub: SubAccount; accountId: string }) {
  const [name, setName] = useState(sub.name || '');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/accounts/${accountId}/settings`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        if (d.from_email) setFromEmail(d.from_email);
        if (d.from_name) setFromName(d.from_name);
        if (d.timezone) setTimezone(d.timezone);
      })
      .catch(() => {});
  }, [accountId]);

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`/api/accounts/${accountId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { from_email: fromEmail, from_name: fromName, timezone } }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: CSSProperties = {
    width: '100%', padding: '8px 12px', border: '1px solid var(--line)',
    background: 'var(--paper-2)', borderRadius: 8, fontSize: 13, outline: 'none',
    fontFamily: 'inherit', color: 'var(--ink)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card padding={24}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Workspace</div>
          <Button variant="primary" size="sm" onClick={save} disabled={saving}>
            {saved ? 'Saved' : saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 18 }}>Basic information about this workspace.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="nx-2col-tight">
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginBottom: 6 }}>Workspace name</div>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Workspace name" />
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginBottom: 6 }}>From email</div>
            <input style={inputStyle} value={fromEmail} onChange={e => setFromEmail(e.target.value)} placeholder="hello@yourdomain.com" type="email" />
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginBottom: 6 }}>From name</div>
            <input style={inputStyle} value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Your name or business name" />
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginBottom: 6 }}>Timezone</div>
            <input style={inputStyle} value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="America/Vancouver" />
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginBottom: 6 }}>Client since</div>
            <div style={{ ...inputStyle, color: 'var(--ink-3)' }}>{sub.since || '—'}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Preferences ───────────────────────────────────────────────────────────────

function PreferencesSettings({ theme, setTheme }: { theme: string; setTheme: (t: 'light' | 'dark') => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card padding={24}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Appearance</div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 18 }}>Light and dark work equally well — pick what&apos;s easier on your eyes.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="nx-2col-tight">
          {[
            { v: 'light', label: 'Light', bg: 'oklch(98.8% 0.003 260)', ink: 'oklch(18% 0.012 260)', icon: <Icons.sun size={16} /> },
            { v: 'dark', label: 'Dark', bg: 'oklch(16% 0.012 260)', ink: 'oklch(97% 0.003 260)', icon: <Icons.moon size={16} /> },
          ].map(t => (
            <button key={t.v} onClick={() => setTheme(t.v as 'light' | 'dark')} style={{
              border: theme === t.v ? '2px solid var(--blue)' : '1px solid var(--line)',
              borderRadius: 12, padding: 14, textAlign: 'left', background: t.bg, color: t.ink, position: 'relative', cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                {t.icon}
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>{t.label}</span>
                {theme === t.v && <span style={{ marginLeft: 'auto', color: 'var(--blue)' }}><Icons.check size={15} /></span>}
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'oklch(58% 0.18 258)', opacity: 0.9, width: '70%' }} />
              <div style={{ height: 6, borderRadius: 3, background: 'currentColor', opacity: 0.18, width: '90%', marginTop: 6 }} />
              <div style={{ height: 6, borderRadius: 3, background: 'currentColor', opacity: 0.18, width: '55%', marginTop: 6 }} />
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Team ──────────────────────────────────────────────────────────────────────

function TeamSettings({ accountId }: { accountId: string }) {
  const [members, setMembers] = useState<Array<{ id: string; name: string; email: string; role: string }>>([]);

  useEffect(() => {
    fetch(`/api/account-members?accountId=${accountId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setMembers(d.members || d || []); })
      .catch(() => {});
  }, [accountId]);

  const displayMembers = members.length > 0 ? members : [
    { id: '1', name: 'Jess Alvarez', email: 'jess@nexorra.com', role: 'Agency admin' },
    { id: '2', name: 'Kai Obi', email: 'kai@nexorra.com', role: 'Account manager' },
  ];

  return (
    <Card padding={0} style={{ overflow: 'hidden' }}>
      <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Team & access</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>People who can access this workspace.</div>
        </div>
        <Button variant="primary" size="sm" icon={<Icons.plus size={13} />}>Invite</Button>
      </div>
      {displayMembers.map((t, i) => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px', borderBottom: i < displayMembers.length - 1 ? '1px solid var(--line)' : 'none' }}>
          <Avatar name={t.name} color={(['blue', 'violet', 'green', 'amber'] as const)[i % 4]} size={32} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>{t.name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{t.email}</div>
          </div>
          <Badge tone="neutral">{t.role}</Badge>
          <button style={{ padding: 4, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <Icons.more size={16} />
          </button>
        </div>
      ))}
    </Card>
  );
}

// ── Integrations ──────────────────────────────────────────────────────────────

interface IntegrationStatus {
  facebook: { connected: boolean; pageId?: string; adAccountId?: string };
  calendar: { connected: boolean; email?: string };
  twilio:   { connected: boolean; phone?: string };
}

function IntegrationsSettings({ accountId, userRole }: { accountId: string; userRole: string }) {
  const isAdminOrOwner = ['owner', 'admin', 'agency_owner'].some(r => userRole.toLowerCase().includes(r));

  const [status, setStatus] = useState<IntegrationStatus>({
    facebook: { connected: false },
    calendar: { connected: false },
    twilio:   { connected: false },
  });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'facebook' | 'calendar' | 'twilio' | null>(null);

  useEffect(() => {
    fetch(`/api/accounts/${accountId}/settings`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setStatus({
          facebook: {
            connected: !!(d.meta?.fb_page_id || d.meta?.ad_account_id),
            pageId: d.meta?.fb_page_id,
            adAccountId: d.meta?.ad_account_id,
          },
          calendar: {
            connected: !!(d.google_calendar?.enabled),
            email: d.google_calendar?.email,
          },
          twilio: {
            connected: !!(d.twilio_phone_number),
            phone: d.twilio_phone_number,
          },
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accountId]);

  const integrations = [
    ...(isAdminOrOwner ? [{
      id: 'facebook' as const,
      name: 'Facebook Ads',
      description: 'Ad account, page, and lead forms',
      icon: <Icons.megaphone size={18} />,
      color: 'var(--blue)',
      connected: status.facebook.connected,
      detail: status.facebook.pageId ? `Page ${status.facebook.pageId}` : undefined,
    }] : []),
    {
      id: 'calendar' as const,
      name: 'Google Calendar',
      description: 'Sync appointments and availability',
      icon: <Icons.calendar size={18} />,
      color: 'var(--green)',
      connected: status.calendar.connected,
      detail: status.calendar.email,
    },
    ...(isAdminOrOwner ? [{
      id: 'twilio' as const,
      name: 'Twilio SMS',
      description: 'Inbound and outbound SMS',
      icon: <Icons.phone size={18} />,
      color: 'var(--violet)',
      connected: status.twilio.connected,
      detail: status.twilio.phone,
    }] : []),
  ];

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <Card padding={24}><div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading...</div></Card>
        ) : integrations.map(intg => (
          <Card key={intg.id} padding={16} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--paper-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: intg.color, flexShrink: 0 }}>
              {intg.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{intg.name}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                {intg.connected && intg.detail ? intg.detail : intg.description}
              </div>
            </div>
            <Badge tone={intg.connected ? 'green' : 'neutral'} dot>
              {intg.connected ? 'connected' : 'not connected'}
            </Badge>
            <Button variant="secondary" size="sm" onClick={() => setModal(intg.id)}>
              Manage
            </Button>
          </Card>
        ))}
      </div>

      {modal === 'facebook' && (
        <FacebookModal
          accountId={accountId}
          status={status.facebook}
          onClose={() => setModal(null)}
          onSaved={(pageId, adAccountId) => {
            setStatus(s => ({ ...s, facebook: { connected: true, pageId, adAccountId } }));
            setModal(null);
          }}
        />
      )}
      {modal === 'calendar' && (
        <CalendarModal
          accountId={accountId}
          status={status.calendar}
          onClose={() => setModal(null)}
          onDisconnected={() => {
            setStatus(s => ({ ...s, calendar: { connected: false } }));
            setModal(null);
          }}
        />
      )}
      {modal === 'twilio' && (
        <TwilioModal
          status={status.twilio}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

// ── Modal shell ───────────────────────────────────────────────────────────────

function ModalShell({ title, onClose, children, width = 560 }: {
  title: string; onClose: () => void; children: React.ReactNode; width?: number;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div style={{
        position: 'relative', width, maxWidth: 'calc(100vw - 48px)', background: 'var(--paper-2)',
        border: '1px solid var(--line)', borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
          <button onClick={onClose} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}>
            <Icons.x size={18} />
          </button>
        </div>
        <div style={{ padding: '16px 24px 24px' }}>{children}</div>
      </div>
    </div>
  );
}

// ── Facebook modal ────────────────────────────────────────────────────────────

function FacebookModal({ accountId, status, onClose, onSaved }: {
  accountId: string;
  status: { connected: boolean; pageId?: string; adAccountId?: string };
  onClose: () => void;
  onSaved: (pageId: string, adAccountId: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adAccounts, setAdAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [pages, setPages] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedAdAccount, setSelectedAdAccount] = useState(status.adAccountId || '');
  const [selectedPage, setSelectedPage] = useState(status.pageId || '');
  const [section, setSection] = useState<'main' | 'lead-forms'>('main');
  const [leadForms, setLeadForms] = useState<Array<{ id: string; name: string; status: string }>>([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/integrations/facebook/accounts?accountId=${accountId}`)
      .then(r => r.ok ? r.json() : Promise.reject('Failed'))
      .then(d => {
        setAdAccounts(d.adAccounts || []);
        setPages(d.pages || []);
      })
      .catch(() => setError('Could not load Facebook accounts. Check the Meta access token.'))
      .finally(() => setLoading(false));
  }, [accountId]);

  const loadLeadForms = async () => {
    if (!selectedPage) return;
    setFormsLoading(true);
    try {
      const r = await fetch(`/api/integrations/facebook/lead-forms?accountId=${accountId}&pageId=${selectedPage}`);
      const d = await r.json();
      setLeadForms(d.forms || []);
      setSection('lead-forms');
    } catch { setError('Could not load lead forms.'); }
    finally { setFormsLoading(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch('/api/integrations/facebook/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, adAccountId: selectedAdAccount || null, pageId: selectedPage || null }),
      });
      if (!r.ok) throw new Error('Save failed');
      onSaved(selectedPage, selectedAdAccount);
    } catch { setError('Save failed. Try again.'); }
    finally { setSaving(false); }
  };

  const selectStyle: CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 8,
    background: 'var(--paper-3)', fontSize: 13, color: 'var(--ink)', fontFamily: 'inherit', outline: 'none',
  };
  const labelStyle: CSSProperties = {
    fontSize: 11.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginBottom: 6,
  };

  if (section === 'lead-forms') {
    return (
      <ModalShell title="Lead Forms" onClose={onClose} width={560}>
        <button onClick={() => setSection('main')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, padding: 0 }}>
          <Icons.chevL size={13} /> Back to Facebook Ads
        </button>
        {formsLoading ? (
          <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading forms...</div>
        ) : leadForms.length === 0 ? (
          <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>No lead forms found for this page.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {leadForms.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--paper-3)', borderRadius: 8 }}>
                <Icons.docs size={15} style={{ color: 'var(--ink-3)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{f.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>ID: {f.id}</div>
                </div>
                <Badge tone={f.status === 'ACTIVE' ? 'green' : 'neutral'} dot>{f.status?.toLowerCase() || 'unknown'}</Badge>
              </div>
            ))}
          </div>
        )}
      </ModalShell>
    );
  }

  return (
    <ModalShell title="Facebook Ads" onClose={onClose} width={520}>
      {error && (
        <div style={{ padding: '10px 14px', background: 'var(--red-dim, rgba(239,68,68,0.1))', borderRadius: 8, color: 'var(--red, #ef4444)', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '16px 0' }}>Loading your Facebook accounts...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={labelStyle}>Ad account</div>
            <select style={selectStyle} value={selectedAdAccount} onChange={e => setSelectedAdAccount(e.target.value)}>
              <option value="">— Select ad account —</option>
              {adAccounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.id})</option>)}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Facebook page</div>
            <select style={selectStyle} value={selectedPage} onChange={e => setSelectedPage(e.target.value)}>
              <option value="">— Select page —</option>
              {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {selectedPage && (
            <button onClick={loadLeadForms} disabled={formsLoading} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'var(--paper-3)',
              border: '1px solid var(--line)', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: 'var(--ink-2)', fontFamily: 'inherit',
            }}>
              <Icons.docs size={14} />
              {formsLoading ? 'Loading...' : 'View lead forms'}
              <Icons.chevR size={12} style={{ marginLeft: 'auto' }} />
            </button>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4, borderTop: '1px solid var(--line)' }}>
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={save} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

// ── Google Calendar modal ─────────────────────────────────────────────────────

function CalendarModal({ accountId, status, onClose, onDisconnected }: {
  accountId: string;
  status: { connected: boolean; email?: string };
  onClose: () => void;
  onDisconnected: () => void;
}) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState('');

  const connect = () => {
    window.location.href = `/api/integrations/google/auth?accountId=${accountId}`;
  };

  const disconnect = async () => {
    setDisconnecting(true);
    try {
      const r = await fetch(`/api/integrations/google/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      if (!r.ok) throw new Error('Failed');
      onDisconnected();
    } catch { setError('Disconnect failed. Try again.'); }
    finally { setDisconnecting(false); }
  };

  return (
    <ModalShell title="Google Calendar" onClose={onClose} width={460}>
      {error && (
        <div style={{ padding: '10px 14px', background: 'var(--red-dim, rgba(239,68,68,0.1))', borderRadius: 8, color: 'var(--red, #ef4444)', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}
      {status.connected ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--green-dim, rgba(34,197,94,0.08))', borderRadius: 10 }}>
            <Icons.check size={18} style={{ color: 'var(--green)' }} />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>Connected</div>
              {status.email && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{status.email}</div>}
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            Appointments booked through the CRM are synced to this Google Calendar. New events on your calendar are imported as activities.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4, borderTop: '1px solid var(--line)' }}>
            <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
            <Button variant="destructive" size="sm" onClick={disconnect} disabled={disconnecting}>
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
            Connect your Google Calendar to sync appointments and availability. You&apos;ll be redirected to Google to authorise access.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4, borderTop: '1px solid var(--line)' }}>
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={connect}>Connect Google Calendar</Button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

// ── Twilio modal ──────────────────────────────────────────────────────────────

function TwilioModal({ status, onClose }: {
  status: { connected: boolean; phone?: string };
  onClose: () => void;
}) {
  return (
    <ModalShell title="Twilio SMS" onClose={onClose} width={440}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {status.connected ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--green-dim, rgba(34,197,94,0.08))', borderRadius: 10 }}>
              <Icons.check size={18} style={{ color: 'var(--green)' }} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>Connected</div>
                {status.phone && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{status.phone}</div>}
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              This number handles inbound SMS from leads and sends automated follow-ups. Managed by the Nexorra team.
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
            No SMS number configured yet. Contact Nexorra to assign a Twilio number to this account.
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4, borderTop: '1px solid var(--line)' }}>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </ModalShell>
  );
}

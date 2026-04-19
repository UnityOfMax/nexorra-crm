'use client';

import { useState, useEffect } from 'react';
import { Account, NotificationPreferences } from '@/types';
import type { UserRole } from '@/types/agency';
import FacebookAccountSelector from './integrations/FacebookAccountSelector';

interface SettingsProps {
  account: Account;
  onUpdate: () => void;
  isAgencyUser?: boolean;
  userId?: string;
  userRole?: UserRole | null;
}

interface TwilioNumber {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  capabilities: { voice: boolean; sms: boolean; mms: boolean };
}

// ── Shared style tokens ─────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', fontFamily: 'Geist Mono, monospace', marginBottom: 6, letterSpacing: '0.04em' },
  input: { display: 'block', width: '100%', padding: '8px 10px', background: 'var(--paper-3)', border: '1px solid var(--line)', borderRadius: 7, fontSize: 13, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  select: { display: 'block', width: '100%', padding: '8px 10px', background: 'var(--paper-3)', border: '1px solid var(--line)', borderRadius: 7, fontSize: 13, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', cursor: 'pointer' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  hint: { fontSize: 11, color: 'var(--ink-4)', marginTop: 4 },
  divider: { height: 1, background: 'var(--line-2)', margin: '16px 0' },
  sectionTitle: { margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--ink)' },
  sectionSub: { margin: '0 0 18px', fontSize: 13, color: 'var(--ink-3)' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 14 },
  card: { background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '22px 24px', marginBottom: 16 },
  primaryBtn: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: 'var(--paper)', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  secondaryBtn: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper-2)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  dangerBtn: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--rose) 30%, var(--line))', background: 'color-mix(in srgb, var(--rose) 8%, var(--paper-2))', color: 'var(--rose)', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  disabledBtn: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--line)', color: 'var(--ink-4)', fontSize: 13, fontWeight: 600, cursor: 'not-allowed' },
  connectedBanner: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 8, background: 'color-mix(in srgb, var(--green) 8%, var(--paper-2))', border: '1px solid color-mix(in srgb, var(--green) 20%, var(--line))', marginBottom: 12 },
  infoBanner: { display: 'flex', gap: 10, padding: '12px 14px', background: 'color-mix(in srgb, var(--blue) 8%, var(--paper-2))', border: '1px solid color-mix(in srgb, var(--blue) 20%, var(--line))', borderRadius: 8, marginBottom: 14 },
  warnBanner: { display: 'flex', gap: 10, padding: '12px 14px', background: 'color-mix(in srgb, var(--amber) 8%, var(--paper-2))', border: '1px solid color-mix(in srgb, var(--amber) 20%, var(--line))', borderRadius: 8, marginBottom: 14 },
  errorBanner: { display: 'flex', gap: 10, padding: '12px 14px', background: 'color-mix(in srgb, var(--rose) 8%, var(--paper-2))', border: '1px solid color-mix(in srgb, var(--rose) 20%, var(--line))', borderRadius: 8, marginBottom: 14 },
  msgOk: { padding: '10px 14px', borderRadius: 8, background: 'color-mix(in srgb, var(--green) 10%, var(--paper-2))', border: '1px solid color-mix(in srgb, var(--green) 25%, var(--line))', color: 'var(--green)', fontSize: 13, marginBottom: 16 },
  msgErr: { padding: '10px 14px', borderRadius: 8, background: 'color-mix(in srgb, var(--rose) 10%, var(--paper-2))', border: '1px solid color-mix(in srgb, var(--rose) 25%, var(--line))', color: 'var(--rose)', fontSize: 13, marginBottom: 16 },
  monoBlock: { background: 'var(--paper-3)', borderRadius: 8, padding: '10px 14px' },
  monoText: { fontSize: 13, fontFamily: 'Geist Mono, monospace', color: 'var(--ink)', margin: 0 },
  notifRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line-2)' },
  notifRowLast: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' },
  spinnerRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '24px 0', color: 'var(--ink-3)', fontSize: 13 },
  integrationCard: { background: 'var(--paper-3)', border: '1px solid var(--line)', borderRadius: 10, padding: '16px', marginBottom: 14 },
};

// ── Nav section definitions ─────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: 'general',        label: 'General',          icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  { id: 'preferences',    label: 'Preferences',      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg> },
  { id: 'team',           label: 'Team & Access',    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { id: 'billing',        label: 'Billing',          icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
  { id: 'integrations',   label: 'Integrations',     icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> },
  { id: 'portal',         label: 'Client Portal',    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
  { id: 'automations',    label: 'Automation Rules', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
  { id: 'notifications',  label: 'Notifications',    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
];

// ── Toggle component ────────────────────────────────────────────────────────
function Toggle({ on, onToggle, sm }: { on: boolean; onToggle: () => void; sm?: boolean }) {
  const w = sm ? 32 : 40, h = sm ? 18 : 22;
  const thumbSz = h - 4;
  return (
    <button onClick={onToggle} aria-label="Toggle" style={{
      position: 'relative', width: w, height: h, borderRadius: h,
      background: on ? 'var(--grad)' : 'var(--line-2)',
      border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0,
      transition: 'background 180ms',
    }}>
      <span style={{
        position: 'absolute', top: 2, borderRadius: '50%',
        width: thumbSz, height: thumbSz, background: 'white',
        boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
        left: on ? w - thumbSz - 2 : 2,
        transition: 'left 180ms cubic-bezier(0.2,0.8,0.2,1)',
      }} />
    </button>
  );
}

function Spinner() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: 'nxSpin 1s linear infinite', flexShrink: 0 }}><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="20 18" /></svg>;
}

export default function Settings({ account, onUpdate, isAgencyUser = false, userId, userRole }: SettingsProps) {
  const [activeSection, setActiveSection] = useState('general');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingNumbers, setLoadingNumbers] = useState(false);
  const [twilioError, setTwilioError] = useState('');
  const [twilioNumbers, setTwilioNumbers] = useState<TwilioNumber[]>([]);
  const [facebookIntegration, setFacebookIntegration] = useState<any>(null);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [hotLeadThreshold, setHotLeadThreshold] = useState(40);
  const [alertsSaving, setAlertsSaving] = useState(false);
  const [alertsSaved, setAlertsSaved] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [testTelegramResult, setTestTelegramResult] = useState('');
  const [locationSaving, setLocationSaving] = useState(false);
  const [location, setLocation] = useState({ first_name: '', last_name: '', email: '', phone: '', address: '' });
  const [timezone, setTimezone] = useState('');
  const [settings, setSettings] = useState({ twilio_phone_number: '', from_email: '', from_name: '', primary_color: '#0ea5e9', logo_url: '' });
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({ reports: true, new_leads: true, no_bookings: true, new_texts: true, new_emails: true });
  const [notifLoading, setNotifLoading] = useState(true);
  const [dark, setDark] = useState(false);
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [appearanceSaved, setAppearanceSaved] = useState(false);

  const isSubAccount = !!account.parent_account_id;
  const effectiveRole = userRole || (isAgencyUser ? 'agency_owner' : 'client_user');

  // ── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (account.settings) {
      setSettings({ twilio_phone_number: account.settings.twilio_phone_number || '', from_email: account.settings.from_email || '', from_name: account.settings.from_name || '', primary_color: account.settings.branding?.primary_color || '#0ea5e9', logo_url: account.settings.branding?.logo_url || '' });
      if (account.settings.location) setLocation({ first_name: account.settings.location.first_name || '', last_name: account.settings.location.last_name || '', email: account.settings.location.email || '', phone: account.settings.location.phone || '', address: account.settings.location.address || '' });
      setTimezone(account.settings.timezone || '');
      setTelegramChatId((account.settings as any).telegram_chat_id || '');
      setHotLeadThreshold((account.settings as any).hot_lead_threshold ?? 40);
    }
    loadTwilioNumbers();
    loadFacebookIntegration();
  }, [account]);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
    if (userId) {
      const legacy = localStorage.getItem('theme');
      const userKey = `nexorra_theme_${userId}`;
      if (legacy && !localStorage.getItem(userKey)) localStorage.setItem(userKey, legacy);
    }
  }, [userId]);

  useEffect(() => { loadNotificationPrefs(); }, [account.id]);

  const loadFacebookIntegration = async () => {
    try { const res = await fetch(`/api/integrations/facebook/status?accountId=${account.id}`); if (res.ok) { const d = await res.json(); setFacebookIntegration(d.integration); } } catch {}
  };

  const loadTwilioNumbers = async () => {
    setLoadingNumbers(true); setTwilioError('');
    try { const r = await fetch('/api/twilio/numbers'); const d = await r.json(); if (r.ok) { setTwilioNumbers(d.numbers || []); } else { setTwilioError(d.error || `Error ${r.status}`); } } catch (e: any) { setTwilioError(e.message || 'Failed'); } finally { setLoadingNumbers(false); }
  };

  const loadNotificationPrefs = async () => {
    setNotifLoading(true);
    try { const r = await fetch(`/api/notification-preferences?accountId=${account.id}`); if (r.ok) { const d = await r.json(); if (d.preferences) setNotifPrefs(d.preferences); } } catch {} finally { setNotifLoading(false); }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const saveAccountSettings = async (patch: Record<string, any>) => {
    const r = await fetch(`/api/accounts/${account.id}/settings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings: patch }) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || 'Failed to save'); }
  };

  const handleSaveLocation = async () => {
    setLocationSaving(true); setMessage('');
    try {
      const fn = location.first_name.toLowerCase().replace(/\s+/g, '');
      const ln = location.last_name.toLowerCase().replace(/\s+/g, '');
      const fromEmail = fn && ln ? `${fn}${ln}@contact.ourlimitedoffer.com` : account.settings?.from_email || '';
      const fromName = [location.first_name, location.last_name].filter(Boolean).join(' ') || account.settings?.from_name || '';
      await saveAccountSettings({ location, timezone: timezone || undefined, from_email: fromEmail, from_name: fromName });
      setMessage('Account info saved!'); onUpdate();
    } catch (e: any) { setMessage('Error: ' + e.message); } finally { setLocationSaving(false); }
  };

  const handleSave = async () => {
    setLoading(true); setMessage('');
    try { await saveAccountSettings({ twilio_phone_number: settings.twilio_phone_number, from_email: settings.from_email, from_name: settings.from_name, branding: { primary_color: settings.primary_color, logo_url: settings.logo_url } }); setMessage('Settings saved!'); onUpdate(); }
    catch (e: any) { setMessage('Error: ' + e.message); } finally { setLoading(false); }
  };

  const handleDisconnectCalendar = async () => {
    if (!confirm('Disconnect Google Calendar?')) return;
    setLoading(true);
    try { const r = await fetch('/api/integrations/google/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId: account.id }) }); if (!r.ok) throw new Error('Failed'); setMessage('Google Calendar disconnected.'); onUpdate(); }
    catch (e: any) { setMessage('Error: ' + e.message); } finally { setLoading(false); }
  };

  const handleDisconnectFacebook = async () => {
    if (!confirm('Disconnect Facebook?')) return;
    setLoading(true);
    try { const r = await fetch('/api/integrations/facebook/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId: account.id }) }); if (!r.ok) throw new Error('Failed'); setMessage('Facebook disconnected.'); setFacebookIntegration(null); onUpdate(); }
    catch (e: any) { setMessage('Error: ' + e.message); } finally { setLoading(false); }
  };

  const toggleNotifPref = async (key: keyof NotificationPreferences) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] }; setNotifPrefs(updated);
    try { await fetch('/api/notification-preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId: account.id, preferences: updated }) }); } catch { setNotifPrefs(notifPrefs); }
  };

  const toggleDarkMode = (toDark: boolean) => {
    if (toDark) { document.documentElement.classList.add('dark'); document.documentElement.setAttribute('data-theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); document.documentElement.removeAttribute('data-theme'); }
    setDark(toDark);
    const value = toDark ? 'dark' : 'light';
    if (userId) localStorage.setItem(`nexorra_theme_${userId}`, value);
    localStorage.setItem('theme', value);
  };

  const saveAppearance = () => {
    const value = dark ? 'dark' : 'light';
    if (userId) localStorage.setItem(`nexorra_theme_${userId}`, value);
    localStorage.setItem('theme', value);
    setAppearanceSaved(true); setTimeout(() => setAppearanceSaved(false), 2000);
  };

  const handleSaveAlerts = async () => {
    setAlertsSaving(true); setAlertsSaved(false);
    try { await saveAccountSettings({ telegram_chat_id: telegramChatId || undefined, hot_lead_threshold: hotLeadThreshold }); setAlertsSaved(true); setTimeout(() => setAlertsSaved(false), 2000); onUpdate(); }
    catch (e: any) { setMessage('Error: ' + e.message); } finally { setAlertsSaving(false); }
  };

  const handleTestTelegram = async () => {
    if (!telegramChatId) return; setTestingTelegram(true); setTestTelegramResult('');
    try { const r = await fetch('/api/telegram/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chatId: telegramChatId }) }); setTestTelegramResult(r.ok ? 'Message sent!' : 'Failed — check Chat ID'); }
    catch { setTestTelegramResult('Failed to send'); } finally { setTestingTelegram(false); }
  };

  // ── Section renderers ─────────────────────────────────────────────────────

  const renderGeneral = () => (
    <div style={S.fieldGroup}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
        <div style={{ width: 60, height: 60, borderRadius: 14, background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 22, fontFamily: 'Geist Mono, monospace', flexShrink: 0 }}>
          {account.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{account.name}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Workspace · {account.account_type === 'agency' ? 'Agency' : 'Client'}</div>
        </div>
      </div>
      <div style={S.divider} />
      <div style={S.row2}>
        <div><label style={S.label}>First Name</label><input type="text" value={location.first_name} onChange={e => setLocation({ ...location, first_name: e.target.value })} style={S.input} placeholder="Brian" /></div>
        <div><label style={S.label}>Last Name</label><input type="text" value={location.last_name} onChange={e => setLocation({ ...location, last_name: e.target.value })} style={S.input} placeholder="James" /></div>
      </div>
      <div><label style={S.label}>Contact Email</label><input type="email" value={location.email} onChange={e => setLocation({ ...location, email: e.target.value })} style={S.input} placeholder="brian@example.com" /></div>
      <div><label style={S.label}>Phone</label><input type="tel" value={location.phone} onChange={e => setLocation({ ...location, phone: e.target.value })} style={S.input} placeholder="(305) 555-0123" /></div>
      <div><label style={S.label}>Address</label><input type="text" value={location.address} onChange={e => setLocation({ ...location, address: e.target.value })} style={S.input} placeholder="123 Main St, Miami, FL" /></div>
      <div>
        <label style={S.label}>Default Calendar Timezone</label>
        <select value={timezone} onChange={e => setTimezone(e.target.value)} style={S.select}>
          <option value="">Browser default</option>
          <option value="UTC">UTC</option>
          <option value="America/New_York">Eastern (ET)</option>
          <option value="America/Chicago">Central (CT)</option>
          <option value="America/Denver">Mountain (MT)</option>
          <option value="America/Los_Angeles">Pacific (PT)</option>
          <option value="America/Anchorage">Alaska</option>
          <option value="Pacific/Honolulu">Hawaii</option>
          <option value="America/Halifax">Atlantic (AT)</option>
          <option value="America/Vancouver">Vancouver (PT)</option>
          <option value="America/Toronto">Toronto (ET)</option>
          <option value="Europe/London">London (GMT/BST)</option>
          <option value="Europe/Paris">Paris (CET)</option>
          <option value="Asia/Dubai">Dubai (GST)</option>
          <option value="Asia/Kolkata">Mumbai (IST)</option>
          <option value="Asia/Singapore">Singapore (SGT)</option>
          <option value="Asia/Tokyo">Tokyo (JST)</option>
          <option value="Australia/Sydney">Sydney (AEST)</option>
          <option value="Pacific/Auckland">Auckland (NZST)</option>
        </select>
      </div>
      {location.first_name && location.last_name && (
        <div style={S.monoBlock}>
          <p style={{ ...S.hint, marginTop: 0, marginBottom: 4 }}>Auto-generated sending email:</p>
          <p style={S.monoText}>{location.first_name.toLowerCase().replace(/\s+/g, '')}{location.last_name.toLowerCase().replace(/\s+/g, '')}@contact.ourlimitedoffer.com</p>
        </div>
      )}
      {!isSubAccount && (
        <>
          <div style={S.divider} />
          <div style={S.row2}>
            <div>
              <label style={S.label}>Primary Color</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={settings.primary_color} onChange={e => setSettings({ ...settings, primary_color: e.target.value })} style={{ height: 38, width: 38, borderRadius: 8, border: '1px solid var(--line)', padding: 2, background: 'var(--paper-3)', cursor: 'pointer' }} />
                <input type="text" value={settings.primary_color} onChange={e => setSettings({ ...settings, primary_color: e.target.value })} style={{ ...S.input, flex: 1, fontFamily: 'Geist Mono, monospace' }} placeholder="#0ea5e9" />
              </div>
            </div>
            <div><label style={S.label}>Logo URL</label><input type="url" value={settings.logo_url} onChange={e => setSettings({ ...settings, logo_url: e.target.value })} style={S.input} placeholder="https://…/logo.png" /></div>
          </div>
        </>
      )}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={handleSaveLocation} disabled={locationSaving} style={locationSaving ? S.disabledBtn : S.primaryBtn}>
          {locationSaving ? <Spinner /> : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          Save Account Info
        </button>
        {!isSubAccount && (
          <button onClick={handleSave} disabled={loading} style={loading ? S.disabledBtn : S.secondaryBtn}>
            {loading ? <Spinner /> : null}
            Save Branding
          </button>
        )}
      </div>
      {/* Danger zone */}
      {isAgencyUser && !isSubAccount && (
        <>
          <div style={S.divider} />
          <div style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--rose) 25%, var(--line))', background: 'color-mix(in srgb, var(--rose) 4%, var(--paper-2))' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--rose)', marginBottom: 6 }}>Danger Zone</div>
            <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--ink-3)' }}>Archiving removes this workspace from active use. This cannot be undone.</p>
            <button style={S.dangerBtn}>Archive workspace</button>
          </div>
        </>
      )}
    </div>
  );

  const renderPreferences = () => {
    const themeCards = [
      { id: 'light', label: 'Light', preview: <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 10px', background: '#f8f8f8', borderRadius: 6 }}><div style={{ height: 6, borderRadius: 3, background: '#e4e4e7', width: '70%' }} /><div style={{ height: 4, borderRadius: 3, background: '#d4d4d8', width: '50%' }} /><div style={{ height: 4, borderRadius: 3, background: '#d4d4d8', width: '60%' }} /></div> },
      { id: 'dark', label: 'Dark', preview: <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 10px', background: '#1a1a1a', borderRadius: 6 }}><div style={{ height: 6, borderRadius: 3, background: '#3f3f46', width: '70%' }} /><div style={{ height: 4, borderRadius: 3, background: '#27272a', width: '50%' }} /><div style={{ height: 4, borderRadius: 3, background: '#27272a', width: '60%' }} /></div> },
    ];
    const deviceCards = [
      { id: 'desktop', label: 'Desktop', sub: 'Full sidebar navigation', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
      { id: 'mobile', label: 'Mobile PWA', sub: 'Bottom tab bar, compact UI', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> },
    ];

    return (
      <div style={S.fieldGroup}>
        {/* Appearance */}
        <div>
          <p style={S.sectionTitle}>Appearance</p>
          <p style={S.sectionSub}>Choose your preferred color scheme</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {themeCards.map(tc => {
              const active = dark === (tc.id === 'dark');
              return (
                <button key={tc.id} onClick={() => toggleDarkMode(tc.id === 'dark')} style={{
                  padding: 14, borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  border: active ? '2px solid var(--blue)' : '2px solid var(--line)',
                  background: active ? 'var(--blue-soft)' : 'var(--paper-2)',
                  transition: 'all 150ms',
                }}>
                  <div style={{ marginBottom: 10 }}>{tc.preview}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${active ? 'var(--blue)' : 'var(--line-2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)' }} />}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: active ? 'var(--blue)' : 'var(--ink)' }}>{tc.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={S.divider} />

        {/* Device mode */}
        <div>
          <p style={S.sectionTitle}>Device Mode</p>
          <p style={S.sectionSub}>Optimize the interface for your device</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {deviceCards.map(dc => {
              const active = deviceMode === dc.id;
              return (
                <button key={dc.id} onClick={() => setDeviceMode(dc.id as 'desktop' | 'mobile')} style={{
                  padding: 18, borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  border: active ? '2px solid var(--blue)' : '2px solid var(--line)',
                  background: active ? 'var(--blue-soft)' : 'var(--paper-2)',
                  transition: 'all 150ms',
                }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: active ? 'var(--blue-soft)' : 'var(--paper-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? 'var(--blue)' : 'var(--ink-3)', marginBottom: 12 }}>
                    {dc.icon}
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: active ? 'var(--blue)' : 'var(--ink)', marginBottom: 3 }}>{dc.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{dc.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <button onClick={saveAppearance} style={S.primaryBtn}>
            {appearanceSaved ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            {appearanceSaved ? 'Saved!' : 'Save Preferences'}
          </button>
        </div>
      </div>
    );
  };

  const renderTeam = () => (
    <div style={S.fieldGroup}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <p style={S.sectionTitle}>Team & Access</p>
          <p style={{ ...S.sectionSub, marginBottom: 0 }}>Manage team members and their permissions</p>
        </div>
        <button style={{ ...S.primaryBtn, padding: '8px 16px', fontSize: 12.5 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Invite member
        </button>
      </div>
      <div style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--paper-3)', border: '1px solid var(--line)', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
        Team management coming soon
      </div>
    </div>
  );

  const renderBilling = () => (
    <div style={S.fieldGroup}>
      <p style={S.sectionTitle}>Billing</p>
      <p style={S.sectionSub}>Subscription and payment details</p>
      <div style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--paper-3)', border: '1px solid var(--line)', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
        Billing management coming soon
      </div>
    </div>
  );

  const renderIntegrations = () => (
    <div style={S.fieldGroup}>
      <p style={S.sectionTitle}>Integrations</p>
      <p style={S.sectionSub}>Connect third-party services</p>

      {/* Google Calendar */}
      <div style={S.integrationCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'color-mix(in srgb, var(--violet) 12%, var(--paper-2))', border: '1px solid color-mix(in srgb, var(--violet) 20%, var(--line))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="13" rx="2" stroke="var(--violet)" strokeWidth="1.4"/><path d="M1 6h14M5 1v3M11 1v3" stroke="var(--violet)" strokeWidth="1.4" strokeLinecap="round"/><rect x="4" y="9" width="3" height="3" rx="0.5" fill="var(--violet)"/></svg>
          </div>
          <div><p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Google Calendar</p><p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>Sync CRM meetings with Google Calendar</p></div>
        </div>
        {account.settings?.google_calendar?.enabled ? (
          <div style={S.connectedBanner}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}><circle cx="8" cy="8" r="7" stroke="var(--green)" strokeWidth="1.5"/><path d="M5 8l2 2 4-4" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>Connected</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)' }}>{account.settings.google_calendar.user_email}</p>
            </div>
            <button onClick={handleDisconnectCalendar} disabled={loading} style={S.dangerBtn}>Disconnect</button>
          </div>
        ) : (
          <button onClick={() => { window.location.href = `/api/integrations/google/authorize?accountId=${account.id}${userId ? `&userId=${userId}` : ''}`; }} style={S.primaryBtn}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M1 6h14M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            Connect Google Calendar
          </button>
        )}
      </div>

      {/* Facebook */}
      {(isAgencyUser || effectiveRole === 'agency_owner' || effectiveRole === 'agency_admin') && (
        <div style={S.integrationCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'color-mix(in srgb, var(--blue) 12%, var(--paper-2))', border: '1px solid color-mix(in srgb, var(--blue) 20%, var(--line))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M9.5 3H11V1H9C7.34 1 6 2.34 6 4v1.5H4.5V7.5H6V15h3V7.5h2l.5-2H9V4c0-.28.22-.5.5-.5Z" fill="var(--blue)"/></svg>
            </div>
            <div><p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Facebook</p><p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>Sync leads from Facebook Ads and Page messages</p></div>
          </div>
          {facebookIntegration ? (
            <>
              <div style={S.connectedBanner}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}><circle cx="8" cy="8" r="7" stroke="var(--green)" strokeWidth="1.5"/><path d="M5 8l2 2 4-4" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>Connected</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)' }}>{facebookIntegration.facebook_user_name || 'Connected'}</p>
                </div>
                <button onClick={handleDisconnectFacebook} disabled={loading} style={S.dangerBtn}>Disconnect</button>
              </div>
              <FacebookAccountSelector accountId={account.id} currentAdAccountId={facebookIntegration.ad_account_id} currentPageId={facebookIntegration.page_id} onSave={() => { loadFacebookIntegration(); setMessage('Facebook accounts updated!'); }} />
            </>
          ) : (
            <button onClick={() => { window.location.href = `/api/integrations/facebook/authorize?accountId=${account.id}`; }} style={S.primaryBtn}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M9.5 3H11V1H9C7.34 1 6 2.34 6 4v1.5H4.5V7.5H6V15h3V7.5h2l.5-2H9V4c0-.28.22-.5.5-.5Z" fill="currentColor"/></svg>
              Connect Facebook
            </button>
          )}
        </div>
      )}

      {/* Twilio */}
      <div style={S.integrationCard}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'color-mix(in srgb, var(--rose) 12%, var(--paper-2))', border: '1px solid color-mix(in srgb, var(--rose) 20%, var(--line))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--rose)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.19 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.72 2 2 0 0 1 4.11 2.5h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.72-.87a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2z"/></svg>
            </div>
            <div><p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Twilio SMS</p><p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>Select phone number for SMS messaging</p></div>
          </div>
          <button onClick={loadTwilioNumbers} disabled={loadingNumbers} style={S.secondaryBtn}>{loadingNumbers ? <Spinner /> : <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M14 8A6 6 0 1 1 9 2.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}Refresh</button>
        </div>
        {loadingNumbers ? <div style={S.spinnerRow}><Spinner />Loading…</div>
          : twilioError ? <div style={S.errorBanner}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}><circle cx="8" cy="8" r="7" stroke="var(--rose)" strokeWidth="1.5"/><path d="M8 5v4" stroke="var(--rose)" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="11" r="0.75" fill="var(--rose)"/></svg><p style={{ margin: 0, fontSize: 13, color: 'var(--rose)' }}>{twilioError}</p></div>
          : twilioNumbers.length === 0 ? <div style={S.warnBanner}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}><path d="M8 2L14 14H2L8 2Z" stroke="var(--amber)" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 7v3" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round"/></svg><p style={{ margin: 0, fontSize: 13, color: 'var(--amber)' }}>No Twilio numbers found</p></div>
          : (
            <div>
              <label style={S.label}>Phone Number</label>
              <select value={settings.twilio_phone_number} onChange={e => setSettings({ ...settings, twilio_phone_number: e.target.value })} style={S.select}>
                <option value="">Choose a number…</option>
                {twilioNumbers.map(n => <option key={n.sid} value={n.phoneNumber}>{n.phoneNumber} — {n.friendlyName}</option>)}
              </select>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button onClick={handleSave} disabled={loading || !settings.twilio_phone_number} style={(loading || !settings.twilio_phone_number) ? S.disabledBtn : S.primaryBtn}>{loading ? <Spinner /> : null}Save</button>
              </div>
            </div>
          )}
      </div>
    </div>
  );

  const renderPortal = () => {
    const features = ['Dashboard', 'Reports', 'Pipeline', 'Calendar', 'Conversations', 'Landing Pages'];
    return (
      <div style={S.fieldGroup}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <p style={S.sectionTitle}>Client Portal</p>
            <p style={{ ...S.sectionSub, marginBottom: 0 }}>Control what clients can see in their portal</p>
          </div>
          <Toggle on={true} onToggle={() => {}} />
        </div>
        <div style={S.divider} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {features.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, background: 'var(--paper-3)', border: '1px solid var(--line)' }}>
              <span style={{ fontSize: 13, color: 'var(--ink)' }}>{f}</span>
              <Toggle on={true} onToggle={() => {}} sm />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAutomations = () => (
    <div style={S.fieldGroup}>
      <p style={S.sectionTitle}>Automation Rules</p>
      <p style={S.sectionSub}>Configure built-in automation behaviors</p>
      <div style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--paper-3)', border: '1px solid var(--line)', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
        Automation rules are managed in the Workflows section
      </div>
    </div>
  );

  const renderNotifications = () => {
    const NOTIF_OPTIONS: { key: keyof NotificationPreferences; label: string; desc: string }[] = [
      { key: 'new_leads',   label: 'New Leads',         desc: 'When a new lead comes in' },
      { key: 'new_texts',   label: 'SMS Messages',      desc: 'When you receive an SMS' },
      { key: 'new_emails',  label: 'Email Messages',    desc: 'Incoming emails' },
      { key: 'no_bookings', label: 'No Booking Alerts', desc: 'Leads with no bookings' },
      { key: 'reports',     label: 'Reports',           desc: 'Periodic performance reports' },
    ];
    return (
      <div style={S.fieldGroup}>
        <div>
          <p style={S.sectionTitle}>Notifications</p>
          <p style={S.sectionSub}>Choose what you want to be notified about</p>
        </div>
        {notifLoading ? <div style={S.spinnerRow}><Spinner />Loading…</div> : (
          <div>
            {NOTIF_OPTIONS.map(({ key, label, desc }, idx) => (
              <div key={key} style={idx === NOTIF_OPTIONS.length - 1 ? S.notifRowLast : S.notifRow}>
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{label}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)' }}>{desc}</p>
                </div>
                <Toggle on={notifPrefs[key]} onToggle={() => toggleNotifPref(key)} />
              </div>
            ))}
          </div>
        )}
        <div style={S.divider} />
        {/* Telegram alerts */}
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Telegram Alerts</p>
          <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--ink-3)' }}>Get Telegram notifications when hot leads reply</p>
          <label style={S.label}>Chat ID</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <input type="text" value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)} style={{ ...S.input, flex: 1 }} placeholder="e.g. -1001234567890" />
            <button onClick={handleTestTelegram} disabled={testingTelegram || !telegramChatId} style={(testingTelegram || !telegramChatId) ? S.disabledBtn : S.secondaryBtn}>
              {testingTelegram ? <Spinner /> : <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M14 2L1 7l5 2.5M14 2l-6 9-2.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              Test
            </button>
          </div>
          {testTelegramResult && <p style={{ fontSize: 12, color: testTelegramResult.includes('sent') ? 'var(--green)' : 'var(--rose)', marginBottom: 8 }}>{testTelegramResult}</p>}
          <p style={S.hint}>Start a chat with @userinfobot to find your Chat ID.</p>
          <div style={{ marginTop: 12 }}>
            <label style={S.label}>Hot lead threshold — <span style={{ color: 'var(--blue)', fontFamily: 'Geist Mono, monospace' }}>{hotLeadThreshold}+</span></label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[40, 60, 80].map(v => (
                <button key={v} onClick={() => setHotLeadThreshold(v)} style={{ flex: 1, padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: hotLeadThreshold === v ? '1px solid var(--blue)' : '1px solid var(--line)', background: hotLeadThreshold === v ? 'color-mix(in srgb, var(--blue) 10%, var(--paper-2))' : 'transparent', color: hotLeadThreshold === v ? 'var(--blue)' : 'var(--ink-3)' }}>{v}+</button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button onClick={handleSaveAlerts} disabled={alertsSaving} style={alertsSaving ? S.disabledBtn : S.primaryBtn}>
              {alertsSaving ? <Spinner /> : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              {alertsSaved ? 'Saved!' : 'Save Notifications'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSection = (id: string) => {
    switch (id) {
      case 'general':       return renderGeneral();
      case 'preferences':   return renderPreferences();
      case 'team':          return renderTeam();
      case 'billing':       return renderBilling();
      case 'integrations':  return renderIntegrations();
      case 'portal':        return renderPortal();
      case 'automations':   return renderAutomations();
      case 'notifications': return renderNotifications();
      default:              return null;
    }
  };

  return (
    <>
      <div style={{ padding: '24px 32px 48px', maxWidth: 1280, margin: '0 auto' }}>
        {/* Page header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-3)', marginBottom: 8, fontFamily: 'Geist Mono, monospace' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M21 12h-2M17.66 17.66l-1.41-1.41M12 21v-2M4.34 17.66l1.41-1.41M3 12H1M6.34 6.34L4.93 4.93M12 3V1"/></svg>
            Settings
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }}>Settings</h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 28 }} className="nx-settings-layout">
          {/* Left nav */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV_SECTIONS.map(sec => (
              <button key={sec.id} onClick={() => setActiveSection(sec.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, border: 'none',
                background: activeSection === sec.id ? 'var(--paper-3)' : 'transparent',
                color: activeSection === sec.id ? 'var(--ink)' : 'var(--ink-2)',
                fontSize: 13.5, fontWeight: activeSection === sec.id ? 500 : 400,
                textAlign: 'left', cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                <span style={{ color: activeSection === sec.id ? 'var(--ink-2)' : 'var(--ink-3)', display: 'flex', flexShrink: 0 }}>{sec.icon}</span>
                {sec.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ minWidth: 0 }}>
            {message && <div style={message.toLowerCase().includes('error') ? S.msgErr : S.msgOk}>{message}</div>}
            <div style={S.card}>{renderSection(activeSection)}</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes nxSpin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .nx-settings-layout { grid-template-columns: 1fr !important; }
          .nx-settings-layout > div:first-child { flex-direction: row !important; flex-wrap: wrap; }
        }
      `}</style>
    </>
  );
}

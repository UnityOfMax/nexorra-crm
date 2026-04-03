'use client';

import { useState, useEffect } from 'react';
import { Account, NotificationPreferences } from '@/types';
import type { UserRole } from '@/types/agency';
import { Save, Phone, Mail, Globe, Loader, RefreshCw, Calendar, CheckCircle, Facebook, User, Bell, Palette, Moon, Sun, Terminal, Copy, ExternalLink, ArrowLeft, ChevronRight } from 'lucide-react';
import FacebookAccountSelector from './integrations/FacebookAccountSelector';

// ── Section definitions with role-based visibility ──────────────────
interface SectionDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  hideForSubAccounts?: boolean;
}

const SETTINGS_SECTIONS: SectionDef[] = [
  { id: 'account-info', label: 'Account Info', icon: User, roles: ['agency_owner', 'agency_admin'] },
  { id: 'phone', label: 'Phone Service', icon: Phone, roles: ['agency_owner', 'agency_admin'] },
  { id: 'email', label: 'Email Service', icon: Mail, roles: ['agency_owner', 'agency_admin', 'client_owner'] },
  { id: 'integrations', label: 'Integrations', icon: Calendar, roles: ['agency_owner', 'agency_admin', 'client_owner'] },
  { id: 'branding', label: 'Branding', icon: Globe, roles: ['agency_owner', 'agency_admin'], hideForSubAccounts: true },
  { id: 'notifications', label: 'Notifications', icon: Bell, roles: ['agency_owner', 'agency_admin', 'client_owner', 'client_admin', 'client_user'] },
  { id: 'appearance', label: 'Appearance', icon: Palette, roles: ['agency_owner', 'agency_admin', 'client_owner', 'client_admin', 'client_user'] },
];

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

export default function Settings({ account, onUpdate, isAgencyUser = false, userId, userRole }: SettingsProps) {
  const [loading, setLoading] = useState(false);
  const [loadingNumbers, setLoadingNumbers] = useState(false);
  const [twilioError, setTwilioError] = useState('');
  const [message, setMessage] = useState('');
  const [twilioNumbers, setTwilioNumbers] = useState<TwilioNumber[]>([]);
  const [facebookIntegration, setFacebookIntegration] = useState<any>(null);

  // Account / Custom Fields
  const [locationSaving, setLocationSaving] = useState(false);
  const [location, setLocation] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [timezone, setTimezone] = useState('');

  // Service settings
  const [settings, setSettings] = useState({
    twilio_phone_number: '',
    from_email: '',
    from_name: '',
    primary_color: '#0ea5e9',
    logo_url: '',
  });

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    reports: true,
    new_leads: true,
    no_bookings: true,
    new_texts: true,
    new_emails: true,
  });
  const [notifLoading, setNotifLoading] = useState(true);

  // Dark mode state
  const [dark, setDark] = useState(false);

  // Active settings section
  const isSubAccount = !!account.parent_account_id;
  const effectiveRole = userRole || (isAgencyUser ? 'agency_owner' : 'client_user');

  const visibleSections = SETTINGS_SECTIONS.filter((s) => {
    if (!s.roles.includes(effectiveRole as UserRole)) return false;
    if (s.hideForSubAccounts && isSubAccount) return false;
    return true;
  });

  const [activeSection, setActiveSection] = useState(visibleSections[0]?.id || 'notifications');
  // Mobile: null = show section list, string = show that section's content
  const [mobileSectionId, setMobileSectionId] = useState<string | null>(null);

  useEffect(() => {
    if (account.settings) {
      setSettings({
        twilio_phone_number: account.settings.twilio_phone_number || '',
        from_email: account.settings.from_email || '',
        from_name: account.settings.from_name || '',
        primary_color: account.settings.branding?.primary_color || '#0ea5e9',
        logo_url: account.settings.branding?.logo_url || '',
      });
      if (account.settings.location) {
        setLocation({
          first_name: account.settings.location.first_name || '',
          last_name: account.settings.location.last_name || '',
          email: account.settings.location.email || '',
          phone: account.settings.location.phone || '',
          address: account.settings.location.address || '',
        });
      }
      setTimezone(account.settings.timezone || '');
    }
    loadTwilioNumbers();
    loadFacebookIntegration();
  }, [account]);

  useEffect(() => {
    // Sync dark state from DOM (ThemeProvider already applied the class)
    setDark(document.documentElement.classList.contains('dark'));
    // Migrate legacy key to user-scoped key if needed
    if (userId) {
      const legacy = localStorage.getItem('theme');
      const userKey = `nexorra_theme_${userId}`;
      if (legacy && !localStorage.getItem(userKey)) {
        localStorage.setItem(userKey, legacy);
      }
    }
  }, [userId]);

  useEffect(() => {
    loadNotificationPrefs();
  }, [account.id]);

  // ── Data loaders ──────────────────────────────────────────────────

  const loadFacebookIntegration = async () => {
    try {
      const res = await fetch(`/api/integrations/facebook/status?accountId=${account.id}`);
      if (res.ok) {
        const data = await res.json();
        setFacebookIntegration(data.integration);
      }
    } catch {
      // No Facebook integration yet
    }
  };

  const loadTwilioNumbers = async () => {
    setLoadingNumbers(true);
    setTwilioError('');
    try {
      const response = await fetch('/api/twilio/numbers');
      const data = await response.json();
      if (response.ok) {
        setTwilioNumbers(data.numbers || []);
      } else {
        setTwilioError(data.error || `Error ${response.status}`);
      }
    } catch (err: any) {
      setTwilioError(err.message || 'Failed to fetch numbers');
    } finally {
      setLoadingNumbers(false);
    }
  };

  const loadNotificationPrefs = async () => {
    setNotifLoading(true);
    try {
      const res = await fetch(`/api/notification-preferences?accountId=${account.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.preferences) setNotifPrefs(data.preferences);
      }
    } catch {
      // Column may not exist yet
    } finally {
      setNotifLoading(false);
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────

  const saveAccountSettings = async (patch: Record<string, any>) => {
    const response = await fetch(`/api/accounts/${account.id}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: patch }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to save');
    }
  };

  const handleSaveLocation = async () => {
    setLocationSaving(true);
    setMessage('');
    try {
      const firstName = location.first_name.toLowerCase().replace(/\s+/g, '');
      const lastName = location.last_name.toLowerCase().replace(/\s+/g, '');
      const fromEmail = firstName && lastName ? `${firstName}${lastName}@contact.ourlimitedoffer.com` : account.settings?.from_email || '';
      const fromName = [location.first_name, location.last_name].filter(Boolean).join(' ') || account.settings?.from_name || '';

      await saveAccountSettings({
        location,
        timezone: timezone || undefined,
        from_email: fromEmail,
        from_name: fromName,
      });
      setMessage('Account info saved!');
      onUpdate();
    } catch (error: any) {
      setMessage('Error: ' + error.message);
    } finally {
      setLocationSaving(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    try {
      await saveAccountSettings({
        twilio_phone_number: settings.twilio_phone_number,
        from_email: settings.from_email,
        from_name: settings.from_name,
        branding: {
          primary_color: settings.primary_color,
          logo_url: settings.logo_url,
        },
      });
      setMessage('Settings saved!');
      onUpdate();
    } catch (error: any) {
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    if (!confirm('Disconnect Google Calendar? This will remove all calendar sync mappings.')) return;
    setLoading(true);
    try {
      const response = await fetch('/api/integrations/google/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: account.id }),
      });
      if (!response.ok) throw new Error('Failed to disconnect calendar');
      setMessage('Google Calendar disconnected.');
      onUpdate();
    } catch (error: any) {
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectFacebook = async () => {
    if (!confirm('Disconnect Facebook? This will remove access to your ads and pages data.')) return;
    setLoading(true);
    try {
      const response = await fetch('/api/integrations/facebook/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: account.id }),
      });
      if (!response.ok) throw new Error('Failed to disconnect Facebook');
      setMessage('Facebook disconnected.');
      setFacebookIntegration(null);
      onUpdate();
    } catch (error: any) {
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleNotifPref = async (key: keyof NotificationPreferences) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    try {
      await fetch('/api/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: account.id, preferences: updated }),
      });
    } catch {
      // Revert on failure
      setNotifPrefs(notifPrefs);
    }
  };

  const [appearanceSaved, setAppearanceSaved] = useState(false);

  const toggleDarkMode = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    setDark(isDark);
    // Persist immediately — user-scoped key + generic fallback
    const value = isDark ? 'dark' : 'light';
    if (userId) {
      localStorage.setItem(`nexorra_theme_${userId}`, value);
    }
    localStorage.setItem('theme', value);
  };

  const saveAppearance = async () => {
    const value = dark ? 'dark' : 'light';
    if (userId) {
      localStorage.setItem(`nexorra_theme_${userId}`, value);
    }
    localStorage.setItem('theme', value);
    setAppearanceSaved(true);
    setTimeout(() => setAppearanceSaved(false), 2000);
  };

  // ── Section renderers ─────────────────────────────────────────────

  const renderAccountInfo = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Account Info</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Location and contact info for this account</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
            <input type="text" value={location.first_name} onChange={(e) => setLocation({ ...location, first_name: e.target.value })} className="input" placeholder="Brian" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
            <input type="text" value={location.last_name} onChange={(e) => setLocation({ ...location, last_name: e.target.value })} className="input" placeholder="James" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Email</label>
          <input type="email" value={location.email} onChange={(e) => setLocation({ ...location, email: e.target.value })} className="input" placeholder="brian@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
          <input type="tel" value={location.phone} onChange={(e) => setLocation({ ...location, phone: e.target.value })} className="input" placeholder="(305) 555-0123" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
          <input type="text" value={location.address} onChange={(e) => setLocation({ ...location, address: e.target.value })} className="input" placeholder="123 Main St, Miami, FL 33131" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Calendar Timezone</label>
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="input">
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
          <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Auto-generated sending email:</p>
            <p className="text-sm font-mono text-gray-800 dark:text-gray-200">
              {location.first_name.toLowerCase().replace(/\s+/g, '')}{location.last_name.toLowerCase().replace(/\s+/g, '')}@contact.ourlimitedoffer.com
            </p>
          </div>
        )}
        <button onClick={handleSaveLocation} disabled={locationSaving} className="btn btn-primary flex items-center gap-2">
          {locationSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Account Info
        </button>
      </div>
    </div>
  );

  const renderPhoneService = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Phone Service</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Twilio — select which number to use for SMS</p>
        </div>
        <button onClick={loadTwilioNumbers} disabled={loadingNumbers} className="btn btn-secondary flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loadingNumbers ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loadingNumbers ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading Twilio numbers...</span>
        </div>
      ) : twilioError ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300 font-medium">Failed to load phone numbers</p>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1 font-mono">{twilioError}</p>
        </div>
      ) : twilioNumbers.length === 0 ? (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-white/5 rounded-lg p-4">
          <p className="text-amber-800 dark:text-amber-300 font-medium">No Twilio numbers found</p>
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
            Make sure your Twilio credentials are configured, or purchase a number at{' '}
            <a href="https://www.twilio.com/console/phone-numbers/search" target="_blank" rel="noopener noreferrer" className="underline">Twilio Console</a>
          </p>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Phone Number</label>
          <select value={settings.twilio_phone_number} onChange={(e) => setSettings({ ...settings, twilio_phone_number: e.target.value })} className="input">
            <option value="">Choose a phone number...</option>
            {twilioNumbers.map((num) => (
              <option key={num.sid} value={num.phoneNumber}>
                {num.phoneNumber} - {num.friendlyName}
                {num.capabilities.sms ? ' (SMS)' : ''}
                {num.capabilities.voice ? ' (Voice)' : ''}
              </option>
            ))}
          </select>
          <div className="flex items-center justify-between mt-3">
            {settings.twilio_phone_number ? (
              <p className="text-sm text-green-600 dark:text-green-400">Selected: {settings.twilio_phone_number}</p>
            ) : (
              <span />
            )}
            <button onClick={handleSave} disabled={loading || !settings.twilio_phone_number} className="btn btn-primary btn-sm flex items-center gap-2">
              {loading ? <Loader className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save Number
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderEmailService = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Email Service</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {isSubAccount ? 'Auto-generated sending address for this account' : 'Resend — configure your sending email address'}
        </p>
      </div>

      {isSubAccount ? (
        <>
          {account.settings?.from_email && (
            <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
              <p className="text-sm font-mono text-gray-900 dark:text-gray-100">{account.settings.from_email}</p>
              {account.settings.from_name && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">From: {account.settings.from_name}</p>
              )}
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Generated from location name. System emails use noreply@contact.ainexorra.com.
          </p>
        </>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-white/5 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Emails are sent via Resend. You must verify your domain in{' '}
              <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="underline font-medium">Resend Dashboard</a>
              {' '}before sending.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Name</label>
              <input type="text" value={settings.from_name} onChange={(e) => setSettings({ ...settings, from_name: e.target.value })} className="input" placeholder="Your Company" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Email</label>
              <input type="email" value={settings.from_email} onChange={(e) => setSettings({ ...settings, from_email: e.target.value })} className="input" placeholder="noreply@yourdomain.com" />
            </div>
          </div>
          <button onClick={handleSave} disabled={loading} className="btn btn-primary flex items-center gap-2">
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Email Settings
          </button>
        </div>
      )}
    </div>
  );

  const renderIntegrations = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Integrations</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Connect third-party services</p>
      </div>

      {/* Google Calendar */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">Google Calendar</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Sync CRM meetings with Google Calendar</p>
          </div>
        </div>

        {account.settings?.google_calendar?.enabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200/60 dark:border-white/5 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900 dark:text-green-200">Google Calendar Connected</p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">{account.settings.google_calendar.user_email}</p>
                {account.settings.google_calendar.last_sync_at && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Last synced: {new Date(account.settings.google_calendar.last_sync_at).toLocaleString()}
                  </p>
                )}
              </div>
              <button onClick={handleDisconnectCalendar} disabled={loading} className="btn btn-secondary text-sm">Disconnect</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">Connect to automatically sync meetings between your CRM and calendar.</p>
            <button
              onClick={() => { window.location.href = `/api/integrations/google/authorize?accountId=${account.id}${userId ? `&userId=${userId}` : ''}`; }}
              className="btn btn-primary flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Connect Google Calendar
            </button>
          </div>
        )}
      </div>

      {/* Facebook */}
      {(isAgencyUser || effectiveRole === 'agency_owner' || effectiveRole === 'agency_admin') && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Facebook className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">Facebook</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sync leads from Facebook Ads and Page messages</p>
            </div>
          </div>

          {facebookIntegration ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200/60 dark:border-white/5 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-200">Facebook Connected</p>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-1">{facebookIntegration.facebook_user_name || 'Connected'}</p>
                </div>
                <button onClick={handleDisconnectFacebook} disabled={loading} className="btn btn-secondary text-sm">Disconnect</button>
              </div>
              <FacebookAccountSelector
                accountId={account.id}
                currentAdAccountId={facebookIntegration.ad_account_id}
                currentPageId={facebookIntegration.page_id}
                onSave={() => { loadFacebookIntegration(); setMessage('Facebook accounts updated!'); }}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">Connect Facebook to sync leads from Lead Ads and manage Page messages.</p>
              <button
                onClick={() => { window.location.href = `/api/integrations/facebook/authorize?accountId=${account.id}`; }}
                className="btn btn-primary flex items-center gap-2"
              >
                <Facebook className="w-4 h-4" />
                Connect Facebook
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderBranding = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Branding</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Customize your account appearance</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary Color</label>
          <div className="flex gap-3 items-center">
            <input type="color" value={settings.primary_color} onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })} className="h-10 w-10 rounded-xl border-2 border-gray-200/60 dark:border-white/5 p-0 overflow-hidden" />
            <input type="text" value={settings.primary_color} onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })} className="input flex-1" placeholder="#0ea5e9" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Logo URL</label>
          <input type="url" value={settings.logo_url} onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })} className="input" placeholder="https://yourdomain.com/logo.png" />
        </div>
        <button onClick={handleSave} disabled={loading} className="btn btn-primary flex items-center gap-2">
          {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Branding
        </button>
      </div>
    </div>
  );

  const renderNotifications = () => {
    const NOTIF_OPTIONS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
      { key: 'new_leads', label: 'New Leads', description: 'Get notified when a new lead comes in' },
      { key: 'new_texts', label: 'New Text Messages', description: 'Get notified when you receive an SMS' },
      { key: 'new_emails', label: 'New Emails', description: 'Get notified for incoming emails' },
      { key: 'no_bookings', label: 'No Booking Alerts', description: 'Alert when leads have no bookings scheduled' },
      { key: 'reports', label: 'Reports', description: 'Receive periodic performance reports' },
    ];

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Notifications</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Choose what you want to be notified about</p>
        </div>

        {notifLoading ? (
          <div className="flex items-center gap-2 py-8 justify-center">
            <Loader className="w-5 h-5 animate-spin text-gray-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Loading preferences...</span>
          </div>
        ) : (
          <div className="space-y-1">
            {NOTIF_OPTIONS.map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between py-3 px-1">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
                </div>
                <button
                  onClick={() => toggleNotifPref(key)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                    notifPrefs[key] ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    notifPrefs[key] ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderAppearance = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Appearance</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Customize the look and feel</p>
      </div>

      <div className="flex items-center justify-between py-3 px-1">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Dark Mode</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Switch between light and dark themes</p>
        </div>
        <button
          onClick={toggleDarkMode}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
            dark ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 flex items-center justify-center ${
            dark ? 'translate-x-5' : 'translate-x-0'
          }`}>
            {dark ? <Moon className="w-3 h-3 text-gray-600" /> : <Sun className="w-3 h-3 text-amber-500" />}
          </span>
        </button>
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={saveAppearance} className="btn btn-primary flex items-center gap-2">
          {appearanceSaved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {appearanceSaved ? 'Saved!' : 'Save'}
        </button>
      </div>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'account-info': return renderAccountInfo();
      case 'phone': return renderPhoneService();
      case 'email': return renderEmailService();
      case 'integrations': return renderIntegrations();
      case 'branding': return renderBranding();
      case 'notifications': return renderNotifications();
      case 'appearance': return renderAppearance();
      default: return null;
    }
  };

  // ── Layout ────────────────────────────────────────────────────────

  // Mobile section renderer (uses mobileSectionId to pick content)
  const renderMobileSection = () => {
    switch (mobileSectionId) {
      case 'account-info': return renderAccountInfo();
      case 'phone': return renderPhoneService();
      case 'email': return renderEmailService();
      case 'integrations': return renderIntegrations();
      case 'branding': return renderBranding();
      case 'notifications': return renderNotifications();
      case 'appearance': return renderAppearance();
      default: return null;
    }
  };

  const mobileSectionLabel = visibleSections.find(s => s.id === mobileSectionId)?.label || '';

  return (
    <>
      {/* ── Desktop layout (>= md) ── */}
      <div className="hidden md:flex gap-6 max-w-5xl">
        {/* Sidebar nav */}
        <div className="w-56 flex-shrink-0">
          <nav className="space-y-0.5">
            {visibleSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-primary-500/10 text-primary-700 font-semibold dark:bg-primary-500/20 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/4 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-primary-600 dark:text-primary-400' : ''}`} />
                  <span>{section.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {message && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              message.toLowerCase().includes('error') ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
            }`}>
              {message}
            </div>
          )}
          <div className="card">
            {renderSection()}
          </div>
        </div>
      </div>

      {/* ── Mobile layout (< md) ── */}
      <div className="md:hidden">
        {mobileSectionId === null ? (
          /* Section list */
          <div className="space-y-1">
            {visibleSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setMobileSectionId(section.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-white/4"
                >
                  <div className="p-2 bg-gray-100 dark:bg-white/6 rounded-lg">
                    <Icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">{section.label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                </button>
              );
            })}
          </div>
        ) : (
          /* Section content with back button */
          <div>
            <button
              onClick={() => setMobileSectionId(null)}
              className="flex items-center gap-2 mb-4 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{mobileSectionLabel}</span>
            </button>

            {message && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                message.toLowerCase().includes('error') ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
              }`}>
                {message}
              </div>
            )}
            <div className="card">
              {renderMobileSection()}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

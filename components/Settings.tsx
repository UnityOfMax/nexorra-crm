'use client';

import { useState, useEffect } from 'react';
import { Account } from '@/types';
import { supabase } from '@/lib/supabase';
import { Save, Phone, Mail, Globe, Loader, RefreshCw, Calendar, CheckCircle, Facebook, Bot, User, MapPin } from 'lucide-react';
import FacebookAccountSelector from './integrations/FacebookAccountSelector';

interface SettingsProps {
  account: Account;
  onUpdate: () => void;
  isAgencyUser?: boolean;
  userId?: string;
}

interface TwilioNumber {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  capabilities: { voice: boolean; sms: boolean; mms: boolean };
}

export default function Settings({ account, onUpdate, isAgencyUser = false, userId }: SettingsProps) {
  const [loading, setLoading] = useState(false);
  const [loadingNumbers, setLoadingNumbers] = useState(false);
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

  // Service settings
  const [settings, setSettings] = useState({
    twilio_phone_number: '',
    from_email: '',
    from_name: '',
    primary_color: '#0ea5e9',
    logo_url: '',
  });

  // AI config
  const [aiConfig, setAiConfig] = useState({
    enabled: false,
    mode: 'suggest' as 'suggest' | 'auto',
    system_prompt: '',
    tone: 'professional',
    max_tokens: 500,
    channels: { sms: true, email: true },
    business_context: '',
  });
  const [aiSaving, setAiSaving] = useState(false);
  const [aiTesting, setAiTesting] = useState(false);

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
    }
    loadTwilioNumbers();
    loadFacebookIntegration();
    loadAiConfig();
  }, [account]);

  const loadFacebookIntegration = async () => {
    try {
      const { data, error } = await supabase
        .from('facebook_integrations')
        .select('*')
        .eq('account_id', account.id)
        .single();
      if (data && !error) setFacebookIntegration(data);
    } catch {
      // No Facebook integration yet
    }
  };

  const loadAiConfig = async () => {
    try {
      const res = await fetch(`/api/ai/config?accountId=${account.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setAiConfig({
            enabled: data.config.enabled ?? false,
            mode: data.config.mode || 'suggest',
            system_prompt: data.config.system_prompt || '',
            tone: data.config.tone || 'professional',
            max_tokens: data.config.max_tokens || 500,
            channels: data.config.channels || { sms: true, email: true },
            business_context: data.config.business_context || '',
          });
        }
      }
    } catch (error) {
      console.error('Error loading AI config:', error);
    }
  };

  const saveAiConfig = async () => {
    setAiSaving(true);
    try {
      const res = await fetch('/api/ai/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: account.id, ...aiConfig }),
      });
      if (res.ok) setMessage('AI agent settings saved!');
      else setMessage('Failed to save AI settings');
    } catch (error: any) {
      setMessage('Error: ' + error.message);
    } finally {
      setAiSaving(false);
    }
  };

  const testAiResponse = async () => {
    setAiTesting(true);
    setMessage('');
    try {
      await saveAiConfig();
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id')
        .eq('account_id', account.id)
        .limit(1)
        .single();
      if (!contacts) { setMessage('No contacts found. Add a contact first to test AI.'); return; }
      const res = await fetch('/api/ai/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: account.id, contactId: contacts.id, channel: 'sms' }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessage(`AI Test Response: "${data.response}"`);
      } else {
        const data = await res.json();
        setMessage('AI Test Failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error: any) {
      setMessage('Error: ' + error.message);
    } finally {
      setAiTesting(false);
    }
  };

  const loadTwilioNumbers = async () => {
    setLoadingNumbers(true);
    try {
      const response = await fetch('/api/twilio/numbers');
      if (response.ok) {
        const data = await response.json();
        setTwilioNumbers(data.numbers || []);
      } else {
        const error = await response.json();
        setMessage('⚠️ ' + (error.error || 'Could not load Twilio numbers'));
      }
    } catch (error: any) {
      setMessage('⚠️ Error loading Twilio numbers: ' + error.message);
    } finally {
      setLoadingNumbers(false);
    }
  };

  const handleSaveLocation = async () => {
    setLocationSaving(true);
    setMessage('');
    try {
      // Auto-update from_email and from_name when location changes
      const firstName = location.first_name.toLowerCase().replace(/\s+/g, '');
      const lastName = location.last_name.toLowerCase().replace(/\s+/g, '');
      const fromEmail = firstName && lastName ? `${firstName}${lastName}@contact.ourlimitedoffer.com` : account.settings?.from_email || '';
      const fromName = [location.first_name, location.last_name].filter(Boolean).join(' ') || account.settings?.from_name || '';

      const { error } = await supabase
        .from('accounts')
        .update({
          settings: {
            ...account.settings,
            location,
            from_email: fromEmail,
            from_name: fromName,
          },
        })
        .eq('id', account.id);
      if (error) throw error;
      setMessage('✅ Account info saved!');
      onUpdate();
    } catch (error: any) {
      setMessage('❌ Error: ' + error.message);
    } finally {
      setLocationSaving(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    try {
      const { error } = await supabase
        .from('accounts')
        .update({
          settings: {
            ...account.settings,
            twilio_phone_number: settings.twilio_phone_number,
            from_email: settings.from_email,
            from_name: settings.from_name,
            branding: {
              primary_color: settings.primary_color,
              logo_url: settings.logo_url,
            },
          },
        })
        .eq('id', account.id);
      if (error) throw error;
      setMessage('✅ Settings saved successfully!');
      onUpdate();
    } catch (error: any) {
      setMessage('❌ Error: ' + error.message);
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
      setMessage('✅ Google Calendar disconnected.');
      onUpdate();
    } catch (error: any) {
      setMessage('❌ Error: ' + error.message);
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
      setMessage('✅ Facebook disconnected.');
      setFacebookIntegration(null);
      onUpdate();
    } catch (error: any) {
      setMessage('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isSubAccount = !!account.parent_account_id;

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h2>

      {/* ── ACCOUNT INFO (Custom Fields) — admin/owner only ── */}
      {isAgencyUser && (
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <User className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Custom Fields</h3>
              <p className="text-sm text-gray-600">Location and contact info for this account</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={location.first_name}
                  onChange={(e) => setLocation({ ...location, first_name: e.target.value })}
                  className="input"
                  placeholder="Brian"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={location.last_name}
                  onChange={(e) => setLocation({ ...location, last_name: e.target.value })}
                  className="input"
                  placeholder="James"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
              <input
                type="email"
                value={location.email}
                onChange={(e) => setLocation({ ...location, email: e.target.value })}
                className="input"
                placeholder="brian@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={location.phone}
                onChange={(e) => setLocation({ ...location, phone: e.target.value })}
                className="input"
                placeholder="(305) 555-0123"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={location.address}
                onChange={(e) => setLocation({ ...location, address: e.target.value })}
                className="input"
                placeholder="123 Main St, Miami, FL 33131"
              />
            </div>
            {location.first_name && location.last_name && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Auto-generated sending email:</p>
                <p className="text-sm font-mono text-gray-800">
                  {location.first_name.toLowerCase().replace(/\s+/g, '')}{location.last_name.toLowerCase().replace(/\s+/g, '')}@contact.ourlimitedoffer.com
                </p>
              </div>
            )}
            <button
              onClick={handleSaveLocation}
              disabled={locationSaving}
              className="btn btn-primary flex items-center gap-2"
            >
              {locationSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Account Info
            </button>
          </div>
        </div>
      )}

      {/* ── PHONE SERVICE ── */}
      {isAgencyUser && (
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 rounded-lg">
              <Phone className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Phone Service</h3>
              <p className="text-sm text-gray-600">Twilio — select which number to use for SMS</p>
            </div>
            <button
              onClick={loadTwilioNumbers}
              disabled={loadingNumbers}
              className="btn btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loadingNumbers ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {loadingNumbers ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading Twilio numbers...</span>
            </div>
          ) : twilioNumbers.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 font-medium">No Twilio numbers found</p>
              <p className="text-sm text-amber-600 mt-1">
                Make sure your Twilio credentials are in your .env.local file, or purchase a number at{' '}
                <a href="https://www.twilio.com/console/phone-numbers/search" target="_blank" rel="noopener noreferrer" className="underline">
                  Twilio Console
                </a>
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Phone Number</label>
              <select
                value={settings.twilio_phone_number}
                onChange={(e) => setSettings({ ...settings, twilio_phone_number: e.target.value })}
                className="input"
              >
                <option value="">Choose a phone number...</option>
                {twilioNumbers.map((num) => (
                  <option key={num.sid} value={num.phoneNumber}>
                    {num.phoneNumber} - {num.friendlyName}
                    {num.capabilities.sms ? ' (SMS)' : ''}
                    {num.capabilities.voice ? ' (Voice)' : ''}
                  </option>
                ))}
              </select>
              {settings.twilio_phone_number && (
                <p className="text-sm text-green-600 mt-2">✓ Selected: {settings.twilio_phone_number}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── EMAIL SERVICE ── */}
      {isAgencyUser && !isSubAccount && (
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Email Service</h3>
              <p className="text-sm text-gray-600">Resend — configure your sending email address</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Emails are sent via Resend. You must verify your domain in{' '}
                <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                  Resend Dashboard
                </a>
                {' '}before sending.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                <input
                  type="text"
                  value={settings.from_name}
                  onChange={(e) => setSettings({ ...settings, from_name: e.target.value })}
                  className="input"
                  placeholder="Your Company"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
                <input
                  type="email"
                  value={settings.from_email}
                  onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
                  className="input"
                  placeholder="noreply@yourdomain.com"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-account sending email (read-only) */}
      {isSubAccount && account.settings?.from_email && (
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Mail className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Email Service</h3>
              <p className="text-sm text-gray-600">Auto-generated sending address for this account</p>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-2">
            <p className="text-sm font-mono text-gray-900">{account.settings.from_email}</p>
            {account.settings.from_name && (
              <p className="text-xs text-gray-500 mt-1">From: {account.settings.from_name}</p>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Generated from location name. System emails (invitations, resets) use noreply@contact.ainexorra.com.
          </p>
        </div>
      )}

      {/* ── BRANDING ── */}
      {isAgencyUser && !isSubAccount && (
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Globe className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Branding</h3>
              <p className="text-sm text-gray-600">Customize your account appearance</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  className="h-10 w-20 rounded border border-gray-300"
                />
                <input
                  type="text"
                  value={settings.primary_color}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  className="input flex-1"
                  placeholder="#0ea5e9"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
              <input
                type="url"
                value={settings.logo_url}
                onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                className="input"
                placeholder="https://yourdomain.com/logo.png"
              />
            </div>
          </div>
        </div>
      )}

      {/* Save button for Phone/Email/Branding */}
      {isAgencyUser && (
        <>
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${
              message.includes('❌') || message.includes('⚠️') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}>
              {message}
            </div>
          )}
          {!isSubAccount && (
            <div className="mb-6">
              <button
                onClick={handleSave}
                disabled={loading}
                className="btn btn-primary flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save Service Settings'}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── INTEGRATIONS ── */}
      <div className="mb-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-4">Integrations</h3>
      </div>

      {/* Google Calendar */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Calendar className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Google Calendar</h3>
            <p className="text-sm text-gray-600">Sync CRM meetings with Google Calendar</p>
          </div>
        </div>

        {account.settings?.google_calendar?.enabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">Google Calendar Connected</p>
                <p className="text-xs text-green-700 mt-1">{account.settings.google_calendar.user_email}</p>
                {account.settings.google_calendar.last_sync_at && (
                  <p className="text-xs text-green-600 mt-1">
                    Last synced: {new Date(account.settings.google_calendar.last_sync_at).toLocaleString()}
                  </p>
                )}
              </div>
              <button onClick={handleDisconnectCalendar} disabled={loading} className="btn btn-secondary text-sm">
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Connect Google Calendar to automatically sync meetings between your CRM and calendar.
            </p>
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
      {isAgencyUser && (
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Facebook className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Facebook</h3>
              <p className="text-sm text-gray-600">Sync leads from Facebook Ads and Page messages</p>
            </div>
          </div>

          {facebookIntegration ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900">Facebook Connected</p>
                  <p className="text-xs text-green-700 mt-1">{facebookIntegration.facebook_user_name || 'Connected'}</p>
                </div>
                <button onClick={handleDisconnectFacebook} disabled={loading} className="btn btn-secondary text-sm">
                  Disconnect
                </button>
              </div>
              <FacebookAccountSelector
                accountId={account.id}
                currentAdAccountId={facebookIntegration.ad_account_id}
                currentPageId={facebookIntegration.page_id}
                onSave={() => { loadFacebookIntegration(); setMessage('✅ Facebook accounts updated!'); }}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Connect Facebook to sync leads from Lead Ads and manage Page messages from the CRM.
              </p>
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

      {/* ── AI AGENT ── */}
      {isAgencyUser && (
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-violet-100 rounded-lg">
              <Bot className="w-6 h-6 text-violet-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">AI Agent</h3>
              <p className="text-sm text-gray-600">AI-powered responses for conversations</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={aiConfig.enabled}
                onChange={(e) => setAiConfig({ ...aiConfig, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
              <span className="ml-2 text-sm font-medium text-gray-700">{aiConfig.enabled ? 'On' : 'Off'}</span>
            </label>
          </div>

          {aiConfig.enabled ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Response Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['suggest', 'auto'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setAiConfig({ ...aiConfig, mode })}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        aiConfig.mode === mode ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-gray-900 text-sm">{mode === 'suggest' ? 'Suggest Only' : 'Auto-Respond'}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {mode === 'suggest' ? 'AI drafts responses for you to review' : 'AI automatically sends responses'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
                <select value={aiConfig.tone} onChange={(e) => setAiConfig({ ...aiConfig, tone: e.target.value })} className="input">
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="friendly">Friendly</option>
                  <option value="formal">Formal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
                <textarea
                  value={aiConfig.system_prompt}
                  onChange={(e) => setAiConfig({ ...aiConfig, system_prompt: e.target.value })}
                  className="input font-mono text-sm"
                  rows={4}
                  placeholder="You are a helpful assistant for our business..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Context</label>
                <textarea
                  value={aiConfig.business_context}
                  onChange={(e) => setAiConfig({ ...aiConfig, business_context: e.target.value })}
                  className="input text-sm"
                  rows={3}
                  placeholder="We are a real estate agency open Mon-Fri..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Active Channels</label>
                <div className="flex gap-4">
                  {(['sms', 'email'] as const).map((ch) => (
                    <label key={ch} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={aiConfig.channels[ch]}
                        onChange={(e) => setAiConfig({ ...aiConfig, channels: { ...aiConfig.channels, [ch]: e.target.checked } })}
                        className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-sm text-gray-700 capitalize">{ch}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Response Length: {aiConfig.max_tokens} tokens
                </label>
                <input
                  type="range" min={100} max={2000} step={100}
                  value={aiConfig.max_tokens}
                  onChange={(e) => setAiConfig({ ...aiConfig, max_tokens: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400"><span>Short</span><span>Long</span></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={saveAiConfig} disabled={aiSaving} className="btn btn-primary flex items-center gap-2">
                  {aiSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save AI Settings
                </button>
                <button onClick={testAiResponse} disabled={aiTesting} className="btn btn-secondary flex items-center gap-2">
                  {aiTesting ? <Loader className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                  Test AI
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Enable the AI agent to automatically generate or suggest responses to inbound messages.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

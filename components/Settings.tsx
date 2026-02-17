'use client';

import { useState, useEffect } from 'react';
import { Account } from '@/types';
import { supabase } from '@/lib/supabase';
import { Save, Phone, Mail, Globe, Loader, RefreshCw, Calendar, CheckCircle, Facebook } from 'lucide-react';
import FacebookAccountSelector from './integrations/FacebookAccountSelector';

interface SettingsProps {
  account: Account;
  onUpdate: () => void;
}

interface TwilioNumber {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
}

export default function Settings({ account, onUpdate }: SettingsProps) {
  const [loading, setLoading] = useState(false);
  const [loadingNumbers, setLoadingNumbers] = useState(false);
  const [message, setMessage] = useState('');
  const [twilioNumbers, setTwilioNumbers] = useState<TwilioNumber[]>([]);
  const [facebookIntegration, setFacebookIntegration] = useState<any>(null);
  const [settings, setSettings] = useState({
    // Twilio Phone Number (just the selection, credentials in env)
    twilio_phone_number: '',

    // Email Config (Resend - just from address)
    from_email: '',
    from_name: '',

    // Branding
    primary_color: '#0ea5e9',
    logo_url: '',
  });

  useEffect(() => {
    if (account.settings) {
      setSettings({
        twilio_phone_number: account.settings.twilio_phone_number || '',
        from_email: account.settings.from_email || '',
        from_name: account.settings.from_name || '',
        primary_color: account.settings.branding?.primary_color || '#0ea5e9',
        logo_url: account.settings.branding?.logo_url || '',
      });
    }
    // Load integrations on mount
    loadTwilioNumbers();
    loadFacebookIntegration();
  }, [account]);

  const loadFacebookIntegration = async () => {
    try {
      const { data, error } = await supabase
        .from('facebook_integrations')
        .select('*')
        .eq('account_id', account.id)
        .single();

      if (data && !error) {
        setFacebookIntegration(data);
      }
    } catch (error) {
      // Facebook integration doesn't exist yet, which is fine
      console.log('No Facebook integration found');
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

  const handleSave = async () => {
    setLoading(true);
    setMessage('');

    try {
      const updatedSettings = {
        twilio_phone_number: settings.twilio_phone_number,
        from_email: settings.from_email,
        from_name: settings.from_name,
        branding: {
          primary_color: settings.primary_color,
          logo_url: settings.logo_url,
        },
      };

      const { error } = await supabase
        .from('accounts')
        .update({ settings: updatedSettings })
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
    if (!confirm('Are you sure you want to disconnect Google Calendar? This will remove all calendar sync mappings.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/integrations/google/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: account.id })
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect calendar');
      }

      setMessage('✅ Google Calendar disconnected successfully!');
      onUpdate();
    } catch (error: any) {
      setMessage('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectFacebook = async () => {
    if (!confirm('Are you sure you want to disconnect Facebook? This will remove access to your ads and pages data.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/integrations/facebook/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: account.id })
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect Facebook');
      }

      setMessage('✅ Facebook disconnected successfully!');
      setFacebookIntegration(null);
      onUpdate();
    } catch (error: any) {
      setMessage('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h2>

      {/* Twilio Phone Number Selection */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 rounded-lg">
            <Phone className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Twilio Phone Number</h3>
            <p className="text-sm text-gray-600">Select which Twilio number to use for this account</p>
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

        <div className="space-y-4">
          {loadingNumbers ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading your Twilio numbers...</span>
            </div>
          ) : twilioNumbers.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 font-medium">No Twilio numbers found</p>
              <p className="text-sm text-amber-600 mt-1">
                Make sure your Twilio credentials are set in the .env.local file, or purchase a number at{' '}
                <a
                  href="https://www.twilio.com/console/phone-numbers/search"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Twilio Console
                </a>
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Phone Number
              </label>
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
                <p className="text-sm text-green-600 mt-2">
                  ✓ Selected: {settings.twilio_phone_number}
                </p>
              )}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Twilio credentials are configured globally in your environment variables.
              Each account can select which phone number to use from your Twilio account.
            </p>
          </div>
        </div>
      </div>

      {/* Email Settings */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Email Configuration (Resend)</h3>
            <p className="text-sm text-gray-600">Configure your sending email address</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Emails are sent via Resend. The API key is configured globally.
              You must verify your domain in Resend before sending.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Name
              </label>
              <input
                type="text"
                value={settings.from_name}
                onChange={(e) => setSettings({ ...settings, from_name: e.target.value })}
                className="input"
                placeholder="Your Company"
              />
              <p className="text-xs text-gray-500 mt-1">
                The name recipients will see
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Email
              </label>
              <input
                type="email"
                value={settings.from_email}
                onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
                className="input"
                placeholder="noreply@yourdomain.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be verified in Resend
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <strong>Domain Setup Required:</strong> Add and verify your domain in{' '}
              <a
                href="https://resend.com/domains"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                Resend Dashboard
              </a>
              {' '}before you can send emails.
            </p>
          </div>
        </div>
      </div>

      {/* Branding */}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Color
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logo URL
            </label>
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

      {/* Google Calendar Integration */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Calendar className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Calendar Integration</h3>
            <p className="text-sm text-gray-600">Sync your CRM meetings with Google Calendar</p>
          </div>
        </div>

        {account.settings?.google_calendar?.enabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">
                  Google Calendar Connected
                </p>
                <p className="text-xs text-green-700 mt-1">
                  {account.settings.google_calendar.user_email}
                </p>
                {account.settings.google_calendar.last_sync_at && (
                  <p className="text-xs text-green-600 mt-1">
                    Last synced: {new Date(account.settings.google_calendar.last_sync_at).toLocaleString()}
                  </p>
                )}
              </div>
              <button
                onClick={handleDisconnectCalendar}
                disabled={loading}
                className="btn btn-secondary text-sm"
              >
                Disconnect
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>How it works:</strong> When you create a meeting activity in your CRM, it automatically syncs to your Google Calendar.
                Changes from Google Calendar sync back to your CRM every 15 minutes.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Connect your Google Calendar to automatically sync meetings between your CRM and calendar.
              This enables 2-way synchronization so your calendar stays up to date.
            </p>

            <button
              onClick={() => {
                window.location.href = `/api/integrations/google/authorize?accountId=${account.id}`;
              }}
              className="btn btn-primary flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Connect Google Calendar
            </button>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <strong>Features:</strong>
              </p>
              <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc list-inside">
                <li>Automatic 2-way sync between CRM and Google Calendar</li>
                <li>Meeting activities appear as calendar events</li>
                <li>Updates sync in both directions</li>
                <li>Secure OAuth 2.0 authentication</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Facebook Integration */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Facebook className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Facebook Integration</h3>
            <p className="text-sm text-gray-600">Connect Facebook Ads and Pages to sync leads and messages</p>
          </div>
        </div>

        {facebookIntegration ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">
                  Facebook Connected
                </p>
                <p className="text-xs text-green-700 mt-1">
                  {facebookIntegration.facebook_user_name || 'Connected'}
                </p>
                {facebookIntegration.last_sync_at && (
                  <p className="text-xs text-green-600 mt-1">
                    Last synced: {new Date(facebookIntegration.last_sync_at).toLocaleString()}
                  </p>
                )}
              </div>
              <button
                onClick={handleDisconnectFacebook}
                disabled={loading}
                className="btn btn-secondary text-sm"
              >
                Disconnect
              </button>
            </div>

            <FacebookAccountSelector
              accountId={account.id}
              currentAdAccountId={facebookIntegration.ad_account_id}
              currentPageId={facebookIntegration.page_id}
              onSave={() => {
                loadFacebookIntegration();
                setMessage('✅ Facebook accounts updated successfully!');
              }}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Connect your Facebook account to automatically sync leads from Lead Ads,
              track ad campaign performance, and manage Page messages from your CRM.
            </p>

            <button
              onClick={() => {
                window.location.href = `/api/integrations/facebook/authorize?accountId=${account.id}`;
              }}
              className="btn btn-primary flex items-center gap-2"
            >
              <Facebook className="w-4 h-4" />
              Connect Facebook
            </button>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <strong>Features:</strong>
              </p>
              <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc list-inside">
                <li>Automatic lead capture from Facebook Lead Ads</li>
                <li>Sync Facebook Page messages to CRM conversations</li>
                <li>Track ad campaign performance and ROI</li>
                <li>Instagram business account integration</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.includes('❌') || message.includes('⚠️') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {message}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={loading}
        className="btn btn-primary flex items-center gap-2"
      >
        <Save className="w-4 h-4" />
        {loading ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}

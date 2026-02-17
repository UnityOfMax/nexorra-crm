'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface FacebookAccountSelectorProps {
  accountId: string;
  currentAdAccountId?: string;
  currentPageId?: string;
  onSave: () => void;
}

interface AdAccount {
  id: string;
  name: string;
  account_status: number;
}

interface Page {
  id: string;
  name: string;
  instagram_business_account?: {
    id: string;
    username: string;
  };
}

export default function FacebookAccountSelector({
  accountId,
  currentAdAccountId,
  currentPageId,
  onSave
}: FacebookAccountSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedAdAccount, setSelectedAdAccount] = useState(currentAdAccountId || '');
  const [selectedPage, setSelectedPage] = useState(currentPageId || '');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/integrations/facebook/accounts?accountId=${accountId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load accounts');
      }

      setAdAccounts(data.adAccounts || []);
      setPages(data.pages || []);
    } catch (error: any) {
      console.error('Error loading Facebook accounts:', error);
      setMessage('Failed to load accounts: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/integrations/facebook/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          adAccountId: selectedAdAccount || null,
          pageId: selectedPage || null
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      setMessage('✅ Accounts saved successfully!');
      onSave();
    } catch (error: any) {
      setMessage('❌ Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-600">Loading your Facebook accounts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.includes('❌') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {message}
        </div>
      )}

      {/* Ad Account Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ad Account (Optional)
        </label>
        <select
          value={selectedAdAccount}
          onChange={(e) => setSelectedAdAccount(e.target.value)}
          className="input"
        >
          <option value="">No ad account selected</option>
          {adAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.id})
            </option>
          ))}
        </select>
        {adAccounts.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">
            No ad accounts found. Make sure your account has access to ad accounts in Business Manager.
          </p>
        )}
      </div>

      {/* Page Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Facebook Page (Optional)
        </label>
        <select
          value={selectedPage}
          onChange={(e) => setSelectedPage(e.target.value)}
          className="input"
        >
          <option value="">No page selected</option>
          {pages.map((page) => (
            <option key={page.id} value={page.id}>
              {page.name}
              {page.instagram_business_account && ` (+ Instagram: @${page.instagram_business_account.username})`}
            </option>
          ))}
        </select>
        {pages.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">
            No pages found. Make sure your account manages Facebook Pages.
          </p>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn btn-primary w-full"
      >
        {saving ? 'Saving...' : 'Save Selection'}
      </button>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> You can change these selections anytime. Ad account is required for lead ads sync.
          Page is required for message sync.
        </p>
      </div>
    </div>
  );
}

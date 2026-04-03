'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Check, ChevronRight, FileText } from 'lucide-react';
import FacebookLeadForms from './FacebookLeadForms';

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
  const [pagesError, setPagesError] = useState('');
  const [activeSection, setActiveSection] = useState<'main' | 'lead-forms'>('main');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    setPagesError('');
    try {
      const response = await fetch(`/api/integrations/facebook/accounts?accountId=${accountId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load accounts');
      }

      setAdAccounts(data.adAccounts || []);
      setPages(data.pages || []);

      if (data.debug?.pagesError) {
        setPagesError(data.debug.pagesError.message || JSON.stringify(data.debug.pagesError));
      }
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

  // Drill-in: Lead Forms subsection
  if (activeSection === 'lead-forms') {
    return <FacebookLeadForms accountId={accountId} onBack={() => setActiveSection('main')} />;
  }

  if (loading) {
    return (
      <div className="bg-gray-50 dark:bg-white/[0.02] border border-gray-200/60 dark:border-white/5 rounded-lg p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading your Facebook accounts…</p>
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
          <div className="mt-1 space-y-1">
            {pagesError ? (
              <p className="text-xs text-red-500">API error: {pagesError}</p>
            ) : (
              <p className="text-xs text-gray-500">No pages found.</p>
            )}
            <p className="text-xs text-amber-600 dark:text-amber-400">
              To fix: disconnect and reconnect Facebook, then make sure to select your pages when Facebook asks.
            </p>
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn btn-primary w-full"
      >
        {saving ? 'Saving...' : 'Save Selection'}
      </button>

      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200/60 dark:border-blue-500/20 rounded-lg p-3">
        <p className="text-xs text-blue-800 dark:text-blue-300">
          <strong>Note:</strong> Ad account is required for lead ads sync. Page is required for lead form sync.
        </p>
      </div>

      {/* Lead Forms subsection nav — only shown once a page is selected */}
      {(selectedPage || currentPageId) && (
        <button
          onClick={() => setActiveSection('lead-forms')}
          className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200/60 dark:border-white/5 bg-white dark:bg-white/[0.02] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Lead Forms</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Select forms and map fields</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
        </button>
      )}
    </div>
  );
}

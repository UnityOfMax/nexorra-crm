'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Building2, Check } from 'lucide-react';
import type { Account } from '@/types';

interface AccountSwitcherDropdownProps {
  currentAccount: Account;
  accounts: Account[];
  clientAccounts: Account[];
  onAccountSwitch: (accountId: string) => void;
}

export default function AccountSwitcherDropdown({
  currentAccount,
  accounts,
  clientAccounts,
  onAccountSwitch
}: AccountSwitcherDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // All accounts (agency + clients)
  const allAccounts = [...accounts, ...clientAccounts];

  const handleAccountSelect = (accountId: string) => {
    setIsOpen(false);
    onAccountSwitch(accountId);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            <Building2 className="w-5 h-5 text-primary-600" />
          </div>
          <div className="text-left min-w-0 flex-1">
            <div className="text-sm font-semibold text-gray-900 truncate">
              {currentAccount.name}
            </div>
            <div className="text-xs text-gray-500">
              {currentAccount.account_type === 'agency' ? 'Agency Account' : 'Client Account'}
            </div>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto">
          {/* Agency Accounts Section */}
          {accounts.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200">
                AGENCY
              </div>
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleAccountSelect(account.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Building2 className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    <div className="text-left min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {account.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {account.slug}
                      </div>
                    </div>
                  </div>
                  {currentAccount.id === account.id && (
                    <Check className="w-4 h-4 text-primary-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Client Accounts Section */}
          {clientAccounts.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200">
                SUB-ACCOUNTS ({clientAccounts.length})
              </div>
              {clientAccounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleAccountSelect(account.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-purple-100 rounded flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-primary-700">
                        {account.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {account.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {account.slug}
                      </div>
                    </div>
                  </div>
                  {currentAccount.id === account.id && (
                    <Check className="w-4 h-4 text-primary-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* No Accounts */}
          {allAccounts.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              No accounts available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

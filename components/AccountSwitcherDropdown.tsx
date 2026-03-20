'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Building2, Check, LogOut, Search } from 'lucide-react';
import type { Account } from '@/types';

interface AccountSwitcherDropdownProps {
  currentAccount: Account;
  accounts: Account[];
  clientAccounts: Account[];
  onAccountSwitch: (accountId: string) => void;
  onSignOut: () => void;
}

export default function AccountSwitcherDropdown({
  currentAccount,
  accounts,
  clientAccounts,
  onAccountSwitch,
  onSignOut,
}: AccountSwitcherDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allAccounts = [...accounts, ...clientAccounts];

  const searchLower = search.toLowerCase().trim();
  const filteredAgencyAccounts = accounts.filter(a =>
    !searchLower || a.name.toLowerCase().includes(searchLower) || (a.slug && a.slug.toLowerCase().includes(searchLower))
  );
  const filteredClientAccounts = clientAccounts.filter(a =>
    !searchLower || a.name.toLowerCase().includes(searchLower) || (a.slug && a.slug.toLowerCase().includes(searchLower))
  );

  const handleAccountSelect = (accountId: string) => {
    setIsOpen(false);
    setSearch('');
    onAccountSwitch(accountId);
  };

  const handleSignOut = () => {
    setIsOpen(false);
    setSearch('');
    onSignOut();
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
              {currentAccount.account_type === 'agency' ? 'Agency Account' : 'Sub-Account'}
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
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/10 rounded-lg shadow-lg z-50 max-h-[400px] flex flex-col">
          {/* Search input */}
          <div className="px-3 py-2 border-b border-gray-200 dark:border-white/8 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search accounts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-[#3a3a3c] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                autoFocus
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
          {/* Agency Accounts Section */}
          {filteredAgencyAccounts.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/8">
                AGENCY
              </div>
              {filteredAgencyAccounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleAccountSelect(account.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-white/5 last:border-b-0"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Building2 className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    <div className="text-left min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {account.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{account.slug}</div>
                    </div>
                  </div>
                  {currentAccount.id === account.id && (
                    <Check className="w-4 h-4 text-primary-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Sub-Accounts Section */}
          {filteredClientAccounts.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/8">
                SUB-ACCOUNTS ({filteredClientAccounts.length})
              </div>
              {filteredClientAccounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleAccountSelect(account.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-white/5 last:border-b-0"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-primary-700 dark:text-primary-400">
                        {account.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {account.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{account.slug}</div>
                    </div>
                  </div>
                  {currentAccount.id === account.id && (
                    <Check className="w-4 h-4 text-primary-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {filteredAgencyAccounts.length === 0 && filteredClientAccounts.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              {search ? 'No matching accounts' : 'No accounts available'}
            </div>
          )}
          </div>

          {/* Sign Out — always at the bottom */}
          <div className="border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

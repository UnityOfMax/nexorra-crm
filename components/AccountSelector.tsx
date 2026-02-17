'use client';

import { Account } from '@/types';
import { ChevronDown, Building } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface AccountSelectorProps {
  accounts: Account[];
  currentAccount: Account;
  onAccountChange: (account: Account) => void;
}

export default function AccountSelector({ accounts, currentAccount, onAccountChange }: AccountSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (accounts.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
        <Building className="w-5 h-5 text-gray-600" />
        <span className="font-medium text-gray-900">{currentAccount.name}</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Building className="w-5 h-5 text-gray-600" />
        <span className="font-medium text-gray-900">{currentAccount.name}</span>
        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
            Switch Account
          </div>
          {accounts.map((account) => (
            <button
              key={account.id}
              onClick={() => {
                onAccountChange(account);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
                account.id === currentAccount.id ? 'bg-primary-50 text-primary-700' : 'text-gray-900'
              }`}
            >
              <div className="font-medium">{account.name}</div>
              <div className="text-xs text-gray-500 mt-1">
                {account.account_type === 'agency' ? 'Agency Account' : 'Client Account'}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

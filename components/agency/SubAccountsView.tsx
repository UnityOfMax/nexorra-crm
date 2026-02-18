'use client';

import { useState, useEffect } from 'react';
import { Plus, Users, Search, Building2, Globe, MapPin, Mail } from 'lucide-react';
import CreateSubAccountModal from './CreateSubAccountModal';
import ClientDetailModal from './ClientDetailModal';

interface SubAccountsViewProps {
  agencyId: string;
  userId: string;
  onRefreshClientAccounts?: () => void;
}

interface SubAccount {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  settings?: any;
  created_at: string;
  members?: { count: number }[];
}

export default function SubAccountsView({ agencyId, userId, onRefreshClientAccounts }: SubAccountsViewProps) {
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<SubAccount | null>(null);

  useEffect(() => {
    loadSubAccounts();
  }, [agencyId]);

  const loadSubAccounts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/agency/clients?agencyId=${agencyId}&userId=${userId}`);
      const data = await response.json();

      if (response.ok) {
        setSubAccounts(data.clients || []);
      }
    } catch (error) {
      console.error('Error loading sub-accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAccounts = subAccounts.filter(account =>
    account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.settings?.location?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.settings?.location?.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sub-Accounts</h2>
          <p className="text-gray-600 mt-1">Manage all your sub-accounts and their users</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Sub-Account
        </button>
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, slug, or location..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Sub-Accounts</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{subAccounts.length}</p>
            </div>
            <div className="p-3 bg-primary-100 rounded-lg">
              <Building2 className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {subAccounts.reduce((sum, c) => sum + (c.members?.[0]?.count || 0), 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active This Month</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{subAccounts.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Account Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500">Loading sub-accounts...</div>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No sub-accounts found' : 'No sub-accounts yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery
              ? 'Try a different search term'
              : 'Get started by creating your first sub-account'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Sub-Account
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAccounts.map((account) => {
            const location = account.settings?.location;
            return (
              <div
                key={account.id}
                onClick={() => setSelectedAccount(account)}
                className="card hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {account.name}
                    </h3>
                    <p className="text-sm text-gray-600">/{account.slug}</p>
                  </div>
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <Building2 className="w-5 h-5 text-primary-600" />
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {location && (
                    <>
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                        {location.first_name} {location.last_name}
                      </div>
                      {location.email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                          {location.email}
                        </div>
                      )}
                      {location.address && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{location.address}</span>
                        </div>
                      )}
                    </>
                  )}
                  {account.domain && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Globe className="w-4 h-4 mr-2 flex-shrink-0" />
                      {account.domain}
                    </div>
                  )}
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                    {account.members?.[0]?.count || 0} users
                  </div>
                </div>

                {/* Auto-generated email */}
                {account.settings?.from_email && (
                  <div className="mb-4 px-3 py-2 bg-gray-50 rounded text-xs text-gray-600">
                    Sending as: {account.settings.from_email}
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Created {new Date(account.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAccount(account);
                    }}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    Manage →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateSubAccountModal
          agencyId={agencyId}
          userId={userId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadSubAccounts();
            onRefreshClientAccounts?.();
          }}
        />
      )}

      {selectedAccount && (
        <ClientDetailModal
          client={selectedAccount}
          agencyId={agencyId}
          userId={userId}
          onClose={() => setSelectedAccount(null)}
          onUpdate={() => {
            loadSubAccounts();
            onRefreshClientAccounts?.();
          }}
        />
      )}
    </div>
  );
}

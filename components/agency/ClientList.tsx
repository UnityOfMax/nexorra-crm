'use client';

import { useState, useEffect } from 'react';
import { Plus, Users, Settings, Mail, Search, Building2, Globe } from 'lucide-react';
import CreateClientModal from './CreateClientModal';
import ClientDetailModal from './ClientDetailModal';

interface ClientListProps {
  agencyId: string;
  userId: string;
}

interface Client {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  created_at: string;
  members?: { count: number }[];
  owner?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export default function ClientList({ agencyId, userId }: ClientListProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    loadClients();
  }, [agencyId]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/agency/clients?agencyId=${agencyId}&userId=${userId}`);
      const data = await response.json();

      if (response.ok) {
        setClients(data.clients || []);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Client Accounts</h2>
          <p className="text-gray-600 mt-1">Manage all your client accounts</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Client
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
            placeholder="Search clients by name or slug..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Clients</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{clients.length}</p>
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
                {clients.reduce((sum, c) => sum + (c.members?.[0]?.count || 0), 0)}
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
              <p className="text-3xl font-bold text-gray-900 mt-1">{clients.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Client Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500">Loading clients...</div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No clients found' : 'No clients yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery
              ? 'Try a different search term'
              : 'Get started by creating your first client account'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Client
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              onClick={() => setSelectedClient(client)}
              className="card hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {client.name}
                  </h3>
                  <p className="text-sm text-gray-600">/{client.slug}</p>
                </div>
                <div className="p-2 bg-primary-50 rounded-lg">
                  <Building2 className="w-5 h-5 text-primary-600" />
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {client.domain && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Globe className="w-4 h-4 mr-2" />
                    {client.domain}
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  {client.members?.[0]?.count || 0} users
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Created {new Date(client.created_at).toLocaleDateString()}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedClient(client);
                  }}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  Manage →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateClientModal
          agencyId={agencyId}
          userId={userId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadClients();
          }}
        />
      )}

      {selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          agencyId={agencyId}
          userId={userId}
          onClose={() => setSelectedClient(null)}
          onUpdate={loadClients}
        />
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { X, Users, Mail, Settings, ExternalLink, UserPlus } from 'lucide-react';
import InviteUserModal from './InviteUserModal';

interface ClientDetailModalProps {
  client: any;
  agencyId: string;
  userId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ClientDetailModal({
  client,
  agencyId,
  userId,
  onClose,
  onUpdate
}: ClientDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'settings'>('overview');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsersAndInvitations();
    }
  }, [activeTab]);

  const loadUsersAndInvitations = async () => {
    setLoadingUsers(true);
    try {
      // Load users (members)
      const usersResponse = await fetch(`/api/agency/clients/${client.id}/users?agencyId=${agencyId}`);
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
      }

      // Load pending invitations
      const invitationsResponse = await fetch(`/api/invitations?accountId=${client.id}`);
      if (invitationsResponse.ok) {
        const invitationsData = await invitationsResponse.json();
        setInvitations(invitationsData.invitations?.filter((inv: any) => inv.status === 'pending') || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSwitchToAccount = () => {
    // Redirect to client account
    window.location.href = `/?accountId=${client.id}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{client.name}</h2>
            <p className="text-sm text-gray-600 mt-1">/{client.slug}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSwitchToAccount}
              className="btn btn-secondary flex items-center gap-2 text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Open Account
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-6">
            {[
              { id: 'overview', label: 'Overview', icon: Settings },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="card bg-gray-50">
                  <p className="text-sm text-gray-600 mb-1">Client ID</p>
                  <p className="text-sm font-mono text-gray-900">{client.id}</p>
                </div>
                <div className="card bg-gray-50">
                  <p className="text-sm text-gray-600 mb-1">Created</p>
                  <p className="text-sm text-gray-900">
                    {new Date(client.created_at).toLocaleDateString()}
                  </p>
                </div>
                {client.domain && (
                  <div className="card bg-gray-50">
                    <p className="text-sm text-gray-600 mb-1">Custom Domain</p>
                    <p className="text-sm text-gray-900">{client.domain}</p>
                  </div>
                )}
                <div className="card bg-gray-50">
                  <p className="text-sm text-gray-600 mb-1">Total Users</p>
                  <p className="text-sm text-gray-900">{client.members?.[0]?.count || 0}</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Quick Actions:</strong> Switch to this account to manage their data,
                  or use the Users tab to invite new team members.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="btn btn-primary flex items-center gap-2 text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite User
                </button>
              </div>

              {loadingUsers ? (
                <div className="text-center py-8 text-gray-500">Loading users...</div>
              ) : (
                <>
                  {/* Active Users */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Active Users ({users.length})</h4>
                    {users.length === 0 ? (
                      <div className="card p-6 text-center">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-600">No users yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {users.map((user) => (
                          <div key={user.id} className="card p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                <span className="text-primary-600 font-semibold">
                                  {user.user?.full_name?.[0] || user.user?.email[0].toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {user.user?.full_name || 'Unnamed User'}
                                </p>
                                <p className="text-sm text-gray-600">{user.user?.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium">
                                {user.role.replace(/_/g, ' ')}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                user.status === 'active'
                                  ? 'bg-green-50 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {user.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pending Invitations */}
                  {invitations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        Pending Invitations ({invitations.length})
                      </h4>
                      <div className="space-y-2">
                        {invitations.map((invitation) => (
                          <div key={invitation.id} className="card p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Mail className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="font-medium text-gray-900">{invitation.email}</p>
                                <p className="text-sm text-gray-600">
                                  Invited {new Date(invitation.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium">
                                {invitation.role.replace(/_/g, ' ')}
                              </span>
                              <span className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-medium">
                                Pending
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <p className="text-gray-600">Client settings coming soon...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <button onClick={onClose} className="btn btn-secondary w-full">
            Close
          </button>
        </div>
      </div>

      {/* Invite User Modal */}
      {showInviteModal && (
        <InviteUserModal
          accountId={client.id}
          accountName={client.name}
          invitedBy={userId}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            loadUsersAndInvitations();
          }}
        />
      )}
    </div>
  );
}

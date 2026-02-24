'use client';

import { useState, useEffect } from 'react';
import { Contact } from '@/types';
import { supabase } from '@/lib/supabase-browser';
import { Plus, Mail, Phone, Search, Filter, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import ContactSidePanel from './ContactSidePanel';

interface ContactsListProps {
  contacts: Contact[];
  accountId: string;
  onRefresh: () => void;
  onContactClick?: (contactId: string) => void;
  onSmsClick?: (contact: Contact) => void;
  onEmailClick?: (contact: Contact) => void;
}

export default function ContactsList({
  contacts,
  accountId,
  onRefresh,
  onContactClick,
  onSmsClick,
  onEmailClick,
}: ContactsListProps) {
  const [showModal, setShowModal] = useState(false);
  const [panelContact, setPanelContact] = useState<Contact | null>(null);
  const [localContacts, setLocalContacts] = useState<Contact[]>(contacts);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    status: 'lead',
  });
  const [loading, setLoading] = useState(false);

  // Keep local contacts in sync with prop changes
  useEffect(() => {
    if (!panelContact) {
      setLocalContacts(contacts);
    }
  }, [contacts, panelContact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('contacts').insert([
        { ...formData, account_id: accountId },
      ]);
      if (error) throw error;
      setShowModal(false);
      setFormData({ first_name: '', last_name: '', email: '', phone: '', company: '', status: 'lead' });
      onRefresh();
    } catch (error: any) {
      toast.error('Error creating contact: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePanelSave = (updated: Contact) => {
    setLocalContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setPanelContact(updated);
    onRefresh();
  };

  const handlePanelDelete = (contactId: string) => {
    setLocalContacts((prev) => prev.filter((c) => c.id !== contactId));
    setPanelContact(null);
    onRefresh();
  };

  const filteredContacts = localContacts.filter((contact) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contact.first_name?.toLowerCase().includes(searchLower) ||
      contact.last_name?.toLowerCase().includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower) ||
      contact.company?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Contacts</h2>
          <p className="text-gray-600 mt-1">{contacts.length} total contacts</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {/* Search and filters */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <button className="btn btn-secondary flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      {/* Contacts table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Info</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? 'No contacts match your search' : 'No contacts yet. Add your first contact!'}
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setPanelContact(contact)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {contact.first_name} {contact.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {contact.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            {contact.email}
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            {contact.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {contact.company || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          contact.status === 'customer'
                            ? 'bg-green-100 text-green-700'
                            : contact.status === 'lead'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {contact.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(contact.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSmsClick?.(contact)}
                          className="text-primary-600 hover:text-primary-700 p-1"
                          title="Send SMS"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEmailClick?.(contact)}
                          className="text-primary-600 hover:text-primary-700 p-1"
                          title="Send Email"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contact side panel */}
      <ContactSidePanel
        contact={panelContact}
        accountId={accountId}
        onClose={() => setPanelContact(null)}
        onSave={handlePanelSave}
        onDelete={handlePanelDelete}
        onSmsClick={(c) => { setPanelContact(null); onSmsClick?.(c); }}
        onEmailClick={(c) => { setPanelContact(null); onEmailClick?.(c); }}
      />

      {/* Add contact modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Add New Contact</h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input"
                >
                  <option value="lead">Lead</option>
                  <option value="customer">Customer</option>
                  <option value="lost">Lost</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                  {loading ? 'Creating...' : 'Create Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

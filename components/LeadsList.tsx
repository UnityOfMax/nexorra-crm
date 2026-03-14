'use client';

import { useState, useEffect, useCallback } from 'react';
import { Target, RefreshCw, Filter, ChevronLeft, ChevronRight, ExternalLink, Check, Clock, Globe, Trash2, X, Pencil, CheckSquare, Square, MinusSquare, Instagram } from 'lucide-react';

interface Lead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  profile_url: string | null;
  profile_picture_url: string | null;
  country: 'US' | 'CA';
  state_province: string;
  city: string;
  timezone: 'EST' | 'CST' | 'MST' | 'PST' | null;
  source_brokerage: string;
  scraped_at: string;
  pushed_to_instantly: boolean;
  instantly_campaign_id: string | null;
  instagram_handle: string | null;
  instagram_dm_sent: boolean;
  instagram_status: string;
  created_at: string;
}

const BROKERAGES: Record<string, string> = {
  kw: 'Keller Williams',
  remax: 'RE/MAX',
  exp: 'eXp Realty',
  century21: 'Century 21',
  coldwell: 'Coldwell Banker',
  coldwellbanker: 'Coldwell Banker',
  bhhs: 'BHHS',
  compass: 'Compass',
  howardhanna: 'Howard Hanna',
  sothebys: "Sotheby's",
  royallepage: 'Royal LePage',
  sutton: 'Sutton',
  remaxca: 'RE/MAX Canada',
  remax_ca: 'RE/MAX Canada',
};

const TIMEZONES = ['EST', 'CST', 'MST', 'PST'];
const PAGE_SIZE = 100;

export default function LeadsList() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);

  // Filters
  const [filterPushed, setFilterPushed] = useState<'all' | 'true' | 'false'>('all');
  const [filterTimezone, setFilterTimezone] = useState('');
  const [filterBrokerage, setFilterBrokerage] = useState('');
  const [filterCountry, setFilterCountry] = useState('');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Edit modal
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchLeads = useCallback(async (off = offset) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(off) });
    if (filterPushed !== 'all') params.set('pushed', filterPushed);
    if (filterTimezone) params.set('timezone', filterTimezone);
    if (filterBrokerage) params.set('brokerage', filterBrokerage);
    if (filterCountry) params.set('country', filterCountry);

    try {
      const res = await fetch(`/api/leads?${params}`);
      if (res.ok) {
        const json = await res.json();
        setLeads(json.leads || []);
        setTotal(json.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [offset, filterPushed, filterTimezone, filterBrokerage, filterCountry]);

  useEffect(() => {
    setOffset(0);
    setSelectedIds(new Set());
    fetchLeads(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterPushed, filterTimezone, filterBrokerage, filterCountry]);

  useEffect(() => {
    fetchLeads(offset);
    setSelectedIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  const handleMarkPushed = async (lead: Lead) => {
    const res = await fetch(`/api/leads?id=${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pushed_to_instantly: true }),
    });
    if (res.ok) {
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, pushed_to_instantly: true } : l));
    }
  };

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)));
    }
  };

  // Single delete
  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/leads?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setLeads(prev => prev.filter(l => l.id !== id));
      setTotal(prev => prev - 1);
      setDeleteConfirm(null);
      selectedIds.delete(id);
      setSelectedIds(new Set(selectedIds));
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setLeads(prev => prev.filter(l => !selectedIds.has(l.id)));
        setTotal(prev => prev - selectedIds.size);
        setSelectedIds(new Set());
      }
    } finally {
      setBulkDeleting(false);
    }
  };

  // Edit handlers
  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setEditForm({
      full_name: lead.full_name,
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      city: lead.city,
      state_province: lead.state_province,
      source_brokerage: lead.source_brokerage,
      profile_url: lead.profile_url,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingLead) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads?id=${editingLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const { lead } = await res.json();
        setLeads(prev => prev.map(l => l.id === editingLead.id ? lead : l));
        setEditingLead(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const timezoneColor: Record<string, string> = {
    EST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    CST: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    MST: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    PST: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  };

  const allSelected = leads.length > 0 && selectedIds.size === leads.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < leads.length;

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
            <Target className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Scraped Leads</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {total.toLocaleString()} total · Jeff-scraped brokerage leads
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchLeads(offset)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/8 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Filter:</span>
        </div>

        <select
          value={filterPushed}
          onChange={e => setFilterPushed(e.target.value as 'all' | 'true' | 'false')}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#3a3a3c] text-gray-700 dark:text-gray-300"
        >
          <option value="all">All Status</option>
          <option value="false">Not Pushed</option>
          <option value="true">Pushed to Instantly</option>
        </select>

        <select
          value={filterTimezone}
          onChange={e => setFilterTimezone(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#3a3a3c] text-gray-700 dark:text-gray-300"
        >
          <option value="">All Timezones</option>
          {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
        </select>

        <select
          value={filterBrokerage}
          onChange={e => setFilterBrokerage(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#3a3a3c] text-gray-700 dark:text-gray-300"
        >
          <option value="">All Brokerages</option>
          {Object.entries(BROKERAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <select
          value={filterCountry}
          onChange={e => setFilterCountry(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#3a3a3c] text-gray-700 dark:text-gray-300"
        >
          <option value="">US + CA</option>
          <option value="US">United States</option>
          <option value="CA">Canada</option>
        </select>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl">
          <span className="text-sm font-medium text-red-700 dark:text-red-300">
            {selectedIds.size} lead{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {bulkDeleting ? 'Deleting...' : `Delete ${selectedIds.size}`}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/80 dark:bg-white/3">
                <th className="px-3 py-3 w-10">
                  <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {allSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    ) : someSelected ? (
                      <MinusSquare className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Agent</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Location</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">TZ</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Brokerage</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Instagram</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Scraped</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-gray-400 dark:text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading leads…
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-gray-400 dark:text-gray-500">
                    <Target className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No leads yet</p>
                    <p className="text-xs mt-1">Jeff will populate this once he starts scraping</p>
                  </td>
                </tr>
              ) : (
                leads.map(lead => (
                  <tr
                    key={lead.id}
                    className={`border-b border-gray-50 dark:border-gray-700/30 hover:bg-gray-50/60 dark:hover:bg-white/3 transition-colors ${
                      selectedIds.has(lead.id) ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-3">
                      <button onClick={() => toggleSelect(lead.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        {selectedIds.has(lead.id) ? (
                          <CheckSquare className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {/* Agent */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {lead.profile_picture_url ? (
                          <img
                            src={lead.profile_picture_url}
                            alt={lead.full_name}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                              {lead.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{lead.full_name}</p>
                          <span className="text-xs text-gray-400">{lead.country}</span>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {lead.email && (
                          <p className="text-gray-700 dark:text-gray-300 text-xs">{lead.email}</p>
                        )}
                        {lead.phone && (
                          <p className="text-gray-500 dark:text-gray-400 text-xs">{lead.phone}</p>
                        )}
                        {!lead.email && !lead.phone && (
                          <p className="text-gray-300 dark:text-gray-500 text-xs italic">No contact info</p>
                        )}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-gray-700 dark:text-gray-300">{lead.city}</p>
                      <p className="text-xs text-gray-400">{lead.state_province}</p>
                    </td>

                    {/* Timezone */}
                    <td className="px-4 py-3">
                      {lead.timezone ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${timezoneColor[lead.timezone] || 'bg-gray-100 text-gray-600'}`}>
                          {lead.timezone}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-500 text-xs">—</span>
                      )}
                    </td>

                    {/* Brokerage */}
                    <td className="px-4 py-3">
                      <span className="text-gray-700 dark:text-gray-300 text-xs">
                        {BROKERAGES[lead.source_brokerage] || lead.source_brokerage}
                      </span>
                    </td>

                    {/* Instagram */}
                    <td className="px-4 py-3">
                      {lead.instagram_handle ? (
                        <div className="flex items-center gap-1.5">
                          <Instagram className="w-3.5 h-3.5 text-pink-500" />
                          <span className="text-xs text-gray-700 dark:text-gray-300">@{lead.instagram_handle}</span>
                          {lead.instagram_dm_sent && (
                            <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              lead.instagram_status === 'replied' || lead.instagram_status === 'engaged'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : lead.instagram_status === 'booked'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-gray-400'
                            }`}>
                              {lead.instagram_status === 'dm_sent' ? 'DM\'d' : lead.instagram_status}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                      )}
                    </td>

                    {/* Scraped at */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {new Date(lead.scraped_at).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {lead.pushed_to_instantly ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                          <Check className="w-3.5 h-3.5" />
                          Pushed
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Pending</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {lead.profile_url && (
                          <a
                            href={lead.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
                            title="View profile"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => openEdit(lead)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Edit lead"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {deleteConfirm === lead.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(lead.id)}
                              className="px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(lead.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Delete lead"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!lead.pushed_to_instantly && (
                          <button
                            onClick={() => handleMarkPushed(lead)}
                            className="px-2 py-1 text-xs font-medium rounded-lg bg-primary-500/10 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400 hover:bg-primary-500/20 transition-colors whitespace-nowrap"
                            title="Mark as pushed to Instantly"
                          >
                            Push
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700/60">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total.toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400 px-2">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= total}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingLead && (
        <div className="modal-overlay">
          <div className="modal-content w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700/60">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Lead</h3>
              <button
                onClick={() => setEditingLead(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/8"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">First Name</label>
                  <input
                    value={editForm.first_name || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#3a3a3c] text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Last Name</label>
                  <input
                    value={editForm.last_name || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#3a3a3c] text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Full Name</label>
                <input
                  value={editForm.full_name || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#3a3a3c] text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email</label>
                <input
                  value={editForm.email || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value || null }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#3a3a3c] text-gray-900 dark:text-gray-100"
                  placeholder="null if not available"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Phone</label>
                <input
                  value={editForm.phone || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value || null }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#3a3a3c] text-gray-900 dark:text-gray-100"
                  placeholder="null if not available"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">City</label>
                  <input
                    value={editForm.city || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#3a3a3c] text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">State/Province</label>
                  <input
                    value={editForm.state_province || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, state_province: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#3a3a3c] text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Profile URL</label>
                <input
                  value={editForm.profile_url || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, profile_url: e.target.value || null }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#3a3a3c] text-gray-900 dark:text-gray-100"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Brokerage</label>
                <select
                  value={editForm.source_brokerage || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, source_brokerage: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#3a3a3c] text-gray-900 dark:text-gray-100"
                >
                  {Object.entries(BROKERAGES).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-white/3">
              <button
                onClick={() => setEditingLead(null)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

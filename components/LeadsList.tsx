'use client';

import { useState, useEffect, useCallback } from 'react';

interface Lead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  profile_url: string | null;
  profile_picture_url: string | null;
  country: 'US' | 'CA';
  state_province: string;
  city: string;
  timezone: 'EST' | 'CST' | 'MST' | 'PST' | null;
  source_brokerage: string;
  lead_category: 'email' | 'instagram' | 'calling';
  scraped_at: string;
  pushed_to_instantly: boolean;
  instantly_campaign_id: string | null;
  instagram_handle: string | null;
  instagram_dm_sent: boolean;
  instagram_dm_account: string | null;
  instagram_status: string;
  csv_batch_id: string | null;
  csv_downloaded_at: string | null;
  created_at: string;
}

type LeadCategory = 'email' | 'instagram' | 'calling';

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

const TZ_COLORS: Record<string, string> = {
  EST: 'var(--blue)',
  CST: 'var(--green)',
  MST: 'var(--amber)',
  PST: 'var(--violet)',
};

export default function LeadsList() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [category, setCategory] = useState<LeadCategory>('email');
  const [categoryCounts, setCategoryCounts] = useState<Record<LeadCategory, number>>({ email: 0, instagram: 0, calling: 0 });
  const [csvExporting, setCsvExporting] = useState(false);
  const [tzCounts, setTzCounts] = useState<Record<string, number>>({ EST: 0, CST: 0, MST: 0, PST: 0 });
  const [tzAvail, setTzAvail] = useState<Record<string, number>>({ EST: 0, CST: 0, MST: 0, PST: 0 });
  const [tzAvailLoaded, setTzAvailLoaded] = useState(false);
  const [filterPushed, setFilterPushed] = useState<'all' | 'true' | 'false'>('all');
  const [filterTimezone, setFilterTimezone] = useState('');
  const [filterBrokerage, setFilterBrokerage] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchLeads = useCallback(async (off = offset) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(off), category });
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
        setCategoryCounts(prev => ({ ...prev, [category]: json.total || 0 }));
      }
    } finally { setLoading(false); }
  }, [offset, category, filterPushed, filterTimezone, filterBrokerage, filterCountry]);

  useEffect(() => {
    const fetchCounts = async () => {
      for (const cat of ['email', 'instagram', 'calling'] as LeadCategory[]) {
        const res = await fetch(`/api/leads?category=${cat}&limit=1`);
        if (res.ok) {
          const json = await res.json();
          setCategoryCounts(prev => ({ ...prev, [cat]: json.total || 0 }));
        }
      }
    };
    fetchCounts();
  }, []);

  useEffect(() => {
    setOffset(0); setSelectedIds(new Set()); fetchLeads(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, filterPushed, filterTimezone, filterBrokerage, filterCountry]);

  useEffect(() => {
    if (category !== 'calling' || tzAvailLoaded) return;
    const load = async () => {
      const res = await fetch('/api/leads/csv-export', { method: 'HEAD' });
      if (res.ok) {
        try {
          const counts = JSON.parse(res.headers.get('X-TZ-Counts') || '{}');
          setTzAvail(counts);
          setTzCounts({ EST: Math.min(counts.EST || 0, 200), CST: Math.min(counts.CST || 0, 200), MST: Math.min(counts.MST || 0, 200), PST: Math.min(counts.PST || 0, 200) });
        } catch {}
      }
      setTzAvailLoaded(true);
    };
    load();
  }, [category, tzAvailLoaded]);

  useEffect(() => { fetchLeads(offset); setSelectedIds(new Set()); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  const handleCsvExport = async () => {
    const tot = Object.values(tzCounts).reduce((a, b) => a + b, 0);
    if (tot === 0) return;
    setCsvExporting(true);
    try {
      const params = new URLSearchParams();
      for (const [tz, count] of Object.entries(tzCounts)) { if (count > 0) params.set(tz, String(count)); }
      const res = await fetch(`/api/leads/csv-export?${params}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const cd = res.headers.get('content-disposition') || '';
        a.download = cd.match(/filename=([^\s;]+)/)?.[1] || 'calling-leads.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setTzAvailLoaded(false); fetchLeads(offset);
      }
    } finally { setCsvExporting(false); }
  };

  const handleMarkPushed = async (lead: Lead) => {
    const res = await fetch(`/api/leads?id=${lead.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pushed_to_instantly: true }) });
    if (res.ok) setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, pushed_to_instantly: true } : l));
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => setSelectedIds(selectedIds.size === leads.length ? new Set() : new Set(leads.map(l => l.id)));

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/leads?id=${id}`, { method: 'DELETE' });
    if (res.ok) { setLeads(prev => prev.filter(l => l.id !== id)); setTotal(prev => prev - 1); setDeleteConfirm(null); selectedIds.delete(id); setSelectedIds(new Set(selectedIds)); }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      const res = await fetch('/api/leads', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: Array.from(selectedIds) }) });
      if (res.ok) { setLeads(prev => prev.filter(l => !selectedIds.has(l.id))); setTotal(prev => prev - selectedIds.size); setSelectedIds(new Set()); }
    } finally { setBulkDeleting(false); }
  };

  const openEdit = (lead: Lead) => { setEditingLead(lead); setEditForm({ full_name: lead.full_name, first_name: lead.first_name, last_name: lead.last_name, email: lead.email, phone: lead.phone, city: lead.city, state_province: lead.state_province, source_brokerage: lead.source_brokerage, profile_url: lead.profile_url }); };
  const handleSaveEdit = async () => {
    if (!editingLead) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads?id=${editingLead.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
      if (res.ok) { const { lead } = await res.json(); setLeads(prev => prev.map(l => l.id === editingLead.id ? lead : l)); setEditingLead(null); }
    } finally { setSaving(false); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const allSelected = leads.length > 0 && selectedIds.size === leads.length;

  const catTabs = [
    { key: 'email' as LeadCategory, label: 'Email leads' },
    { key: 'instagram' as LeadCategory, label: 'Instagram leads' },
    { key: 'calling' as LeadCategory, label: 'Calling leads' },
  ];

  const kpis = {
    email: [
      { l: 'Email leads', v: categoryCounts.email.toLocaleString(), d: 'Jeff-scraped brokerages' },
      { l: 'Hot (pushed)', v: leads.filter(l => l.pushed_to_instantly).length.toString(), d: 'of current page' },
      { l: 'Not pushed', v: leads.filter(l => !l.pushed_to_instantly).length.toString(), d: 'pending upload' },
      { l: 'Brokerages', v: Array.from(new Set(leads.map(l => l.source_brokerage))).length.toString(), d: 'unique sources' },
    ],
    instagram: [
      { l: 'Instagram leads', v: categoryCounts.instagram.toLocaleString(), d: 'with @handle' },
      { l: 'DMs sent', v: leads.filter(l => l.instagram_dm_sent).length.toString(), d: 'of current page' },
      { l: 'Replied', v: leads.filter(l => l.instagram_status === 'replied').length.toString(), d: 'this page' },
      { l: 'Booked', v: leads.filter(l => l.instagram_status === 'booked').length.toString(), d: 'this page' },
    ],
    calling: [
      { l: 'Calling leads', v: categoryCounts.calling.toLocaleString(), d: 'with phone numbers' },
      { l: 'EST available', v: (tzAvail.EST || 0).toString(), d: 'not yet exported' },
      { l: 'CST available', v: (tzAvail.CST || 0).toString(), d: 'not yet exported' },
      { l: 'PST + MST', v: ((tzAvail.PST || 0) + (tzAvail.MST || 0)).toString(), d: 'not yet exported' },
    ],
  }[category];

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 1600, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }}>Leads</h1>
          <div style={{ fontSize: 13.5, color: 'var(--ink-3)' }}>Inbound leads across email, Instagram, and calling.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => fetchLeads(offset)} style={{ padding: '8px 14px', fontSize: 13, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper-2)', color: 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: loading ? 'spin 1s linear infinite' : undefined }}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
          <button onClick={handleBulkDelete} disabled={selectedIds.size === 0 || bulkDeleting} style={{ padding: '8px 14px', fontSize: 13, borderRadius: 8, border: 'none', background: selectedIds.size > 0 ? 'var(--rose)' : 'var(--paper-3)', color: selectedIds.size > 0 ? 'white' : 'var(--ink-3)', cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6 }}>
            {bulkDeleting ? 'Deleting…' : selectedIds.size > 0 ? `Delete ${selectedIds.size}` : 'Delete selected'}
          </button>
        </div>
      </div>

      {/* Source Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, padding: 4, background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 10, overflowX: 'auto' }}>
        {catTabs.map(t => (
          <button key={t.key} onClick={() => setCategory(t.key)} style={{
            flex: '1 1 auto', padding: '8px 14px', borderRadius: 7, fontSize: 13,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: category === t.key ? 'var(--paper)' : 'transparent',
            color: category === t.key ? 'var(--ink)' : 'var(--ink-3)',
            border: category === t.key ? '1px solid var(--line)' : '1px solid transparent',
            fontWeight: category === t.key ? 500 : 400, whiteSpace: 'nowrap', minWidth: 130, cursor: 'pointer',
          }}>
            {t.label}
            <span style={{ fontSize: 11, fontFamily: 'Geist Mono, monospace', color: category === t.key ? 'var(--blue)' : 'var(--ink-4)', fontWeight: 500 }}>
              {categoryCounts[t.key].toLocaleString()}
            </span>
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Geist Mono, monospace' }}>{k.l}</div>
            <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 6, color: 'var(--ink)' }}>{k.v}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{k.d}</div>
          </div>
        ))}
      </div>

      {/* CSV Export (calling only) */}
      {category === 'calling' && (
        <div style={{ marginBottom: 18, padding: 16, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--paper-2)' }}>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', marginBottom: 12 }}>Export Calling Leads by Timezone</div>
          <div style={{ fontSize: 12, color: 'var(--amber)', marginBottom: 10 }}>Leads sorted alphabetically in OpenPhone — export each timezone separately.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
            {(['EST', 'CST', 'MST', 'PST'] as const).map(tz => (
              <div key={tz}>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: TZ_COLORS[tz], fontWeight: 600 }}>{tz}</span>
                  <span>{tzAvail[tz] ?? '…'} avail</span>
                </div>
                <input type="number" value={tzCounts[tz]} min={0} max={tzAvail[tz] || 0}
                  onChange={e => setTzCounts(prev => ({ ...prev, [tz]: Math.max(0, Math.min(tzAvail[tz] || 0, Number(e.target.value) || 0)) }))}
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid var(--line)', borderRadius: 7, background: 'var(--paper)', color: 'var(--ink)', outline: 'none', textAlign: 'center' }}
                />
              </div>
            ))}
          </div>
          <button onClick={handleCsvExport} disabled={csvExporting || Object.values(tzCounts).every(v => v === 0)}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, borderRadius: 8, border: 'none', background: 'var(--grad)', color: 'white', cursor: 'pointer', opacity: csvExporting || Object.values(tzCounts).every(v => v === 0) ? 0.5 : 1 }}>
            {csvExporting ? 'Exporting…' : `Export ${Object.values(tzCounts).reduce((a, b) => a + b, 0)} leads`}
          </button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Filter:</span>
        {[
          { value: filterPushed, onChange: (v: string) => setFilterPushed(v as any), options: [['all', 'All Status'], ['false', 'Not Pushed'], ['true', 'Pushed']] },
          { value: filterTimezone, onChange: setFilterTimezone, options: [['', 'All TZ'], ...TIMEZONES.map(t => [t, t])] },
          { value: filterBrokerage, onChange: setFilterBrokerage, options: [['', 'All Brokerages'], ...Object.entries(BROKERAGES).map(([k, v]) => [k, v])] },
          { value: filterCountry, onChange: setFilterCountry, options: [['', 'US + CA'], ['US', 'United States'], ['CA', 'Canada']] },
        ].map((f, i) => (
          <select key={i} value={f.value} onChange={e => f.onChange(e.target.value)}
            style={{ fontSize: 12.5, padding: '6px 10px', borderRadius: 7, border: '1px solid var(--line)', background: 'var(--paper-2)', color: 'var(--ink)', outline: 'none', cursor: 'pointer' }}>
            {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
      </div>

      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: 'oklch(95% 0.015 25 / 0.15)', border: '1px solid var(--rose)' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--rose)' }}>{selectedIds.size} selected</span>
          <button onClick={handleBulkDelete} disabled={bulkDeleting} style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, borderRadius: 6, border: 'none', background: 'var(--rose)', color: 'white', cursor: 'pointer' }}>
            {bulkDeleting ? 'Deleting…' : 'Delete selected'}
          </button>
          <button onClick={() => setSelectedIds(new Set())} style={{ fontSize: 12, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 900 }}>
            <thead>
              <tr style={{ background: 'var(--paper-2)', borderBottom: '1px solid var(--line)' }}>
                <th style={{ padding: '10px 12px', width: 36 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
                </th>
                {['Lead', 'Contact', 'Location', 'TZ', 'Brokerage', 'Age', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Geist Mono, monospace' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: 'var(--ink-3)' }}>Loading leads…</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: 'var(--ink-3)' }}>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>No leads yet</div>
                  <div style={{ fontSize: 12 }}>Jeff will populate this once he starts scraping</div>
                </td></tr>
              ) : leads.map((lead, i) => (
                <tr key={lead.id} style={{ borderBottom: i < leads.length - 1 ? '1px solid var(--line)' : 'none', background: selectedIds.has(lead.id) ? 'oklch(96% 0.01 258 / 0.3)' : lead.csv_downloaded_at ? 'oklch(96% 0.01 30 / 0.15)' : 'transparent', cursor: 'pointer' }}
                  onMouseEnter={e => { if (!selectedIds.has(lead.id)) (e.currentTarget as HTMLElement).style.background = 'var(--paper-2)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selectedIds.has(lead.id) ? 'oklch(96% 0.01 258 / 0.3)' : lead.csv_downloaded_at ? 'oklch(96% 0.01 30 / 0.15)' : 'transparent'; }}>
                  <td style={{ padding: '10px 12px' }}>
                    <input type="checkbox" checked={selectedIds.has(lead.id)} onChange={() => toggleSelect(lead.id)} style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{lead.full_name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{lead.country}</div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{lead.email || lead.phone || '—'}</div>
                    {lead.email && lead.phone && <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{lead.phone}</div>}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ color: 'var(--ink-2)' }}>{lead.city}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{lead.state_province}</div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {lead.timezone ? (
                      <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 11.5, fontWeight: 600, fontFamily: 'Geist Mono, monospace', background: `${TZ_COLORS[lead.timezone]}20`, color: TZ_COLORS[lead.timezone] }}>{lead.timezone}</span>
                    ) : <span style={{ color: 'var(--ink-4)' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--ink-2)' }}>
                    {BROKERAGES[lead.source_brokerage] || lead.source_brokerage}
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'Geist Mono, monospace', fontSize: 12, color: 'var(--ink-3)' }}>
                    {new Date(lead.scraped_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {category === 'email' ? (
                      lead.pushed_to_instantly
                        ? <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>Pushed</span>
                        : <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Pending</span>
                    ) : category === 'calling' ? (
                      lead.csv_downloaded_at
                        ? <span style={{ fontSize: 12, color: 'var(--rose)', fontWeight: 500 }}>Downloaded</span>
                        : <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Ready</span>
                    ) : (
                      lead.instagram_dm_sent
                        ? <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 11.5, background: lead.instagram_status === 'replied' ? 'var(--green)20' : 'var(--paper-3)', color: lead.instagram_status === 'replied' ? 'var(--green)' : 'var(--ink-3)' }}>{lead.instagram_status === 'dm_sent' ? "DM'd" : lead.instagram_status}</span>
                        : <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Not DM'd</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      {lead.profile_url && (
                        <a href={lead.profile_url} target="_blank" rel="noopener noreferrer" style={{ padding: 5, borderRadius: 6, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        </a>
                      )}
                      <button onClick={() => openEdit(lead)} style={{ padding: 5, borderRadius: 6, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      {deleteConfirm === lead.id ? (
                        <>
                          <button onClick={() => handleDelete(lead.id)} style={{ padding: '3px 8px', fontSize: 11.5, fontWeight: 500, borderRadius: 5, border: 'none', background: 'var(--rose)', color: 'white', cursor: 'pointer' }}>Confirm</button>
                          <button onClick={() => setDeleteConfirm(null)} style={{ padding: 5, borderRadius: 6, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setDeleteConfirm(lead.id)} style={{ padding: 5, borderRadius: 6, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      )}
                      {category === 'email' && !lead.pushed_to_instantly && (
                        <button onClick={() => handleMarkPushed(lead)} style={{ padding: '3px 8px', fontSize: 11.5, fontWeight: 500, borderRadius: 5, border: '1px solid var(--blue)', background: 'transparent', color: 'var(--blue)', cursor: 'pointer' }}>Push</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--line)' }}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>{offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total.toLocaleString()}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} disabled={offset === 0}
                style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--paper-2)', color: 'var(--ink-2)', cursor: offset === 0 ? 'not-allowed' : 'pointer', opacity: offset === 0 ? 0.4 : 1 }}>‹</button>
              <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace', padding: '0 8px' }}>{currentPage} / {totalPages}</span>
              <button onClick={() => setOffset(offset + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= total}
                style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--paper-2)', color: 'var(--ink-2)', cursor: offset + PAGE_SIZE >= total ? 'not-allowed' : 'pointer', opacity: offset + PAGE_SIZE >= total ? 0.4 : 1 }}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingLead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--paper)', borderRadius: 16, width: '100%', maxWidth: 480, margin: 16, overflow: 'hidden', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>Edit Lead</div>
              <button onClick={() => setEditingLead(null)} style={{ padding: 4, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { label: 'Full name', key: 'full_name' as keyof Lead, type: 'text' },
                { label: 'Email', key: 'email' as keyof Lead, type: 'email' },
                { label: 'Phone', key: 'phone' as keyof Lead, type: 'tel' },
                { label: 'City', key: 'city' as keyof Lead, type: 'text' },
                { label: 'State/Province', key: 'state_province' as keyof Lead, type: 'text' },
                { label: 'Profile URL', key: 'profile_url' as keyof Lead, type: 'url' },
              ].map(f => (
                <div key={f.key} style={{ gridColumn: f.key === 'profile_url' ? '1 / -1' : undefined }}>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{f.label}</div>
                  <input type={f.type} value={(editForm[f.key] as string) || ''} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--line)', borderRadius: 7, background: 'var(--paper-2)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 24px', borderTop: '1px solid var(--line)' }}>
              <button onClick={() => setEditingLead(null)} style={{ padding: '8px 16px', fontSize: 13, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper-2)', color: 'var(--ink-2)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveEdit} disabled={saving} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, borderRadius: 8, border: 'none', background: 'var(--grad)', color: 'white', cursor: 'pointer' }}>{saving ? 'Saving…' : 'Save changes'}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

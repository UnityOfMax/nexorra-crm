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
  lead_score?: number | null;
  funnel_stage?: string | null;
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

const TZ_BG: Record<string, string> = {
  EST: 'var(--blue-soft)',
  CST: 'var(--green-soft)',
  MST: 'var(--amber-soft)',
  PST: 'var(--violet-soft)',
};

const MONO: React.CSSProperties = { fontFamily: 'Geist Mono, monospace' };

// Score bar: gradient from rose (0) → amber (50) → green (100)
function ScoreBar({ score }: { score: number | null | undefined }) {
  const pct = score ?? 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{
        width: 32, height: 4, borderRadius: 99,
        background: 'var(--line)', overflow: 'hidden', flexShrink: 0,
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: 99,
          background: `linear-gradient(90deg, oklch(65% 0.2 25), oklch(75% 0.18 145))`,
          transition: 'width 0.3s ease',
        }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--ink-3)', ...MONO, minWidth: 24 }}>
        {score != null ? score : '—'}
      </span>
    </div>
  );
}

function StageBadge({ stage }: { stage: string | null | undefined }) {
  if (!stage) return <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>—</span>;
  const map: Record<string, { bg: string; color: string }> = {
    new:       { bg: 'var(--blue-soft)',   color: 'var(--blue)' },
    contacted: { bg: 'var(--violet-soft)', color: 'var(--violet)' },
    replied:   { bg: 'var(--amber-soft)',  color: 'var(--amber)' },
    booked:    { bg: 'var(--green-soft)',  color: 'var(--green)' },
    closed:    { bg: 'var(--paper-3)',     color: 'var(--ink-3)' },
  };
  const s = map[stage] || { bg: 'var(--paper-3)', color: 'var(--ink-3)' };
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
      background: s.bg, color: s.color, ...MONO, whiteSpace: 'nowrap',
    }}>
      {stage}
    </span>
  );
}

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

  useEffect(() => {
    fetchLeads(offset); setSelectedIds(new Set()); // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const catTabs: { key: LeadCategory; label: string }[] = [
    { key: 'email',     label: 'Email' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'calling',   label: 'Calling' },
  ];

  const kpis = {
    email: [
      { l: 'Email Leads',  v: categoryCounts.email.toLocaleString(),                              d: 'scraped brokerages' },
      { l: 'Hot (pushed)', v: leads.filter(l => l.pushed_to_instantly).length.toString(),          d: 'of current page' },
      { l: 'Not Pushed',   v: leads.filter(l => !l.pushed_to_instantly).length.toString(),         d: 'pending upload' },
      { l: 'Brokerages',   v: Array.from(new Set(leads.map(l => l.source_brokerage))).length.toString(), d: 'unique sources' },
    ],
    instagram: [
      { l: 'Instagram Leads', v: categoryCounts.instagram.toLocaleString(),                          d: 'with @handle' },
      { l: 'DMs Sent',        v: leads.filter(l => l.instagram_dm_sent).length.toString(),           d: 'of current page' },
      { l: 'Replied',         v: leads.filter(l => l.instagram_status === 'replied').length.toString(), d: 'this page' },
      { l: 'Booked',          v: leads.filter(l => l.instagram_status === 'booked').length.toString(),  d: 'this page' },
    ],
    calling: [
      { l: 'Calling Leads', v: categoryCounts.calling.toLocaleString(),                              d: 'with phone numbers' },
      { l: 'EST Available', v: (tzAvail.EST || 0).toString(),                                        d: 'not yet exported' },
      { l: 'CST Available', v: (tzAvail.CST || 0).toString(),                                        d: 'not yet exported' },
      { l: 'PST + MST',     v: ((tzAvail.PST || 0) + (tzAvail.MST || 0)).toString(),                 d: 'not yet exported' },
    ],
  }[category];

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 1480, margin: '0 auto' }} className="nx-pad-mobile">
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10, ...MONO, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>Nexorra</span>
        <span style={{ color: 'var(--line-2)' }}>›</span>
        <span>Agency</span>
        <span style={{ color: 'var(--line-2)' }}>›</span>
        <span>Leads</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', margin: 0, letterSpacing: '-0.02em' }}>Leads</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => fetchLeads(offset)}
            style={{ padding: '8px 14px', fontSize: 13, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper-2)', color: 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: loading ? 'spin 1s linear infinite' : undefined }}>
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0 || bulkDeleting}
            style={{ padding: '8px 14px', fontSize: 13, borderRadius: 8, border: 'none', background: selectedIds.size > 0 ? 'var(--rose)' : 'var(--paper-3)', color: selectedIds.size > 0 ? 'white' : 'var(--ink-3)', cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {bulkDeleting ? 'Deleting…' : selectedIds.size > 0 ? `Delete ${selectedIds.size}` : 'Delete selected'}
          </button>
        </div>
      </div>

      {/* Tab pills */}
      <div style={{ display: 'flex', background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 10, padding: 4, marginBottom: 20, width: 'fit-content' }}>
        {catTabs.map(t => {
          const active = category === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setCategory(t.key)}
              style={{
                padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 500,
                background: active ? 'var(--paper)' : 'transparent',
                color: active ? 'var(--ink)' : 'var(--ink-3)',
                border: active ? '1px solid var(--line)' : '1px solid transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
              <span style={{ fontSize: 11, ...MONO, color: active ? 'var(--blue)' : 'var(--ink-3)' }}>
                {categoryCounts[t.key].toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }} className="nx-2col-mobile">
        {kpis.map((k, i) => (
          <div key={i} style={{ background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', ...MONO }}>{k.l}</div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 8, color: 'var(--ink)', lineHeight: 1, ...MONO }}>{k.v}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>{k.d}</div>
          </div>
        ))}
      </div>

      {/* CSV Export — calling only */}
      {category === 'calling' && (
        <div style={{ marginBottom: 18, padding: '18px 20px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--paper-2)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Export Calling Leads by Timezone</div>
          <div style={{ fontSize: 12, color: 'var(--amber)', marginBottom: 14, ...MONO }}>Leads sorted alphabetically in OpenPhone — export each timezone separately.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }} className="nx-2col-mobile">
            {(['EST', 'CST', 'MST', 'PST'] as const).map(tz => (
              <div key={tz}>
                <div style={{ fontSize: 11, ...MONO, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: TZ_COLORS[tz], fontWeight: 700 }}>{tz}</span>
                  <span style={{ color: 'var(--ink-3)' }}>{tzAvail[tz] ?? '…'} avail</span>
                </div>
                <input
                  type="number"
                  value={tzCounts[tz]}
                  min={0}
                  max={tzAvail[tz] || 0}
                  onChange={e => setTzCounts(prev => ({ ...prev, [tz]: Math.max(0, Math.min(tzAvail[tz] || 0, Number(e.target.value) || 0)) }))}
                  style={{
                    width: '100%', padding: '8px 10px', fontSize: 14, fontWeight: 600,
                    border: `1px solid ${TZ_COLORS[tz]}44`, borderRadius: 8,
                    background: TZ_BG[tz], color: TZ_COLORS[tz],
                    outline: 'none', textAlign: 'center', boxSizing: 'border-box',
                    ...MONO,
                  }}
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleCsvExport}
            disabled={csvExporting || Object.values(tzCounts).every(v => v === 0)}
            style={{
              padding: '9px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8,
              border: 'none', background: 'var(--grad)', color: 'white', cursor: 'pointer',
              opacity: csvExporting || Object.values(tzCounts).every(v => v === 0) ? 0.45 : 1,
            }}
          >
            {csvExporting ? 'Exporting…' : `Export ${Object.values(tzCounts).reduce((a, b) => a + b, 0)} leads`}
          </button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Filter:</span>
        {[
          { value: filterPushed, onChange: (v: string) => setFilterPushed(v as any), options: [['all', 'All Status'], ['false', 'Not Pushed'], ['true', 'Pushed']] },
          { value: filterTimezone, onChange: setFilterTimezone, options: [['', 'All TZ'], ...TIMEZONES.map(t => [t, t])] },
          { value: filterBrokerage, onChange: setFilterBrokerage, options: [['', 'All Brokerages'], ...Object.entries(BROKERAGES).map(([k, v]) => [k, v])] },
          { value: filterCountry, onChange: setFilterCountry, options: [['', 'US + CA'], ['US', 'United States'], ['CA', 'Canada']] },
        ].map((f, i) => (
          <select
            key={i}
            value={f.value}
            onChange={e => f.onChange(e.target.value)}
            style={{ fontSize: 12.5, padding: '6px 10px', borderRadius: 7, border: '1px solid var(--line)', background: 'var(--paper-2)', color: 'var(--ink)', outline: 'none', cursor: 'pointer' }}
          >
            {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
      </div>

      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: 'var(--rose-soft)', border: '1px solid var(--rose)' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--rose)', ...MONO }}>{selectedIds.size} selected</span>
          <button onClick={handleBulkDelete} disabled={bulkDeleting} style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, borderRadius: 6, border: 'none', background: 'var(--rose)', color: 'white', cursor: 'pointer' }}>
            {bulkDeleting ? 'Deleting…' : 'Delete selected'}
          </button>
          <button onClick={() => setSelectedIds(new Set())} style={{ fontSize: 12, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
        </div>
      )}

      {/* Leads list card */}
      <div style={{ background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Table header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--line)', background: 'var(--paper-3)' }}>
          <div style={{ width: 20, flexShrink: 0 }}>
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} style={{ cursor: 'pointer', accentColor: 'var(--blue)' }} />
          </div>
          {['Lead', 'Contact', 'Location', 'TZ', 'Score', 'Stage', 'Age', 'Status', ''].map((h, i) => (
            <div key={i} style={{
              fontSize: 11, fontWeight: 500, color: 'var(--ink-3)',
              textTransform: 'uppercase', letterSpacing: '0.07em', ...MONO,
              flex: h === 'Lead' ? 2 : h === 'Contact' ? 2 : h === '' ? 0 : 1,
              minWidth: h === 'Score' ? 80 : h === '' ? 96 : undefined,
              width: h === '' ? 96 : undefined,
              flexShrink: h === '' ? 0 : undefined,
            }}>
              {h}
            </div>
          ))}
        </div>

        {/* Lead rows */}
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Loading leads…</div>
        ) : leads.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>No leads yet</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Jeff will populate this once he starts scraping</div>
          </div>
        ) : leads.map((lead, i) => {
          const isLast = i === leads.length - 1;
          const ageDate = new Date(lead.scraped_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return (
            <div
              key={lead.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
                borderBottom: isLast ? 'none' : '1px solid var(--line)',
                background: selectedIds.has(lead.id) ? 'oklch(96% 0.01 258 / 0.25)' : lead.csv_downloaded_at ? 'oklch(96% 0.01 30 / 0.1)' : 'transparent',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { if (!selectedIds.has(lead.id)) (e.currentTarget as HTMLElement).style.background = 'var(--paper-3)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selectedIds.has(lead.id) ? 'oklch(96% 0.01 258 / 0.25)' : lead.csv_downloaded_at ? 'oklch(96% 0.01 30 / 0.1)' : 'transparent'; }}
            >
              {/* Checkbox */}
              <div style={{ width: 20, flexShrink: 0 }}>
                <input type="checkbox" checked={selectedIds.has(lead.id)} onChange={() => toggleSelect(lead.id)} style={{ cursor: 'pointer', accentColor: 'var(--blue)' }} />
              </div>

              {/* Lead name */}
              <div style={{ flex: 2, minWidth: 0 }}>
                <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.full_name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', ...MONO }}>{lead.country}</div>
              </div>

              {/* Contact */}
              <div style={{ flex: 2, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.email || lead.phone || '—'}</div>
                {lead.email && lead.phone && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', ...MONO }}>{lead.phone}</div>}
              </div>

              {/* Location */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--ink-2)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.city}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{lead.state_province}</div>
              </div>

              {/* TZ */}
              <div style={{ flex: 1 }}>
                {lead.timezone ? (
                  <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 11.5, fontWeight: 600, ...MONO, background: TZ_BG[lead.timezone] || 'var(--paper-3)', color: TZ_COLORS[lead.timezone] || 'var(--ink-3)' }}>
                    {lead.timezone}
                  </span>
                ) : <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>—</span>}
              </div>

              {/* Score bar */}
              <div style={{ minWidth: 80, flex: 1 }}>
                <ScoreBar score={lead.lead_score} />
              </div>

              {/* Stage */}
              <div style={{ flex: 1 }}>
                <StageBadge stage={lead.funnel_stage} />
              </div>

              {/* Age */}
              <div style={{ flex: 1, fontSize: 12, color: 'var(--ink-3)', ...MONO }}>
                {ageDate}
              </div>

              {/* Status */}
              <div style={{ flex: 1 }}>
                {category === 'email' ? (
                  lead.pushed_to_instantly
                    ? <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, ...MONO }}>Pushed</span>
                    : <span style={{ fontSize: 12, color: 'var(--ink-3)', ...MONO }}>Pending</span>
                ) : category === 'calling' ? (
                  lead.csv_downloaded_at
                    ? <span style={{ fontSize: 12, color: 'var(--rose)', fontWeight: 600, ...MONO }}>Downloaded</span>
                    : <span style={{ fontSize: 12, color: 'var(--ink-3)', ...MONO }}>Ready</span>
                ) : (
                  lead.instagram_dm_sent
                    ? <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 11.5, background: lead.instagram_status === 'replied' ? 'var(--green-soft)' : 'var(--paper-3)', color: lead.instagram_status === 'replied' ? 'var(--green)' : 'var(--ink-3)', ...MONO }}>
                        {lead.instagram_status === 'dm_sent' ? "DM'd" : lead.instagram_status}
                      </span>
                    : <span style={{ fontSize: 12, color: 'var(--ink-3)', ...MONO }}>Not DM'd</span>
                )}
              </div>

              {/* Actions */}
              <div style={{ width: 96, display: 'flex', gap: 2, justifyContent: 'flex-end', flexShrink: 0 }}>
                {lead.profile_url && (
                  <a href={lead.profile_url} target="_blank" rel="noopener noreferrer"
                    style={{ padding: 5, borderRadius: 6, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', textDecoration: 'none' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                  </a>
                )}
                <button onClick={() => openEdit(lead)}
                  style={{ padding: 5, borderRadius: 6, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
                {deleteConfirm === lead.id ? (
                  <>
                    <button onClick={() => handleDelete(lead.id)}
                      style={{ padding: '3px 8px', fontSize: 11.5, fontWeight: 500, borderRadius: 5, border: 'none', background: 'var(--rose)', color: 'white', cursor: 'pointer' }}>
                      Confirm
                    </button>
                    <button onClick={() => setDeleteConfirm(null)}
                      style={{ padding: 5, borderRadius: 6, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </>
                ) : (
                  <button onClick={() => setDeleteConfirm(lead.id)}
                    style={{ padding: 5, borderRadius: 6, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                  </button>
                )}
                {category === 'email' && !lead.pushed_to_instantly && (
                  <button onClick={() => handleMarkPushed(lead)}
                    style={{ padding: '3px 8px', fontSize: 11.5, fontWeight: 500, borderRadius: 5, border: '1px solid var(--blue)', background: 'transparent', color: 'var(--blue)', cursor: 'pointer' }}>
                    Push
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid var(--line)' }}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)', ...MONO }}>{offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total.toLocaleString()}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} disabled={offset === 0}
                style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--paper-3)', color: 'var(--ink-2)', cursor: offset === 0 ? 'not-allowed' : 'pointer', opacity: offset === 0 ? 0.4 : 1, fontSize: 14 }}>‹</button>
              <span style={{ fontSize: 12, color: 'var(--ink-3)', ...MONO, padding: '0 8px' }}>{currentPage} / {totalPages}</span>
              <button onClick={() => setOffset(offset + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= total}
                style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--paper-3)', color: 'var(--ink-2)', cursor: offset + PAGE_SIZE >= total ? 'not-allowed' : 'pointer', opacity: offset + PAGE_SIZE >= total ? 0.4 : 1, fontSize: 14 }}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingLead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--paper-2)', borderRadius: 16, width: '100%', maxWidth: 480, margin: 16, overflow: 'hidden', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>Edit Lead</div>
              <button onClick={() => setEditingLead(null)} style={{ padding: 4, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
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
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, ...MONO }}>{f.label}</div>
                  <input type={f.type} value={(editForm[f.key] as string) || ''} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--line)', borderRadius: 7, background: 'var(--paper-3)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 24px', borderTop: '1px solid var(--line)' }}>
              <button onClick={() => setEditingLead(null)} style={{ padding: '8px 16px', fontSize: 13, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper-3)', color: 'var(--ink-2)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveEdit} disabled={saving} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, borderRadius: 8, border: 'none', background: 'var(--grad)', color: 'white', cursor: 'pointer' }}>{saving ? 'Saving…' : 'Save changes'}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

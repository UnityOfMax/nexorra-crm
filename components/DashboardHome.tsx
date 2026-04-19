'use client';

import { ChevronRight, Building2 } from 'lucide-react';
import FunnelDiagram from './agency/FunnelDiagram';
import { computeFunnelFromStats } from '@/lib/data/mock-subaccounts';
import type { Account } from '@/types';

interface Stats {
  totalContacts: number;
  totalLeads: number;
  totalCustomers: number;
  activeDeals: number;
  emailsSent: number;
  textsSent: number;
  bookings: number;
  closings: number;
  revenue: number;
}

interface HotLead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  lead_score: number | null;
  funnel_stage: string | null;
  last_intent: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
}

interface DashboardHomeProps {
  user: { id: string; email?: string; user_metadata?: Record<string, string> };
  currentAccount: Account;
  agencyAccount: Account | null;
  clientAccounts: Account[];
  isAgencyUser: boolean;
  isViewingClient: boolean;
  stats: Stats;
  hotLeads: HotLead[];
  onViewChange: (view: string) => void;
  onSelectContact?: (id: string) => void;
  onNavigateBack: () => void;
}

function KpiCard({ label, value, delta, tone = 'blue', mono = true }: {
  label: string;
  value: string | number;
  delta?: number;
  tone?: 'blue' | 'violet' | 'green' | 'amber' | 'rose';
  mono?: boolean;
}) {
  const toneVar: Record<string, string> = {
    blue: 'var(--blue)', violet: 'var(--violet)', green: 'var(--green)',
    amber: 'var(--amber)', rose: 'var(--rose)',
  };
  const c = toneVar[tone] || 'var(--blue)';
  const isUp = delta !== undefined && delta >= 0;
  return (
    <div style={{
      padding: '16px 20px', background: 'var(--paper-2)',
      border: '1px solid var(--line)', borderRadius: 12,
    }}>
      <div style={{
        fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase',
        letterSpacing: '0.07em', fontWeight: 600,
      }}>{label}</div>
      <div style={{
        fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 8,
        fontFamily: mono ? 'Geist Mono, monospace' : undefined,
        color: 'var(--ink)',
      }}>{value}</div>
      {delta !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 12 }}>
          <span style={{ color: isUp ? 'var(--green)' : 'var(--rose)', fontWeight: 500 }}>
            {isUp ? '↑' : '↓'} {Math.abs(delta)}%
          </span>
          <span style={{ color: 'var(--ink-3)' }}>vs last period</span>
        </div>
      )}
    </div>
  );
}

const INTENT_LABELS: Record<string, string> = {
  booking_signal: 'Booking signal',
  interested: 'Interested',
  objection: 'Objection',
  qualifying: 'Qualifying',
};

export default function DashboardHome({
  user, currentAccount, agencyAccount, clientAccounts,
  isAgencyUser, isViewingClient, stats, hotLeads,
  onViewChange, onSelectContact, onNavigateBack,
}: DashboardHomeProps) {
  const fullName = (user.user_metadata?.['full_name'] as string | undefined) || '';
  const userName = fullName.split(' ')[0] || user.email?.split('@')[0] || 'there';
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const fmtN = (n: number) => n >= 10000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString();
  const fmt$ = (n: number) => n >= 10000 ? `$${(n / 1000).toFixed(0)}k` : `$${n.toLocaleString()}`;
  const relTime = (iso: string | null) => {
    if (!iso) return null;
    const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
    if (h < 1) return 'just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 1480, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 260px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-3)', marginBottom: 8 }}>
            <span>{isAgencyUser && !isViewingClient ? 'Agency' : 'Workspace'}</span>
            <ChevronRight size={11} />
            <span style={{ color: 'var(--ink-2)' }}>{currentAccount.name}</span>
            <ChevronRight size={11} />
            <span style={{ color: 'var(--ink-2)' }}>Dashboard</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            {greeting}, {userName}.
          </h1>
          <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 4 }}>
            {dateStr}
          </div>
        </div>

        {isViewingClient && isAgencyUser && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
            background: 'var(--blue-soft)', border: '1px solid var(--blue)',
            borderRadius: 10, flexShrink: 0,
          }}>
            <Building2 size={14} style={{ color: 'var(--blue)' }} />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }}>Viewing: {currentAccount.name}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Managing as agency owner</div>
            </div>
            <button onClick={onNavigateBack} style={{
              fontSize: 12, fontWeight: 500, color: 'var(--blue)',
              background: 'none', border: 'none', cursor: 'pointer', marginLeft: 4,
            }}>Back →</button>
          </div>
        )}
      </div>

      {/* Agency view */}
      {isAgencyUser && !isViewingClient ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 14 }}>
            <KpiCard label="Active Clients" value={clientAccounts.length > 5 ? clientAccounts.length : 119} tone="blue" />
            <KpiCard label="Monthly Revenue" value="$270,000" delta={8.3} tone="violet" />
            <KpiCard label="Deals Closed / Mo" value="238" delta={22.8} tone="green" />
            <KpiCard label="Appts / Mo" value="2,850" delta={12.4} tone="amber" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
            <KpiCard label="Avg GCI / Deal" value="$12,500" tone="blue" />
            <KpiCard label="Avg Ad Spend / Mo" value="$58,548" tone="violet" />
            <KpiCard label="Avg Days to Deal" value="54d" tone="green" mono={false} />
            <KpiCard label="Total Texts / Mo" value="14,200" tone="amber" />
          </div>
        </>
      ) : (
        <>
          {/* Client KPI rows */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 14 }}>
            <KpiCard label="Total Contacts" value={fmtN(stats.totalContacts)} tone="blue" />
            <KpiCard label="Active Leads" value={fmtN(stats.totalLeads)} tone="violet" />
            <KpiCard label="Active Deals" value={String(stats.activeDeals)} tone="green" />
            <KpiCard label="Revenue" value={fmt$(stats.revenue)} delta={stats.closings > 0 ? 5.2 : undefined} tone="amber" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 28 }}>
            <KpiCard label="Emails Sent" value={fmtN(stats.emailsSent)} tone="blue" />
            <KpiCard label="Texts Sent" value={fmtN(stats.textsSent)} tone="violet" />
            <KpiCard label="Bookings" value={String(stats.bookings)} tone="green" />
            <KpiCard label="Closings" value={String(stats.closings)} tone="amber" />
            <KpiCard label="Customers" value={String(stats.totalCustomers)} tone="rose" />
          </div>

          {/* Hot Leads */}
          {hotLeads.length > 0 && (
            <div style={{
              padding: '20px', background: 'var(--paper-2)',
              border: '1px solid var(--line)', borderRadius: 12, marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'var(--amber-soft)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  }}>🔥</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Hot Leads</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>High score or recent intent signal</div>
                  </div>
                  <div style={{
                    width: 20, height: 20, borderRadius: 999,
                    background: 'var(--amber)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700,
                  }}>{hotLeads.length}</div>
                </div>
                <button onClick={() => onViewChange('contacts')} style={{
                  fontSize: 12, fontWeight: 500, color: 'var(--blue)',
                  background: 'none', border: 'none', cursor: 'pointer',
                }}>View all →</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {hotLeads.map(lead => {
                  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown';
                  const score = lead.lead_score ?? 0;
                  const scoreHigh = score >= 80;
                  return (
                    <div
                      key={lead.id}
                      onClick={() => { onSelectContact?.(lead.id); onViewChange('conversations'); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                        background: 'var(--paper-3)', borderRadius: 8, cursor: 'pointer',
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: 'var(--grad)', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'Geist Mono, monospace', fontWeight: 600, fontSize: 12,
                      }}>{(name[0] || '?').toUpperCase()}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{name}</span>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 5,
                            background: scoreHigh ? 'var(--green-soft)' : 'var(--amber-soft)',
                            color: scoreHigh ? 'var(--green)' : 'var(--amber)',
                          }}>{score}</span>
                          {lead.last_intent && INTENT_LABELS[lead.last_intent] && (
                            <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                              · {INTENT_LABELS[lead.last_intent]}
                            </span>
                          )}
                        </div>
                        {lead.last_message_preview && (
                          <div style={{
                            fontSize: 12, color: 'var(--ink-3)', marginTop: 2,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{lead.last_message_preview}</div>
                        )}
                      </div>
                      {lead.last_message_at && (
                        <span style={{
                          fontSize: 11, color: 'var(--ink-3)', flexShrink: 0,
                          fontFamily: 'Geist Mono, monospace',
                        }}>{relTime(lead.last_message_at)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <FunnelDiagram data={computeFunnelFromStats(stats.closings, stats.bookings)} />
        </>
      )}
    </div>
  );
}

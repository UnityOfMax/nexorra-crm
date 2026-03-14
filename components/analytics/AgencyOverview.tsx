'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Users, Calendar, DollarSign } from 'lucide-react';

interface ClientOverview {
  accountId: string;
  accountName: string;
  leads: number;
  engaged: number;
  bookings: number;
  bookingRate: number | null;
  avgLeadScore: number | null;
  spend: number | null;
  cpl: number | null;
  cpa: number | null;
}

interface AgencyOverviewData {
  totalLeads: number;
  totalBookings: number;
  totalSpend: number;
  avgBookingRate: number | null;
  avgCpl: number | null;
  avgCpa: number | null;
  clients: ClientOverview[];
}

function StatCard({ icon: Icon, label, value, accent = false }: {
  icon: any; label: string; value: string; accent?: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${accent ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`} />
        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest">{label}</span>
      </div>
      <p className={`text-2xl font-mono font-bold tabular-nums ${accent ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-gray-100'}`}>
        {value}
      </p>
    </div>
  );
}

export default function AgencyOverview() {
  const [data, setData] = useState<AgencyOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/overview')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  const money = (n: number | null) =>
    n != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n) : '—';

  return (
    <div className="space-y-6">
      {/* Global stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users}       label="Total Leads"    value={data.totalLeads.toLocaleString()} />
        <StatCard icon={Calendar}    label="Bookings"       value={data.totalBookings.toLocaleString()} accent />
        <StatCard icon={TrendingUp}  label="Avg Book Rate"  value={data.avgBookingRate != null ? `${data.avgBookingRate}%` : '—'} accent />
        <StatCard icon={DollarSign}  label="Total Spend"    value={money(data.totalSpend)} />
      </div>

      {/* Per-client table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Client Performance — Last 30 Days</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left py-2 px-4 text-xs text-gray-500 dark:text-gray-400 font-medium">Client</th>
                <th className="text-right py-2 px-3 text-xs text-gray-500 dark:text-gray-400 font-medium">Leads</th>
                <th className="text-right py-2 px-3 text-xs text-gray-500 dark:text-gray-400 font-medium">Bookings</th>
                <th className="text-right py-2 px-3 text-xs text-gray-500 dark:text-gray-400 font-medium">Book Rate</th>
                <th className="text-right py-2 px-3 text-xs text-gray-500 dark:text-gray-400 font-medium">Spend</th>
                <th className="text-right py-2 px-3 text-xs text-gray-500 dark:text-gray-400 font-medium">CPL</th>
                <th className="text-right py-2 px-4 text-xs text-gray-500 dark:text-gray-400 font-medium">CPA</th>
              </tr>
            </thead>
            <tbody>
              {data.clients.map((client) => (
                <tr key={client.accountId} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <td className="py-2.5 px-4">
                    <p className="font-medium text-gray-800 dark:text-gray-200">{client.accountName}</p>
                  </td>
                  <td className="text-right py-2.5 px-3 font-mono text-gray-600 dark:text-gray-400 tabular-nums">
                    {client.leads.toLocaleString()}
                  </td>
                  <td className="text-right py-2.5 px-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {client.bookings.toLocaleString()}
                  </td>
                  <td className={`text-right py-2.5 px-3 font-mono tabular-nums ${
                    client.bookingRate == null ? 'text-gray-400 dark:text-gray-500'
                    : client.bookingRate >= 20 ? 'text-emerald-600 dark:text-emerald-400'
                    : client.bookingRate < 10 ? 'text-red-600 dark:text-red-400'
                    : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {client.bookingRate != null ? `${client.bookingRate}%` : '—'}
                  </td>
                  <td className="text-right py-2.5 px-3 font-mono text-gray-600 dark:text-gray-400 tabular-nums">{money(client.spend)}</td>
                  <td className="text-right py-2.5 px-3 font-mono text-gray-600 dark:text-gray-400 tabular-nums">{money(client.cpl)}</td>
                  <td className="text-right py-2.5 px-4 font-mono text-gray-600 dark:text-gray-400 tabular-nums">{money(client.cpa)}</td>
                </tr>
              ))}
              {data.clients.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                    No client data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

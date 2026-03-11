'use client';

interface FunnelStage {
  stage: string;
  count: number;
  conversionRate: number | null;
}

interface FunnelChartProps {
  stages: FunnelStage[];
  totalLeads: number;
  totalBookings: number;
  bookingRate: number | null;
}

const STAGE_LABELS: Record<string, string> = {
  form_submit:       'Form Submitted',
  replied:           'AI Replied',
  booking_page_viewed: 'Booking Page Viewed',
  booking_confirmed: 'Booking Confirmed',
  showed:            'Showed Up',
};

const STAGE_COLORS = [
  'var(--analytics-accent)',
  '#818cf8',
  '#38bdf8',
  '#34d399',
  '#10b981',
];

export default function FunnelChart({ stages, totalLeads, totalBookings, bookingRate }: FunnelChartProps) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="space-y-2">
      {/* Summary row */}
      <div className="flex items-center gap-6 mb-5">
        <div>
          <p className="text-xs text-[var(--analytics-muted)] uppercase tracking-widest mb-0.5">Total Leads</p>
          <p className="text-2xl font-mono font-bold text-white tabular-nums">{totalLeads.toLocaleString()}</p>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div>
          <p className="text-xs text-[var(--analytics-muted)] uppercase tracking-widest mb-0.5">Bookings</p>
          <p className="text-2xl font-mono font-bold text-[var(--analytics-positive)] tabular-nums">{totalBookings.toLocaleString()}</p>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div>
          <p className="text-xs text-[var(--analytics-muted)] uppercase tracking-widest mb-0.5">Booking Rate</p>
          <p className="text-2xl font-mono font-bold text-[var(--analytics-accent)] tabular-nums">
            {bookingRate != null ? `${bookingRate}%` : '—'}
          </p>
        </div>
      </div>

      {/* Funnel bars */}
      <div className="space-y-3">
        {stages.map((stage, i) => {
          const pct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
          const color = STAGE_COLORS[i % STAGE_COLORS.length];

          return (
            <div key={stage.stage}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--analytics-muted)]">
                  {STAGE_LABELS[stage.stage] || stage.stage}
                </span>
                <div className="flex items-center gap-3">
                  {stage.conversionRate != null && (
                    <span className="text-xs text-[var(--analytics-muted)] tabular-nums">
                      {stage.conversionRate}% from prev
                    </span>
                  )}
                  <span className="text-sm font-mono font-semibold text-white tabular-nums">
                    {stage.count.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

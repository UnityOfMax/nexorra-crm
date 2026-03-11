'use client';

interface LeadScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

function getScoreTier(score: number): { label: string; bg: string; text: string; ring: string } {
  if (score >= 81) return { label: 'Hot',      bg: 'bg-emerald-500/15', text: 'text-emerald-400', ring: 'ring-emerald-500/30' };
  if (score >= 61) return { label: 'Warm',     bg: 'bg-orange-500/15',  text: 'text-orange-400',  ring: 'ring-orange-500/30'  };
  if (score >= 31) return { label: 'Lukewarm', bg: 'bg-amber-500/15',   text: 'text-amber-400',   ring: 'ring-amber-500/30'   };
  return               { label: 'Cold',     bg: 'bg-slate-500/15',  text: 'text-slate-400',  ring: 'ring-slate-500/30'  };
}

export default function LeadScoreBadge({ score, size = 'sm' }: LeadScoreBadgeProps) {
  const tier = getScoreTier(score);
  const sizeClass = size === 'lg' ? 'text-sm px-3 py-1.5' : size === 'md' ? 'text-xs px-2.5 py-1' : 'text-xs px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-mono font-semibold ring-1 ${sizeClass} ${tier.bg} ${tier.text} ${tier.ring}`}
    >
      <span className="tabular-nums">{score}</span>
      <span className="font-sans font-normal opacity-70">{tier.label}</span>
    </span>
  );
}

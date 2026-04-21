'use client';
import React from 'react';

// ─── Sparkline ────────────────────────────────────────────────────────────────

interface SparklineProps {
  data: number[];
  w?: number;
  h?: number;
  color?: string;
  fill?: boolean;
}

export function Sparkline({ data, w = 120, h = 32, color = 'var(--blue)', fill = true }: SparklineProps) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const rng = Math.max(1, max - min);
  const pts = data.map((v, i) => [i / (data.length - 1) * w, h - ((v - min) / rng) * (h - 4) - 2] as [number, number]);
  const d = 'M ' + pts.map(p => p.join(',')).join(' L ');
  const area = d + ` L ${w},${h} L 0,${h} Z`;
  const id = 'spg-' + Math.random().toString(36).slice(2, 8);
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {fill && (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${id})`} />
        </>
      )}
      <path d={d} stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Bars ─────────────────────────────────────────────────────────────────────

interface BarsProps {
  data: number[];
  w?: number;
  h?: number;
  color?: string;
  highlight?: number;
}

export function Bars({ data, w = 140, h = 40, color = 'var(--blue)', highlight = -1 }: BarsProps) {
  const max = Math.max(...data);
  const bw = w / data.length - 2;
  return (
    <svg width={w} height={h}>
      {data.map((v, i) => {
        const bh = (v / max) * h;
        const isHi = i === highlight || (highlight === -1 && i === data.length - 1);
        return (
          <rect key={i} x={i * (bw + 2)} y={h - bh} width={bw} height={bh} rx={1.5}
            fill={isHi ? color : 'var(--line-2)'} />
        );
      })}
    </svg>
  );
}

// ─── Donut ────────────────────────────────────────────────────────────────────

interface DonutProps {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string | number;
}

export function Donut({ value, size = 72, stroke = 8, color = 'var(--blue)', label }: DonutProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - value / 100);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--line)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      {label !== undefined && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Geist Mono, monospace', fontSize: size * 0.22, fontWeight: 500, color: 'var(--ink)',
        }}>
          {label}
        </div>
      )}
    </div>
  );
}

// ─── StackBar ─────────────────────────────────────────────────────────────────

interface StackSegment {
  pct: number;
  color: string;
  name?: string;
}

interface StackBarProps {
  segments: StackSegment[];
  h?: number;
}

export function StackBar({ segments, h = 8 }: StackBarProps) {
  return (
    <div style={{ display: 'flex', gap: 2, height: h, borderRadius: h / 2, overflow: 'hidden' }}>
      {segments.map((s, i) => (
        <div key={i} style={{ width: `${s.pct}%`, background: s.color }}
          title={s.name ? `${s.name} — ${s.pct}%` : `${s.pct}%`} />
      ))}
    </div>
  );
}

'use client';
import React, { useState } from 'react';
import { Sparkline } from './charts';

// ─── Utilities ────────────────────────────────────────────────────────────────

export const cls = (...a: (string | undefined | false | null)[]) => a.filter(Boolean).join(' ');

export const fmt$ = (n: number, short?: boolean): string => {
  if (short) {
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(n % 1e3 === 0 ? 0 : 1) + 'K';
    return '$' + n;
  }
  return '$' + n.toLocaleString('en-US');
};

export const fmtN = (n: number) => n.toLocaleString('en-US');

// ─── Color tokens ─────────────────────────────────────────────────────────────

export type TagColor = 'blue' | 'violet' | 'green' | 'amber' | 'rose' | 'grad';

export const tagColor = (k: string): { bg: string; fg: string } =>
  ({
    blue:   { bg: 'var(--blue-soft)',   fg: 'var(--blue)'   },
    violet: { bg: 'var(--violet-soft)', fg: 'var(--violet)' },
    green:  { bg: 'var(--green-soft)',  fg: 'var(--green)'  },
    amber:  { bg: 'var(--amber-soft)',  fg: 'var(--amber)'  },
    rose:   { bg: 'var(--rose-soft)',   fg: 'var(--rose)'   },
    grad:   { bg: 'var(--grad)',        fg: 'white'         },
  }[k] || { bg: 'var(--paper-3)', fg: 'var(--ink-2)' });

// ─── Avatar ───────────────────────────────────────────────────────────────────

interface AvatarProps {
  name?: string;
  size?: number;
  color?: string;
  tag?: string;
}

export function Avatar({ name, size = 28, color = 'blue', tag }: AvatarProps) {
  const c = tagColor(color);
  const letters = tag || (name ? name.split(' ').map(x => x[0]).slice(0, 2).join('') : '?');
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28, background: c.bg, color: c.fg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 600, fontSize: size * 0.42, letterSpacing: '0.02em',
      flexShrink: 0, fontFamily: 'Geist Mono, monospace',
    }}>{letters.toUpperCase()}</div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

export type BadgeTone = 'neutral' | 'gray' | 'blue' | 'violet' | 'green' | 'amber' | 'rose' | 'ghost';

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  style?: React.CSSProperties;
}

export function Badge({ children, tone = 'neutral', dot = false, style = {} }: BadgeProps) {
  const tones: Record<BadgeTone, { bg: string; fg: string; dot: string }> = {
    neutral: { bg: 'var(--paper-3)', fg: 'var(--ink-2)', dot: 'var(--ink-3)' },
    gray:    { bg: 'var(--paper-3)', fg: 'var(--ink-2)', dot: 'var(--ink-3)' },
    blue:    { bg: 'var(--blue-soft)', fg: 'var(--blue)', dot: 'var(--blue)' },
    violet:  { bg: 'var(--violet-soft)', fg: 'var(--violet)', dot: 'var(--violet)' },
    green:   { bg: 'var(--green-soft)', fg: 'var(--green)', dot: 'var(--green)' },
    amber:   { bg: 'var(--amber-soft)', fg: 'var(--amber)', dot: 'var(--amber)' },
    rose:    { bg: 'var(--rose-soft)', fg: 'var(--rose)', dot: 'var(--rose)' },
    ghost:   { bg: 'transparent', fg: 'var(--ink-2)', dot: 'var(--ink-3)' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px',
      borderRadius: 999, background: t.bg, color: t.fg,
      fontSize: 12, fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap',
      ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: t.dot }} />}
      {children}
    </span>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'grad' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
  active?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export function Button({
  children, variant = 'ghost', size = 'md', icon, iconRight, onClick, style = {}, active, disabled, type = 'button', className,
}: ButtonProps) {
  const sizes = {
    sm: { h: 28, px: 10, fs: 12.5, gap: 6 },
    md: { h: 34, px: 12, fs: 13.5, gap: 8 },
    lg: { h: 40, px: 16, fs: 14, gap: 8 },
  }[size];
  const variants = {
    primary:   { bg: 'var(--ink)', fg: 'var(--paper)', bd: 'var(--ink)' },
    secondary: { bg: 'var(--paper)', fg: 'var(--ink)', bd: 'var(--line-2)' },
    ghost:     { bg: active ? 'var(--paper-3)' : 'transparent', fg: 'var(--ink-2)', bd: 'transparent' },
    grad:      { bg: 'var(--grad)', fg: 'white', bd: 'transparent' },
    danger:    { bg: 'var(--rose-soft)', fg: 'var(--rose)', bd: 'transparent' },
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: sizes.gap,
        height: sizes.h, padding: `0 ${sizes.px}px`, fontSize: sizes.fs, fontWeight: 500,
        background: variants.bg, color: variants.fg,
        border: `1px solid ${variants.bd}`, borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        transition: 'background 120ms, border-color 120ms, transform 80ms',
        fontFamily: 'inherit',
        ...style,
      }}
      onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)'; }}
      onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  padding?: number;
  onClick?: () => void;
  hoverable?: boolean;
  className?: string;
}

export function Card({ children, style = {}, padding = 16, onClick, hoverable, className }: CardProps) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      className={className}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'var(--paper)',
        border: `1px solid ${hov && hoverable ? 'var(--line-2)' : 'var(--line)'}`,
        borderRadius: 12, padding,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 120ms, transform 120ms, box-shadow 120ms',
        boxShadow: hov && hoverable ? 'var(--shadow-sm)' : 'none',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

interface ToggleProps {
  on?: boolean;
  size?: 'sm' | 'md';
  onClick?: () => void;
  onChange?: (v: boolean) => void;
}

export function Toggle({ on = false, size = 'md', onClick, onChange }: ToggleProps) {
  const [v, setV] = useState(on);
  const w = size === 'sm' ? 32 : 40, h = size === 'sm' ? 18 : 22;
  const handle = () => {
    const next = !v;
    setV(next);
    onClick?.();
    onChange?.(next);
  };
  return (
    <button
      type="button"
      onClick={handle}
      style={{
        width: w, height: h, borderRadius: h, background: v ? 'var(--grad)' : 'var(--line-2)',
        position: 'relative', transition: 'background 160ms', flexShrink: 0,
        border: 'none', cursor: 'pointer',
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: v ? w - h + 2 : 2,
        width: h - 4, height: h - 4, borderRadius: '50%',
        background: 'white', transition: 'left 160ms', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        display: 'block',
      }} />
    </button>
  );
}

// ─── SectionHead ──────────────────────────────────────────────────────────────

interface SectionHeadProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function SectionHead({ title, subtitle, actions }: SectionHeadProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</h2>
        {subtitle && <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {actions}
    </div>
  );
}

// ─── KPI ──────────────────────────────────────────────────────────────────────

interface KPIProps {
  label: string;
  value: string | number;
  delta?: number;
  trend?: number[];
  tone?: 'blue' | 'violet' | 'green' | 'amber';
}

export function KPI({ label, value, delta, trend, tone = 'blue' }: KPIProps) {
  const up = (delta ?? 0) >= 0;
  const toneColor = { blue: 'var(--blue)', violet: 'var(--violet)', green: 'var(--green)', amber: 'var(--amber)' }[tone];
  return (
    <Card padding={18} className="nx-kpi-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 11.5, color: 'var(--ink-3)', textTransform: 'uppercase',
            letterSpacing: '0.06em', fontWeight: 500, whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{label}</div>
          <div className="mono nx-kpi-value" style={{
            fontSize: 28, fontWeight: 500, marginTop: 8, letterSpacing: '-0.02em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{value}</div>
          {delta !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12.5, flexWrap: 'wrap' }}>
              <Badge tone={up ? 'green' : 'rose'} dot>
                {up ? '+' : ''}{delta}%
              </Badge>
              <span style={{ color: 'var(--ink-3)' }}>vs last 30d</span>
            </div>
          )}
        </div>
        {trend && (
          <div className="nx-kpi-spark">
            <Sparkline data={trend} w={90} h={40} color={toneColor} />
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Tip ──────────────────────────────────────────────────────────────────────

interface TipProps {
  label: string;
  children: React.ReactNode;
}

export function Tip({ label, children }: TipProps) {
  const [h, setH] = useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
    >
      {children}
      {h && label && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--ink)', color: 'var(--paper)', fontSize: 11.5, padding: '4px 8px',
          borderRadius: 6, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 300,
        }}>{label}</span>
      )}
    </span>
  );
}

// ─── Placeholder ──────────────────────────────────────────────────────────────

interface PlaceholderProps {
  w?: string | number;
  h?: number;
  label?: string;
  style?: React.CSSProperties;
}

export function Placeholder({ w = '100%', h = 160, label, style = {} }: PlaceholderProps) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 10, border: '1px dashed var(--line-2)',
      background: 'repeating-linear-gradient(135deg, var(--paper-2) 0 8px, var(--paper-3) 8px 16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace', fontSize: 11,
      letterSpacing: '0.08em', textTransform: 'uppercase', ...style,
    }}>{label}</div>
  );
}

'use client';
import React from 'react';

interface IconProps {
  size?: number;
  stroke?: number;
  style?: React.CSSProperties;
  className?: string;
}

const I = ({ children, size = 18, stroke = 1.6, style, className }: IconProps & { children: React.ReactNode }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }} className={className}
  >{children}</svg>
);

export const Icons = {
  home: (p: IconProps) => <I {...p}><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></I>,
  grid: (p: IconProps) => <I {...p}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></I>,
  pipeline: (p: IconProps) => <I {...p}><rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/></I>,
  contacts: (p: IconProps) => <I {...p}><circle cx="9" cy="8" r="3.5"/><path d="M3 20c.6-3.3 3.2-5.5 6-5.5s5.4 2.2 6 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M21 19c-.2-1.8-1.3-3.5-3-4"/></I>,
  inbox: (p: IconProps) => <I {...p}><path d="M3 13l2-7h14l2 7"/><path d="M3 13v6h18v-6"/><path d="M3 13h5l1 2h6l1-2h5"/></I>,
  chart: (p: IconProps) => <I {...p}><path d="M4 19V5"/><path d="M20 19H4"/><path d="M8 15l3-4 3 2 5-6"/></I>,
  calendar: (p: IconProps) => <I {...p}><rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/></I>,
  tasks: (p: IconProps) => <I {...p}><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M8 9l2 2 4-4"/><path d="M8 15h8"/></I>,
  docs: (p: IconProps) => <I {...p}><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 17h4"/></I>,
  bolt: (p: IconProps) => <I {...p}><path d="M13 3L5 14h6l-1 7 8-11h-6z"/></I>,
  settings: (p: IconProps) => <I {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h0a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v0a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></I>,
  chev: (p: IconProps) => <I {...p}><path d="M6 9l6 6 6-6"/></I>,
  chevR: (p: IconProps) => <I {...p}><path d="M9 6l6 6-6 6"/></I>,
  chevL: (p: IconProps) => <I {...p}><path d="M15 6l-6 6 6 6"/></I>,
  chevUp: (p: IconProps) => <I {...p}><path d="M6 15l6-6 6 6"/></I>,
  search: (p: IconProps) => <I {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></I>,
  plus: (p: IconProps) => <I {...p}><path d="M12 5v14M5 12h14"/></I>,
  x: (p: IconProps) => <I {...p}><path d="M6 6l12 12M18 6L6 18"/></I>,
  filter: (p: IconProps) => <I {...p}><path d="M3 5h18l-7 9v5l-4 2v-7z"/></I>,
  sort: (p: IconProps) => <I {...p}><path d="M7 4v16M3 8l4-4 4 4"/><path d="M17 20V4M13 16l4 4 4-4"/></I>,
  more: (p: IconProps) => <I {...p}><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></I>,
  dots: (p: IconProps) => <I {...p}><circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/></I>,
  bell: (p: IconProps) => <I {...p}><path d="M6 15V10a6 6 0 0112 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 004 0"/></I>,
  mail: (p: IconProps) => <I {...p}><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 7l9 6 9-6"/></I>,
  phone: (p: IconProps) => <I {...p}><path d="M4 5c0 9 6 15 15 15l2-4-4-2-2 2a11 11 0 01-5-5l2-2-2-4z"/></I>,
  pin: (p: IconProps) => <I {...p}><path d="M12 2a6 6 0 016 6c0 5-6 13-6 13S6 13 6 8a6 6 0 016-6z"/><circle cx="12" cy="8" r="2"/></I>,
  check: (p: IconProps) => <I {...p}><path d="M5 12l5 5L20 7"/></I>,
  arrowUp: (p: IconProps) => <I {...p}><path d="M12 19V5"/><path d="M6 11l6-6 6 6"/></I>,
  arrowDown: (p: IconProps) => <I {...p}><path d="M12 5v14"/><path d="M6 13l6 6 6-6"/></I>,
  arrowRight: (p: IconProps) => <I {...p}><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></I>,
  trend: (p: IconProps) => <I {...p}><path d="M3 17l6-6 4 4 8-9"/><path d="M14 6h7v7"/></I>,
  building: (p: IconProps) => <I {...p}><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/><path d="M10 21v-3h4v3"/></I>,
  house: (p: IconProps) => <I {...p}><path d="M3 11l9-7 9 7v10H3z"/><path d="M10 21v-6h4v6"/></I>,
  moon: (p: IconProps) => <I {...p}><path d="M20 15A8 8 0 019 4a8 8 0 1011 11z"/></I>,
  sun: (p: IconProps) => <I {...p}><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></I>,
  sparkle: (p: IconProps) => <I {...p}><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></I>,
  eye: (p: IconProps) => <I {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></I>,
  lock: (p: IconProps) => <I {...p}><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 018 0v3"/></I>,
  user: (p: IconProps) => <I {...p}><circle cx="12" cy="8" r="3.5"/><path d="M4 20c.9-3.5 4-6 8-6s7.1 2.5 8 6"/></I>,
  link: (p: IconProps) => <I {...p}><path d="M10 14a5 5 0 007.1 0l3-3a5 5 0 00-7.1-7.1l-1.5 1.5"/><path d="M14 10a5 5 0 00-7.1 0l-3 3a5 5 0 007.1 7.1l1.5-1.5"/></I>,
  globe: (p: IconProps) => <I {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></I>,
  list: (p: IconProps) => <I {...p}><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></I>,
  kanban: (p: IconProps) => <I {...p}><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/></I>,
  timeline: (p: IconProps) => <I {...p}><path d="M4 7h10M4 12h16M4 17h7"/><circle cx="17" cy="7" r="1.5"/><circle cx="14" cy="17" r="1.5"/></I>,
  zap: (p: IconProps) => <I {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></I>,
  download: (p: IconProps) => <I {...p}><path d="M12 4v12"/><path d="M6 10l6 6 6-6"/><path d="M4 20h16"/></I>,
  dollar: (p: IconProps) => <I {...p}><path d="M12 2v20M17 6H9a3 3 0 000 6h6a3 3 0 010 6H7"/></I>,
  workflow: (p: IconProps) => <I {...p}><rect x="3" y="4" width="6" height="5" rx="1"/><rect x="15" y="4" width="6" height="5" rx="1"/><rect x="9" y="15" width="6" height="5" rx="1"/><path d="M6 9v3h12V9"/><path d="M12 12v3"/></I>,
  pages: (p: IconProps) => <I {...p}><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M4 8h16"/><circle cx="7" cy="5.5" r="0.6"/><circle cx="9.5" cy="5.5" r="0.6"/><path d="M7 12h6M7 15h10M7 18h5"/></I>,
  bot: (p: IconProps) => <I {...p}><rect x="4" y="8" width="16" height="12" rx="2"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/><path d="M12 4v4M9 18h6"/><circle cx="12" cy="4" r="1.2"/></I>,
  target: (p: IconProps) => <I {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></I>,
  instagram: (p: IconProps) => <I {...p}><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor"/></I>,
  terminal: (p: IconProps) => <I {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/></I>,
  megaphone: (p: IconProps) => <I {...p}><path d="M3 11v2a1 1 0 001 1h3l8 4V6l-8 4H4a1 1 0 00-1 1z"/><path d="M18 8a5 5 0 010 8"/></I>,
  monitor: (p: IconProps) => <I {...p}><rect x="2" y="4" width="20" height="13" rx="1.5"/><path d="M8 21h8M12 17v4"/></I>,
  smartphone: (p: IconProps) => <I {...p}><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M10 18h4"/></I>,
};

export default Icons;

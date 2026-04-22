'use client';

import { useEffect } from 'react';

/**
 * Resolves the stored theme from localStorage.
 * Checks nx.theme (Settings UI key) first, then legacy user-scoped and generic keys.
 */
function getStoredTheme(): string | null {
  // Primary key written by SettingsView
  const primary = localStorage.getItem('nx.theme');
  if (primary) return primary;
  // Legacy user-scoped keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('nexorra_theme_')) {
      return localStorage.getItem(key);
    }
  }
  // Legacy generic key
  return localStorage.getItem('theme');
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = getStoredTheme();
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  return <>{children}</>;
}

'use client';

import { useEffect } from 'react';

/**
 * Resolves the stored theme from localStorage.
 * Checks user-scoped key first (`nexorra_theme_{userId}`), then generic `theme`.
 */
function getStoredTheme(): string | null {
  // Check all user-scoped keys — pick the first match
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('nexorra_theme_')) {
      return localStorage.getItem(key);
    }
  }
  // Fall back to generic key (legacy)
  return localStorage.getItem('theme');
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = getStoredTheme();
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return <>{children}</>;
}

import type { ThemeMode } from '@/store/themeAtom';

export const THEME_COOKIE = 'theme-mode';

export function writeThemeCookie(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${THEME_COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax`;
}

import type { ActiveTab } from '@/store/uiAtom';

export const TAB_COOKIE = 'active-tab';

const TABS: readonly ActiveTab[] = ['calculator', 'positions', 'history'];

/** Read + validate an active-tab cookie value (server or client). */
export function parseTabCookie(value: string | undefined): ActiveTab {
  return TABS.includes(value as ActiveTab) ? (value as ActiveTab) : 'calculator';
}

/** Persist the active tab so a refresh stays on the same tab. */
export function writeTabCookie(tab: ActiveTab): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${TAB_COOKIE}=${tab}; path=/; max-age=31536000; samesite=lax`;
}

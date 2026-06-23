import { atomWithStorage } from 'jotai/utils';

export type ThemeMode = 'dark' | 'light';
// getOnInit:true → client's first render reads localStorage (matches the layout anti-flash script),
// so the hydrated tree renders the stored theme immediately instead of always 'dark'.
export const themeAtom = atomWithStorage<ThemeMode>('theme-mode', 'dark', undefined, { getOnInit: true });

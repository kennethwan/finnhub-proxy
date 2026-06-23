import { atomWithStorage } from 'jotai/utils';

export type ThemeMode = 'dark' | 'light';
export const themeAtom = atomWithStorage<ThemeMode>('theme-mode', 'dark');

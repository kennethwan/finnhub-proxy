import { atom } from 'jotai';

export type ThemeMode = 'dark' | 'light';
export const themeAtom = atom<ThemeMode>('dark');

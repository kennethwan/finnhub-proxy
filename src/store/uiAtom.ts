import { atom } from 'jotai';

export type ActiveTab = 'calculator' | 'positions' | 'history';
export const activeTabAtom = atom<ActiveTab>('calculator');

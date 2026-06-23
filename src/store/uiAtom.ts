import { atom } from 'jotai';

export type ActiveTab = 'calculator' | 'positions' | 'history';
export const activeTabAtom = atom<ActiveTab>('calculator');

export type PositionsSubtab = 'positions' | 'history';
export const positionsSubtabAtom = atom<PositionsSubtab>('positions');

import { atomWithStorage } from 'jotai/utils';
export const fullPositionPctAtom = atomWithStorage<number>('full-position-pct', 0.5);

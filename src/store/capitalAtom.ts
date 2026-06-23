import { atomWithStorage } from 'jotai/utils';

export const capitalAtom = atomWithStorage<string>('calc-capital', '128000');

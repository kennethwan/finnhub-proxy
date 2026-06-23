import { atomWithStorage } from 'jotai/utils';
import type { Currency } from '@/types/trade';

export const currencyAtom = atomWithStorage<Currency>('display-currency', 'USD');

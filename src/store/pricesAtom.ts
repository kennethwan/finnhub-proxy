import { atom } from 'jotai';
import type { PriceData } from '@/types/trade';
export const pricesAtom = atom<Record<string, PriceData>>({});

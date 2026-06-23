import { atom } from 'jotai';
import type { Trade } from '@/types/trade';
export const tradesAtom = atom<Trade[]>([]);

import { atom } from 'jotai';
import type { User } from '@supabase/supabase-js';
export const userAtom = atom<User | null>(null);

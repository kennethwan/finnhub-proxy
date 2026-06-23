'use client';

import { useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { supabase } from '@/lib/supabaseClient';
import { userAtom } from '@/store/userAtom';
import { tradesAtom } from '@/store/tradesAtom';
import { signIn, signUp, signOutUser } from '@/lib/auth';

export function useAuth() {
  const [user, setUser] = useAtom(userAtom);
  const setTrades = useSetAtom(tradesAtom);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ?? null),
    );
    return () => subscription.unsubscribe();
  }, [setUser]);

  return {
    user,
    signIn,
    signUp,
    signOut: async () => {
      await signOutUser();
      setTrades([]);
    },
  };
}

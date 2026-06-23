import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Lazy singleton — created on first use so SSG/build does not throw
// when env vars are absent (components that call useAuth/useTrades are 'use client').
let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY) are not configured');
  }
  _client = createClient(url, anonKey);
  return _client;
}

// Convenience proxy — behaves like the old `supabase` export but is lazily resolved.
// The `get` trap binds functions to the real client so that @supabase/supabase-js v2
// private class fields are always accessed with the correct `this` receiver.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = Reflect.get(client as object, prop, client);
    return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(client) : value;
  },
});

'use client';

import { useEffect, useState } from 'react';
import type { Candle } from '@/types/candle';

const DEBOUNCE_MS = 350;

export function useCandles(symbol: string | null, opts?: { range?: string; interval?: string }) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const range = opts?.range ?? '6mo';
  const interval = opts?.interval ?? '1d';

  // Debounce the symbol so typing doesn't fire a request (and a chart remount)
  // per keystroke — that burst rate-limits the upstream (500s) and thrashes the
  // chart. Clearing the symbol applies immediately.
  const [debouncedSymbol, setDebouncedSymbol] = useState(symbol);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSymbol(symbol), symbol ? DEBOUNCE_MS : 0);
    return () => clearTimeout(id);
  }, [symbol]);

  useEffect(() => {
    if (!debouncedSymbol) { setCandles([]); return; }
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(`/api/candles?symbol=${encodeURIComponent(debouncedSymbol)}&range=${range}&interval=${interval}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(String(data.error));
        else setCandles((data.candles ?? []) as Candle[]);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'fetch failed'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedSymbol, range, interval]);

  return { candles, loading, error };
}

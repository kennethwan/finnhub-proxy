'use client';

import { useEffect, useState } from 'react';
import type { Candle } from '@/types/candle';

export function useCandles(symbol: string | null, opts?: { range?: string; interval?: string }) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const range = opts?.range ?? '6mo';
  const interval = opts?.interval ?? '1d';

  useEffect(() => {
    if (!symbol) { setCandles([]); return; }
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(`/api/candles?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=${interval}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(String(data.error));
        else setCandles((data.candles ?? []) as Candle[]);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'fetch failed'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol, range, interval]);

  return { candles, loading, error };
}

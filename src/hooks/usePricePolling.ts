'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { tradesAtom } from '@/store/tradesAtom';
import { pricesAtom } from '@/store/pricesAtom';

export function usePricePolling() {
  const trades = useAtomValue(tradesAtom);
  const setPrices = useSetAtom(pricesAtom);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const openSymbols = trades.filter((t) => t.status === 'open').map((t) => t.symbol);
  const symbolKey = Array.from(new Set(openSymbols)).sort().join(',');

  const fetchPrices = useCallback(async () => {
    if (!symbolKey) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/quotes?symbols=${symbolKey}`);
      const data = await res.json();
      if (data.error) {
        setError(String(data.error));
      } else {
        const next: Record<string, { price: number; change: number; changePercent: number; updatedAt: string }> = {};
        for (const [sym, q] of Object.entries(data as Record<string, { c?: number; d?: number; dp?: number }>)) {
          if (q.c && q.c > 0) next[sym] = { price: q.c, change: q.d ?? 0, changePercent: q.dp ?? 0, updatedAt: new Date().toISOString() };
        }
        setPrices(next);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'fetch failed');
    }
    setLoading(false);
  }, [symbolKey, setPrices]);

  useEffect(() => {
    if (!symbolKey) return;
    fetchPrices();
    const id = setInterval(fetchPrices, 60000);
    return () => clearInterval(id);
  }, [symbolKey, fetchPrices]);

  return { loading, error, refresh: fetchPrices };
}

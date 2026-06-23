'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { userAtom } from '@/store/userAtom';
import { tradesAtom } from '@/store/tradesAtom';
import { LocalTradesRepository } from '@/lib/trades/localTradesRepository';
import { SupabaseTradesRepository } from '@/lib/trades/supabaseTradesRepository';
import type { Trade } from '@/types/trade';

export function useTrades() {
  const user = useAtomValue(userAtom);
  const [trades, setTrades] = useAtom(tradesAtom);
  const [syncing, setSyncing] = useState(false);

  const repo = useMemo(
    () => (user ? new SupabaseTradesRepository(user.id) : new LocalTradesRepository()),
    [user],
  );

  const reload = useCallback(async () => {
    setSyncing(true);
    try {
      setTrades(await repo.load());
    } finally {
      setSyncing(false);
    }
  }, [repo, setTrades]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addTrade = useCallback(
    async (trade: Trade) => {
      const stored = await repo.add(trade);
      setTrades((prev) => [stored, ...prev]);
      return stored;
    },
    [repo, setTrades],
  );

  const updateStop = useCallback(
    async (id: Trade['id'], newStop: number) => {
      const current = trades.find((t) => t.id === id);
      if (!current) return;
      const isRiskFree = newStop >= current.entryPrice;
      const updated: Trade = {
        ...current,
        currentStopLoss: newStop,
        stopLossHistory: [
          ...current.stopLossHistory,
          { price: newStop, date: new Date().toISOString(), note: isRiskFree ? '✅ Risk Free!' : '推高止損' },
        ],
      };
      setTrades((prev) => prev.map((t) => (t.id === id ? updated : t)));
      await repo.update(updated);
    },
    [repo, setTrades, trades],
  );

  const closeTrade = useCallback(
    async (id: Trade['id'], exitPrice: number) => {
      const current = trades.find((t) => t.id === id);
      if (!current) return;
      const updated: Trade = {
        ...current,
        status: 'closed',
        exitPrice,
        pnl: (exitPrice - current.entryPrice) * current.shares,
        closedAt: new Date().toISOString(),
      };
      setTrades((prev) => prev.map((t) => (t.id === id ? updated : t)));
      await repo.update(updated);
    },
    [repo, setTrades, trades],
  );

  const removeTrade = useCallback(
    async (id: Trade['id']) => {
      setTrades((prev) => prev.filter((t) => t.id !== id));
      await repo.remove(id);
    },
    [repo, setTrades],
  );

  return { trades, reload, addTrade, updateStop, closeTrade, removeTrade, syncing };
}

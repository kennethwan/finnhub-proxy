import { describe, it, expect, beforeEach } from 'vitest';
import { LocalTradesRepository } from './localTradesRepository';
import type { Trade } from '@/types/trade';

const t = (over: Partial<Trade> = {}): Trade => ({
  id: 1, symbol: 'AAPL', entryPrice: 150, shares: 10, initialStopLoss: 145, currentStopLoss: 145,
  targetPrice: null, status: 'open', riskAmount: 50, createdAt: '2026-06-10T00:00:00Z',
  stopLossHistory: [], exitPrice: null, pnl: null, closedAt: null, ...over,
});

describe('LocalTradesRepository', () => {
  beforeEach(() => localStorage.clear());

  it('loads [] when empty', async () => {
    expect(await new LocalTradesRepository().load()).toEqual([]);
  });
  it('add persists to the stock-trades-v3 key and returns the trade', async () => {
    const repo = new LocalTradesRepository();
    const added = await repo.add(t({ id: 99 }));
    expect(added.id).toBe(99);
    expect(JSON.parse(localStorage.getItem('stock-trades-v3')!)).toHaveLength(1);
    expect(await repo.load()).toHaveLength(1);
  });
  it('update replaces by id', async () => {
    const repo = new LocalTradesRepository();
    await repo.add(t({ id: 1, currentStopLoss: 145 }));
    await repo.update(t({ id: 1, currentStopLoss: 152 }));
    expect((await repo.load())[0].currentStopLoss).toBe(152);
  });
  it('remove deletes by id', async () => {
    const repo = new LocalTradesRepository();
    await repo.add(t({ id: 1 }));
    await repo.add(t({ id: 2 }));
    await repo.remove(1);
    const all = await repo.load();
    expect(all.map((x) => x.id)).toEqual([2]);
  });
});

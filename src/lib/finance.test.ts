import { describe, it, expect } from 'vitest';
import { calculatePosition, tradeMetrics, portfolioStats, historyStats } from './finance';
import type { Trade } from '@/types/trade';

const baseOpen: Trade = {
  id: 1, symbol: 'AAPL', entryPrice: 150, shares: 128,
  initialStopLoss: 145, currentStopLoss: 145, targetPrice: 165,
  status: 'open', riskAmount: 640, createdAt: '2026-06-10T00:00:00Z',
  stopLossHistory: [],
};

describe('calculatePosition', () => {
  it('sizes a textbook long trade', () => {
    const r = calculatePosition({ capital: 128000, buyPrice: 150, stop: 145, maxLossPercent: 0.5, targetPrice: 165 });
    expect(r).not.toBeNull();
    if (!r || 'error' in r) throw new Error('unexpected');
    expect(r.shares).toBe(128);
    expect(r.requiredCapital).toBe(19200);
    expect(r.actualRisk).toBe(640);
    expect(r.riskRewardRatio).toBeCloseTo(3, 6);
    expect(r.potentialProfit).toBe(1920);
  });
  it('errors when stop >= buy', () => {
    const r = calculatePosition({ capital: 128000, buyPrice: 150, stop: 151, maxLossPercent: 0.5 });
    expect(r).toEqual({ error: '止損價必須低於買入價' });
  });
  it('returns null on incomplete input', () => {
    expect(calculatePosition({ capital: 0, buyPrice: 150, stop: 145, maxLossPercent: 0.5 })).toBeNull();
  });
});

describe('tradeMetrics', () => {
  const now = Date.parse('2026-06-24T00:00:00Z');
  it('computes allocation, R, drawdowns at current price', () => {
    const m = tradeMetrics(baseOpen, { currentPrice: 298.19, capital: 128000, fullPositionPct: 0.5, now });
    expect(m.amtAllocated).toBe(19200);
    expect(m.pctAllocated).toBeCloseTo(15, 4);
    expect(m.ptnSizing).toBeCloseTo(1, 6);          // 640 / (0.5% * 128000=640)
    expect(m.days).toBe(14);
    expect(m.r).toBeCloseTo((298.19 - 150) / 5, 4);
    expect(m.status).toBe('At Risk');
    expect(m.sdd.usd).toBeCloseTo(-640, 6);          // (145-150)*128
    expect(m.wdd.r).toBeCloseTo(-1, 6);
    expect(m.mdd?.usd).toBeCloseTo((145 - 298.19) * 128, 4);
  });
  it('flags Risk Free when stop >= entry', () => {
    const rf = { ...baseOpen, currentStopLoss: 152 };
    const m = tradeMetrics(rf, { currentPrice: 298.19, capital: 128000, fullPositionPct: 0.5, now });
    expect(m.status).toBe('Risk Free');
    expect(m.isRiskFree).toBe(true);
  });
  it('leaves price-derived fields null without a price', () => {
    const m = tradeMetrics(baseOpen, { currentPrice: null, capital: 128000, fullPositionPct: 0.5, now });
    expect(m.r).toBeNull();
    expect(m.mdd).toBeNull();
    expect(m.sdd.usd).toBeCloseTo(-640, 6); // SDD/WDD do not need price
  });
});

describe('portfolioStats', () => {
  it('aggregates NAV, exposure and drawdown in display currency', () => {
    const s = portfolioStats([baseOpen], {
      prices: { AAPL: { price: 298.19, change: 0, changePercent: 0, updatedAt: '' } },
      capital: 128000, fullPositionPct: 0.5, display: 'USD',
    });
    expect(s.unrealized).toBeCloseTo(18968.32, 2);
    expect(s.realized).toBe(0);
    expect(s.nav).toBeCloseTo(146968.32, 2);
    expect(s.numStock).toBe(1);
    expect(s.osFp).toBeCloseTo(1, 6);
    expect(s.sdd).toBeCloseTo(-640, 2);
    expect(s.mdd).toBeCloseTo(-640 - 18968.32, 2);
  });
});

describe('historyStats', () => {
  it('summarises realized trades', () => {
    const closed: Trade[] = [
      { ...baseOpen, id: 2, status: 'closed', exitPrice: 170, pnl: 2560, closedAt: '2026-06-20T00:00:00Z' },
      { ...baseOpen, id: 3, status: 'closed', exitPrice: 145, pnl: -640, closedAt: '2026-06-21T00:00:00Z' },
    ];
    const h = historyStats(closed, 'USD');
    expect(h.count).toBe(2);
    expect(h.wins).toBe(1);
    expect(h.losses).toBe(1);
    expect(h.winRate).toBeCloseTo(50, 4);
    expect(h.realized).toBeCloseTo(1920, 2);
  });
});

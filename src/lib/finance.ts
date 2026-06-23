import type { Trade, Currency, PriceData } from '@/types/trade';
import { convertCurrency, getSymbolCurrency } from './format';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface PositionInput {
  capital: number; buyPrice: number; stop: number; maxLossPercent: number; targetPrice?: number | null;
}
export interface PositionResult {
  shares: number; riskPerShare: number; stopLossPercentage: number; maxLossAmount: number;
  requiredCapital: number; actualRisk: number; actualRiskPercent: number; capitalUsagePercent: number;
  canAfford: boolean; actualStopLoss: number;
  riskRewardRatio: number | null; potentialProfit: number | null; targetGainPercent: number | null;
}

export function calculatePosition(input: PositionInput): PositionResult | { error: string } | null {
  const { capital, buyPrice, stop, maxLossPercent } = input;
  if (!capital || !buyPrice || !stop || !maxLossPercent) return null;
  if (stop >= buyPrice) return { error: '止損價必須低於買入價' };

  const riskPerShare = buyPrice - stop;
  const stopLossPercentage = (riskPerShare / buyPrice) * 100;
  const maxLossAmount = capital * (maxLossPercent / 100);
  const shares = Math.floor(maxLossAmount / riskPerShare);
  const requiredCapital = shares * buyPrice;
  const actualRisk = shares * riskPerShare;
  const actualRiskPercent = (actualRisk / capital) * 100;
  const capitalUsagePercent = (requiredCapital / capital) * 100;

  let riskRewardRatio: number | null = null, potentialProfit: number | null = null, targetGainPercent: number | null = null;
  const target = input.targetPrice ?? null;
  if (target && target > buyPrice) {
    const profitPerShare = target - buyPrice;
    riskRewardRatio = profitPerShare / riskPerShare;
    potentialProfit = shares * profitPerShare;
    targetGainPercent = (profitPerShare / buyPrice) * 100;
  }

  return {
    shares, riskPerShare, stopLossPercentage, maxLossAmount, requiredCapital, actualRisk,
    actualRiskPercent, capitalUsagePercent, canAfford: requiredCapital <= capital,
    actualStopLoss: stop, riskRewardRatio, potentialProfit, targetGainPercent,
  };
}

export interface DrawdownTriple { r: number; usd: number; pctC: number }
export interface MetricsOpts { currentPrice: number | null; capital: number; fullPositionPct: number; now: number }
export type TradeStatusLabel = 'Risk Free' | 'At Risk' | 'Win' | 'Loss';
export interface TradeMetrics {
  amtAllocated: number; pctAllocated: number; ptnSizing: number; days: number;
  marketPrice: number | null; changePct: number | null; r: number | null;
  status: TradeStatusLabel; isRiskFree: boolean; currentRisk: number;
  sdd: DrawdownTriple; wdd: DrawdownTriple; mdd: DrawdownTriple | null;
}

export function tradeMetrics(trade: Trade, opts: MetricsOpts): TradeMetrics {
  const { currentPrice, capital, fullPositionPct, now } = opts;
  const { entryPrice: E, shares: Q, initialStopLoss: IS, currentStopLoss: CS } = trade;
  const initialRiskPerShare = E - IS;
  const oneFp = (fullPositionPct / 100) * capital;

  const triple = (deltaPerShare: number): DrawdownTriple => ({
    usd: deltaPerShare * Q,
    r: initialRiskPerShare !== 0 ? deltaPerShare / initialRiskPerShare : 0,
    pctC: capital !== 0 ? (deltaPerShare * Q) / capital * 100 : 0,
  });

  const closed = trade.status === 'closed';
  const refPrice = closed ? (trade.exitPrice ?? null) : currentPrice;
  const isRiskFree = CS >= E;
  const currentRisk = isRiskFree ? (CS - E) * Q : (E - CS) * Q;

  const status: TradeStatusLabel = closed
    ? ((trade.pnl ?? 0) >= 0 ? 'Win' : 'Loss')
    : (isRiskFree ? 'Risk Free' : 'At Risk');

  const startMs = Date.parse(trade.createdAt);
  const endMs = closed && trade.closedAt ? Date.parse(trade.closedAt) : now;
  const days = Math.max(0, Math.floor((endMs - startMs) / MS_PER_DAY));

  const changePct = refPrice != null ? ((refPrice - E) / E) * 100 : null;
  const r = refPrice != null && initialRiskPerShare !== 0 ? (refPrice - E) / initialRiskPerShare : null;
  const mdd = refPrice != null ? triple(CS - refPrice) : null;

  return {
    amtAllocated: Q * E,
    pctAllocated: capital !== 0 ? (Q * E) / capital * 100 : 0,
    ptnSizing: oneFp !== 0 ? trade.riskAmount / oneFp : 0,
    days, marketPrice: refPrice, changePct, r, status, isRiskFree, currentRisk,
    sdd: triple(CS - E),
    wdd: triple(IS - E),
    mdd,
  };
}

export interface PortfolioOpts {
  prices: Record<string, PriceData>; capital: number; fullPositionPct: number; display: Currency;
}
export interface PortfolioStats {
  capital: number; unrealized: number; realized: number; totalPL: number; nav: number;
  pctInvested: number; numStock: number; osFp: number; sdd: number; mdd: number; hasLiveUnrealized: boolean;
}

export function portfolioStats(trades: Trade[], opts: PortfolioOpts): PortfolioStats {
  const { prices, capital, fullPositionPct, display } = opts;
  const open = trades.filter((t) => t.status === 'open');
  const closed = trades.filter((t) => t.status === 'closed');
  const oneFp = (fullPositionPct / 100) * capital;
  const capitalDisplay = convertCurrency(capital, 'USD', display);

  let unrealized = 0, realized = 0, invested = 0, sddUsd = 0, osFpRisk = 0;
  let hasLiveUnrealized = false;
  for (const t of open) {
    const cur = getSymbolCurrency(t.symbol);
    const p = prices[t.symbol]?.price;
    if (p != null) {
      unrealized += convertCurrency((p - t.entryPrice) * t.shares, cur, display);
      invested += convertCurrency(p * t.shares, cur, display);
      hasLiveUnrealized = true;
    }
    sddUsd += convertCurrency((t.currentStopLoss - t.entryPrice) * t.shares, cur, display);
    osFpRisk += convertCurrency(Math.max(0, (t.entryPrice - t.currentStopLoss) * t.shares), cur, display);
  }
  for (const t of closed) {
    realized += convertCurrency(t.pnl ?? 0, getSymbolCurrency(t.symbol), display);
  }

  const totalPL = unrealized + realized;
  const nav = capitalDisplay + totalPL;
  return {
    capital: capitalDisplay, unrealized, realized, totalPL, nav,
    pctInvested: nav !== 0 ? (invested / nav) * 100 : 0,
    numStock: new Set(open.map((t) => t.symbol)).size,
    osFp: oneFp !== 0 ? osFpRisk / oneFp : 0,
    sdd: sddUsd,
    mdd: sddUsd - unrealized,
    hasLiveUnrealized,
  };
}

export interface HistoryStats {
  realized: number; count: number; wins: number; losses: number; winRate: number;
  avgR: number | null; best: number | null; worst: number | null;
}

export function historyStats(closed: Trade[], display: Currency): HistoryStats {
  if (closed.length === 0) {
    return { realized: 0, count: 0, wins: 0, losses: 0, winRate: 0, avgR: null, best: null, worst: null };
  }
  let realized = 0, wins = 0, losses = 0, rSum = 0, rCount = 0;
  let best = -Infinity, worst = Infinity;
  for (const t of closed) {
    const pnl = convertCurrency(t.pnl ?? 0, getSymbolCurrency(t.symbol), display);
    realized += pnl;
    if (pnl >= 0) wins++; else losses++;
    best = Math.max(best, pnl);
    worst = Math.min(worst, pnl);
    const risk = t.entryPrice - t.initialStopLoss;
    if (t.exitPrice != null && risk !== 0) { rSum += (t.exitPrice - t.entryPrice) / risk; rCount++; }
  }
  return {
    realized, count: closed.length, wins, losses,
    winRate: (wins / closed.length) * 100,
    avgR: rCount ? rSum / rCount : null, best, worst,
  };
}

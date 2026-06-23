import type { Candle, KeyLevel } from '@/types/candle';

export interface KeyLevelOpts { lookback?: number; minProminence?: number; maxLevels?: number }
export interface KeyLevels { supports: KeyLevel[]; resistances: KeyLevel[] }

function dedupeTop(raw: KeyLevel[], maxLevels: number): KeyLevel[] {
  const kept: KeyLevel[] = [];
  for (const kl of [...raw].sort((a, b) => b.strength - a.strength)) {
    const tooClose = kept.some((e) => Math.abs(e.price - kl.price) / kl.price < 0.015);
    if (!tooClose) kept.push(kl);
    if (kept.length >= maxLevels) break;
  }
  return kept.sort((a, b) => b.time - a.time);
}

export function detectKeyLevels(candles: Candle[], opts: KeyLevelOpts = {}): KeyLevels {
  const lookback = opts.lookback ?? 5;
  const minProminence = opts.minProminence ?? 0.02;
  const maxLevels = opts.maxLevels ?? 5;
  if (candles.length < lookback * 2 + 1) return { supports: [], resistances: [] };

  const lows: KeyLevel[] = [];
  const highs: KeyLevel[] = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const wStart = Math.max(0, i - lookback * 2);
    const wEnd = Math.min(candles.length - 1, i + lookback * 2);
    const window = candles.slice(wStart, wEnd + 1);

    // swing low → support
    const centerLow = candles[i].l;
    let leftMin = Infinity, rightMin = Infinity;
    for (let k = i - lookback; k < i; k++) leftMin = Math.min(leftMin, candles[k].l);
    for (let k = i + 1; k <= i + lookback; k++) rightMin = Math.min(rightMin, candles[k].l);
    if (centerLow < leftMin && centerLow < rightMin) {
      const nearHigh = Math.max(...window.map((c) => c.h));
      const prominence = nearHigh > 0 ? (nearHigh - centerLow) / nearHigh : 0;
      if (prominence >= minProminence) lows.push({ price: centerLow, time: candles[i].t, strength: prominence });
    }

    // swing high → resistance (symmetric)
    const centerHigh = candles[i].h;
    let leftMax = -Infinity, rightMax = -Infinity;
    for (let k = i - lookback; k < i; k++) leftMax = Math.max(leftMax, candles[k].h);
    for (let k = i + 1; k <= i + lookback; k++) rightMax = Math.max(rightMax, candles[k].h);
    if (centerHigh > leftMax && centerHigh > rightMax) {
      const nearLow = Math.min(...window.map((c) => c.l));
      const prominence = centerHigh > 0 ? (centerHigh - nearLow) / centerHigh : 0;
      if (prominence >= minProminence) highs.push({ price: centerHigh, time: candles[i].t, strength: prominence });
    }
  }

  return { supports: dedupeTop(lows, maxLevels), resistances: dedupeTop(highs, maxLevels) };
}

export function suggestStop(support: number): number { return support * 0.995; }
export function suggestTarget(resistance: number): number { return resistance * 0.995; }
export function rLevels(entry: number, stop: number): { r1: number; r2: number; r3: number } {
  const r = entry - stop;
  return { r1: entry + r, r2: entry + 2 * r, r3: entry + 3 * r };
}

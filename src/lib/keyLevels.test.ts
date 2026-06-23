import { describe, it, expect } from 'vitest';
import { detectKeyLevels, suggestStop, suggestTarget, rLevels } from './keyLevels';
import type { Candle } from '@/types/candle';

// Build a series with a clear swing low at index 11 (dip to 90) and swing high at index 23 (spike to 130).
function series(): Candle[] {
  const closes: number[] = [];
  for (let i = 0; i < 11; i++) closes.push(105 - i * 0.2);    // gentle decline ~105→103
  closes.push(90);                                            // 11: deep low (support)
  for (let i = 0; i < 11; i++) closes.push(103 + i * 0.4);    // recover ~103→107
  closes.push(130);                                           // 23: spike high (resistance)
  for (let i = 0; i < 11; i++) closes.push(112 - i * 0.2);    // drift down
  return closes.map((c, idx) => ({
    t: 1_700_000_000 + idx * 86400,
    o: c, h: c + 1, l: c - 1, c, v: 1000,
  }));
}

describe('detectKeyLevels', () => {
  it('returns empty for too-few candles', () => {
    const r = detectKeyLevels(series().slice(0, 5));
    expect(r.supports).toEqual([]);
    expect(r.resistances).toEqual([]);
  });
  it('detects the swing low as a support near 89 (low of the dip candle)', () => {
    const { supports } = detectKeyLevels(series());
    expect(supports.length).toBeGreaterThan(0);
    expect(supports.some((s) => Math.abs(s.price - 89) < 1.5)).toBe(true);
  });
  it('detects the swing high as a resistance near 131 (high of the spike candle)', () => {
    const { resistances } = detectKeyLevels(series());
    expect(resistances.some((r) => Math.abs(r.price - 131) < 1.5)).toBe(true);
  });
  it('caps to maxLevels', () => {
    const { supports } = detectKeyLevels(series(), { maxLevels: 1 });
    expect(supports.length).toBeLessThanOrEqual(1);
  });
});

describe('suggest helpers', () => {
  it('stop sits just below support', () => {
    expect(suggestStop(100)).toBeCloseTo(99.5, 6);
  });
  it('target sits just below resistance', () => {
    expect(suggestTarget(200)).toBeCloseTo(199, 6);
  });
  it('rLevels project 1R/2R/3R above entry', () => {
    expect(rLevels(150, 145)).toEqual({ r1: 155, r2: 160, r3: 165 });
  });
});

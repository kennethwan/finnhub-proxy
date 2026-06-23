import { describe, it, expect } from 'vitest';
import { getSymbolCurrency, convertCurrency, formatCurrency, formatPercent, EXCHANGE_RATE_HKD_USD } from './format';

describe('getSymbolCurrency', () => {
  it('returns HKD for .HK symbols', () => {
    expect(getSymbolCurrency('0700.HK')).toBe('HKD');
  });
  it('returns USD otherwise', () => {
    expect(getSymbolCurrency('AAPL')).toBe('USD');
  });
});

describe('convertCurrency', () => {
  it('returns same amount when currencies match', () => {
    expect(convertCurrency(100, 'USD', 'USD')).toBe(100);
  });
  it('USD → HKD multiplies by rate', () => {
    expect(convertCurrency(100, 'USD', 'HKD')).toBeCloseTo(100 * EXCHANGE_RATE_HKD_USD, 6);
  });
  it('HKD → USD divides by rate', () => {
    expect(convertCurrency(780, 'HKD', 'USD')).toBeCloseTo(100, 6);
  });
});

describe('formatCurrency', () => {
  it('formats USD in en-US with no conversion', () => {
    expect(formatCurrency(1234.56, 'USD', 'USD')).toBe('$1,234.56');
  });
  it('converts then formats USD→HKD in zh-HK locale', () => {
    const out = formatCurrency(100, 'USD', 'HKD'); // 100 USD → 780 HKD
    expect(out).toContain('780');
    expect(out).toContain('HK$');
  });
  it('formats native HKD without conversion', () => {
    const out = formatCurrency(100, 'HKD', 'HKD');
    expect(out).toContain('100');
    expect(out).toContain('HK$');
  });
});

describe('formatPercent', () => {
  it('adds + sign and 2dp for positives', () => {
    expect(formatPercent(12.345)).toBe('+12.35%');
  });
  it('keeps - sign for negatives', () => {
    expect(formatPercent(-3.3)).toBe('-3.30%');
  });
});

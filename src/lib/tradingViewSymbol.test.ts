import { describe, expect, it } from 'vitest';
import { DEFAULT_TRADING_VIEW_SYMBOL, normalizeTradingViewSymbol } from './tradingViewSymbol';

describe('normalizeTradingViewSymbol', () => {
  it('returns the default symbol for empty input', () => {
    expect(normalizeTradingViewSymbol('')).toBe(DEFAULT_TRADING_VIEW_SYMBOL);
    expect(normalizeTradingViewSymbol('   ')).toBe(DEFAULT_TRADING_VIEW_SYMBOL);
  });

  it('passes US-style symbols through as NASDAQ symbols', () => {
    expect(normalizeTradingViewSymbol('aapl')).toBe('NASDAQ:AAPL');
    expect(normalizeTradingViewSymbol('TSLA')).toBe('NASDAQ:TSLA');
  });

  it('converts Hong Kong .HK symbols to HKEX symbols without leading zeroes', () => {
    expect(normalizeTradingViewSymbol('0700.HK')).toBe('HKEX:700');
    expect(normalizeTradingViewSymbol('0005.hk')).toBe('HKEX:5');
    expect(normalizeTradingViewSymbol('9988.HK')).toBe('HKEX:9988');
  });

  it('keeps already-prefixed TradingView symbols uppercase', () => {
    expect(normalizeTradingViewSymbol('hkex:700')).toBe('HKEX:700');
    expect(normalizeTradingViewSymbol('nasdaq:msft')).toBe('NASDAQ:MSFT');
  });

  it('falls back to the default for malformed Hong Kong suffixes', () => {
    expect(normalizeTradingViewSymbol('ABCD.HK')).toBe(DEFAULT_TRADING_VIEW_SYMBOL);
    expect(normalizeTradingViewSymbol('.HK')).toBe(DEFAULT_TRADING_VIEW_SYMBOL);
  });
});

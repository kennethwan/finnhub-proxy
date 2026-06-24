export const DEFAULT_TRADING_VIEW_SYMBOL = 'NASDAQ:AAPL';

const TV_PREFIX_RE = /^[A-Z0-9_]+:[A-Z0-9._-]+$/;
const US_SYMBOL_RE = /^[A-Z][A-Z0-9._-]{0,9}$/;

export function normalizeTradingViewSymbol(input: string): string {
  const raw = input.trim().toUpperCase();
  if (!raw) return DEFAULT_TRADING_VIEW_SYMBOL;

  if (TV_PREFIX_RE.test(raw)) return raw;

  if (raw.endsWith('.HK')) {
    const code = raw.slice(0, -3);
    if (!/^\d{1,5}$/.test(code)) return DEFAULT_TRADING_VIEW_SYMBOL;
    const numericCode = Number.parseInt(code, 10);
    if (!Number.isFinite(numericCode) || numericCode <= 0) return DEFAULT_TRADING_VIEW_SYMBOL;
    return `HKEX:${numericCode}`;
  }

  if (US_SYMBOL_RE.test(raw)) return `NASDAQ:${raw}`;

  return DEFAULT_TRADING_VIEW_SYMBOL;
}

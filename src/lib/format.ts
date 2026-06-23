import type { Currency } from '@/types/trade';

export const EXCHANGE_RATE_HKD_USD = 7.8;

export function getSymbolCurrency(symbol: string): Currency {
  return symbol && symbol.endsWith('.HK') ? 'HKD' : 'USD';
}

export function convertCurrency(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  if (from === 'USD' && to === 'HKD') return amount * EXCHANGE_RATE_HKD_USD;
  if (from === 'HKD' && to === 'USD') return amount / EXCHANGE_RATE_HKD_USD;
  return amount;
}

export function formatCurrency(amount: number, from: Currency, display: Currency): string {
  const converted = convertCurrency(amount, from, display);
  return new Intl.NumberFormat(display === 'HKD' ? 'zh-HK' : 'en-US', {
    style: 'currency',
    currency: display,
  }).format(converted);
}

export function formatPercent(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

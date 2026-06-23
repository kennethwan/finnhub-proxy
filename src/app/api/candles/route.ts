import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

export const runtime = 'nodejs';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
const RANGE_DAYS: Record<string, number> = { '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365, '2y': 730, '5y': 1825 };
const ALLOWED_INTERVALS = new Set(['1d', '1wk', '1mo']);

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const symbol = sp.get('symbol');
  const rangeKey = RANGE_DAYS[sp.get('range') ?? ''] ? (sp.get('range') as string) : '6mo';
  const interval = ALLOWED_INTERVALS.has(sp.get('interval') ?? '') ? (sp.get('interval') as '1d' | '1wk' | '1mo') : '1d';
  if (!symbol) return NextResponse.json({ error: 'Missing symbol parameter' }, { status: 400, headers: CORS });

  const period1 = new Date(Date.now() - RANGE_DAYS[rangeKey] * 86400 * 1000);
  try {
    const result = await yahooFinance.chart(symbol.toUpperCase(), { period1, interval });
    const candles = (result.quotes ?? [])
      .filter((q) => q.open != null && q.high != null && q.low != null && q.close != null)
      .map((q) => ({
        t: Math.floor(new Date(q.date).getTime() / 1000),
        o: q.open as number, h: q.high as number, l: q.low as number, c: q.close as number, v: q.volume ?? 0,
      }));
    return NextResponse.json({ symbol: symbol.toUpperCase(), range: rangeKey, interval, candles }, { headers: CORS });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'chart failed' }, { status: 500, headers: CORS });
  }
}

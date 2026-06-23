import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

export const runtime = 'nodejs';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const symbols = req.nextUrl.searchParams.get('symbols');
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'FINNHUB_API_KEY not configured' }, { status: 500, headers: CORS });
  if (!symbols) return NextResponse.json({ error: 'Missing symbols parameter' }, { status: 400, headers: CORS });

  const list = symbols.split(',').map((s) => s.trim().toUpperCase());
  const results: Record<string, unknown> = {};
  await Promise.all(list.map(async (symbol) => {
    try {
      if (symbol.endsWith('.HK')) {
        const q = await yahooFinance.quote(symbol);
        results[symbol] = {
          c: q.regularMarketPrice, d: q.regularMarketChange, dp: q.regularMarketChangePercent,
          h: q.regularMarketDayHigh, l: q.regularMarketDayLow, o: q.regularMarketOpen,
          pc: q.regularMarketPreviousClose, t: Math.floor(Date.now() / 1000),
        };
      } else {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}`, {
          headers: { 'X-Finnhub-Token': apiKey },
        });
        results[symbol] = await res.json();
      }
    } catch (e) {
      results[symbol] = { error: e instanceof Error ? e.message : 'fetch failed' };
    }
  }));

  return NextResponse.json(results, { headers: CORS });
}

import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey']
});

const ALLOWED_RANGES = new Set(['1mo', '3mo', '6mo', '1y', '2y', '5y']);
const ALLOWED_INTERVALS = new Set(['1d', '1wk', '1mo']);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { symbol } = req.query;
  const range = ALLOWED_RANGES.has(req.query.range) ? req.query.range : '6mo';
  const interval = ALLOWED_INTERVALS.has(req.query.interval) ? req.query.interval : '1d';

  if (!symbol) return res.status(400).json({ error: 'Missing symbol parameter' });

  try {
    const result = await yahooFinance.chart(symbol.toUpperCase(), { range, interval });
    const candles = (result.quotes || [])
      .filter(q => q.open != null && q.high != null && q.low != null && q.close != null)
      .map(q => ({
        t: Math.floor(new Date(q.date).getTime() / 1000),
        o: q.open,
        h: q.high,
        l: q.low,
        c: q.close,
        v: q.volume ?? 0,
      }));
    return res.status(200).json({ symbol: symbol.toUpperCase(), range, interval, candles });
  } catch (e) {
    console.error(`candles error for ${symbol}:`, e.message);
    return res.status(500).json({ error: e.message });
  }
}

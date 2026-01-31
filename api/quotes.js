import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey']
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { symbols } = req.query;
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'FINNHUB_API_KEY not configured' });
  if (!symbols) return res.status(400).json({ error: 'Missing symbols parameter' });

  const symbolList = symbols.split(',').map(s => s.trim().toUpperCase());
  const results = {};

  await Promise.all(
    symbolList.map(async (symbol) => {
      try {
        if (symbol.endsWith('.HK')) {
          // Yahoo Finance for HK stocks
          const quote = await yahooFinance.quote(symbol);
          results[symbol] = {
            c: quote.regularMarketPrice,
            d: quote.regularMarketChange,
            dp: quote.regularMarketChangePercent,
            h: quote.regularMarketDayHigh,
            l: quote.regularMarketDayLow,
            o: quote.regularMarketOpen,
            pc: quote.regularMarketPreviousClose,
            t: Math.floor(Date.now() / 1000) // approximate timestamp
          };
        } else {
          // Finnhub for others (US stocks)
          const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}`, {
            headers: { 'X-Finnhub-Token': apiKey }
          });
          results[symbol] = await response.json();
        }
      } catch (e) {
        console.error(`Error fetching ${symbol}:`, e.message);
        results[symbol] = { error: e.message };
      }
    })
  );

  return res.status(200).json(results);
}

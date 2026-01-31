export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).end();

  const { symbols } = req.query;
    const apiKey = process.env.FINNHUB_API_KEY;

  if (!symbols) return res.status(400).json({ error: 'Missing symbols' });

  const symbolList = symbols.split(',').map(s => s.trim().toUpperCase());
    const results = {};

  await Promise.all(symbolList.map(async (symbol) => {
        const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}`, {
                headers: { 'X-Finnhub-Token': apiKey }
        });
        results[symbol] = await response.json();
  }));

  return res.status(200).json(results);
}

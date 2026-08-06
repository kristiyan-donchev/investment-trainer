import { Router } from 'express';
import { yahooFinance } from '../lib/yahoo.js';
import { getQuote } from '../lib/quotes.js';

const router = Router();

const RANGE_CONFIG = {
  '1d': { interval: '5m', days: 1 },
  '5d': { interval: '15m', days: 5 },
  '1mo': { interval: '1d', days: 31 },
  '3mo': { interval: '1d', days: 92 },
  '6mo': { interval: '1d', days: 183 },
  '1y': { interval: '1wk', days: 365 },
};

// GET /api/search?q=apple
router.get('/search', async (req, res) => {
  const query = (req.query.q || '').toString().trim();
  if (!query) {
    return res.json({ results: [] });
  }
  try {
    const result = await yahooFinance.search(query, { quotesCount: 8, newsCount: 0 });
    const results = (result.quotes || [])
      .filter((q) => q.symbol && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF' || q.quoteType === 'CRYPTOCURRENCY'))
      .map((q) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchDisp || q.exchange || '',
        type: q.quoteType,
      }));
    res.json({ results });
  } catch (err) {
    console.error('search error', err.message);
    res.status(502).json({ error: 'Failed to search for ticker symbols right now.' });
  }
});

// GET /api/quote/:symbol
router.get('/quote/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    res.json(await getQuote(symbol));
  } catch (err) {
    console.error('quote error', err.message);
    res.status(502).json({ error: `Could not fetch a quote for "${symbol}". It may not be a valid ticker.` });
  }
});

// GET /api/history/:symbol?range=1mo
router.get('/history/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const range = RANGE_CONFIG[req.query.range] ? req.query.range : '1mo';
  const { interval, days } = RANGE_CONFIG[range];

  const period2 = new Date();
  const period1 = new Date(period2.getTime() - days * 24 * 60 * 60 * 1000);

  try {
    const chart = await yahooFinance.chart(symbol, { period1, period2, interval });
    const points = (chart.quotes || [])
      .filter((q) => q.close != null)
      .map((q) => ({
        date: q.date,
        close: q.close,
      }));
    res.json({ symbol, range, points });
  } catch (err) {
    console.error('history error', err.message);
    res.status(502).json({ error: `Could not fetch price history for "${symbol}".` });
  }
});

export default router;

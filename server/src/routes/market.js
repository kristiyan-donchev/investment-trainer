import { Router } from 'express';
import YahooFinance from 'yahoo-finance2';

// The library logs a one-time survey notice to stderr; not useful in a proxy server.
// The custom User-Agent works around Yahoo rate-limiting (HTTP 429) requests from
// cloud/datacenter IPs (e.g. Render) that don't look like an ordinary browser —
// see https://github.com/gadicc/yahoo-finance2/issues/977.
const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey'],
  fetchOptions: {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
  },
});

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
      .filter((q) => q.symbol && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF'))
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

// Yahoo's `quote` endpoint requires a "crumb" token whose fetch gets rate-limited
// (HTTP 429) hard on cloud/datacenter IPs, Render's included — see
// https://github.com/gadicc/yahoo-finance2/issues/977. The `chart` endpoint (used
// for /api/history below) doesn't have this problem, and its metadata carries
// everything a simple quote needs, so we build quotes from it instead.
function deriveMarketState(currentTradingPeriod) {
  if (!currentTradingPeriod) return 'UNKNOWN';
  const now = Date.now();
  for (const [state, period] of [
    ['PRE', currentTradingPeriod.pre],
    ['REGULAR', currentTradingPeriod.regular],
    ['POST', currentTradingPeriod.post],
  ]) {
    if (!period) continue;
    const start = new Date(period.start).getTime();
    const end = new Date(period.end).getTime();
    if (now >= start && now < end) return state;
  }
  return 'CLOSED';
}

// GET /api/quote/:symbol
router.get('/quote/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const period2 = new Date();
    const period1 = new Date(period2.getTime() - 5 * 24 * 60 * 60 * 1000);
    const chart = await yahooFinance.chart(symbol, { period1, period2, interval: '1d' });
    const meta = chart.meta;
    if (!meta || meta.regularMarketPrice == null) {
      return res.status(404).json({ error: `No quote found for "${symbol}".` });
    }

    const price = meta.regularMarketPrice;
    const previousClose = meta.previousClose ?? meta.chartPreviousClose ?? null;
    const change = previousClose != null ? price - previousClose : null;
    const changePercent = previousClose ? (change / previousClose) * 100 : null;

    res.json({
      symbol: meta.symbol,
      name: meta.shortName || meta.longName || meta.symbol,
      price,
      previousClose,
      change,
      changePercent,
      currency: meta.currency || 'USD',
      exchange: meta.fullExchangeName || meta.exchangeName || '',
      marketState: deriveMarketState(meta.currentTradingPeriod),
      dayHigh: meta.regularMarketDayHigh,
      dayLow: meta.regularMarketDayLow,
      marketTime: meta.regularMarketTime,
    });
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

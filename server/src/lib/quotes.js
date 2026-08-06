import { yahooFinance } from './yahoo.js';

// Yahoo's `quote` endpoint requires a "crumb" token whose fetch gets rate-limited
// (HTTP 429) hard on cloud/datacenter IPs, Render's included — see
// https://github.com/gadicc/yahoo-finance2/issues/977. The `chart` endpoint doesn't
// have this problem, and its metadata carries everything a simple quote needs, so
// every price lookup in this app (the /api/quote route, price alerts, limit/stop
// order fills, leaderboard valuation) goes through here instead.
export function deriveMarketState(currentTradingPeriod) {
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

export async function getQuote(symbol) {
  const period2 = new Date();
  const period1 = new Date(period2.getTime() - 5 * 24 * 60 * 60 * 1000);
  const chart = await yahooFinance.chart(symbol, { period1, period2, interval: '1d' });
  const meta = chart.meta;
  if (!meta || meta.regularMarketPrice == null) {
    throw new Error(`No quote found for "${symbol}".`);
  }

  const price = meta.regularMarketPrice;
  const previousClose = meta.previousClose ?? meta.chartPreviousClose ?? null;
  const change = previousClose != null ? price - previousClose : null;
  const changePercent = previousClose ? (change / previousClose) * 100 : null;

  return {
    symbol: meta.symbol,
    name: meta.shortName || meta.longName || meta.symbol,
    type: meta.instrumentType || null,
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
  };
}

// Lighter-weight than getQuote() for background jobs (alerts, order fills) that
// only need the current price for many symbols and don't care about the rest
// of the quote payload.
export async function getPrice(symbol) {
  const quote = await getQuote(symbol);
  return quote.price;
}

// Fetches prices for a batch of distinct symbols in parallel, tolerating
// individual failures (e.g. a delisted ticker) so one bad symbol doesn't sink
// the whole check. Returns { [symbol]: price | undefined }.
export async function getPrices(symbols) {
  const entries = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        return [symbol, await getPrice(symbol)];
      } catch (err) {
        console.error(`getPrices: failed to fetch price for ${symbol}`, err.message);
        return [symbol, undefined];
      }
    })
  );
  return Object.fromEntries(entries);
}

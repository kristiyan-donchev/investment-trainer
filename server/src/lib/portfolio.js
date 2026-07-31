import crypto from 'crypto';
import { pool, STARTING_CASH } from '../db.js';
import { yahooFinance } from './yahoo.js';

const HOLDINGS_SELECT = `SELECT symbol, name, shares, avg_cost AS "avgCost" FROM holdings WHERE user_id = $1`;
const TRANSACTIONS_SELECT = `
  SELECT id, symbol, name, type, shares, price, total, realized_pnl AS "realizedPnL", timestamp
  FROM transactions WHERE user_id = $1 ORDER BY timestamp DESC
`;

// interval/lookback-days per requested range; 'all' has no fixed lookback since
// it's bounded by the account's creation date instead.
const PERFORMANCE_RANGE_CONFIG = {
  '1d': { interval: '5m', days: 1 },
  '1w': { interval: '15m', days: 7 },
  '1mo': { interval: '1d', days: 31 },
  '3mo': { interval: '1d', days: 92 },
  '6mo': { interval: '1d', days: 183 },
  '1y': { interval: '1d', days: 365 },
  all: { interval: '1d', days: null },
};

function holdingsMap(rows) {
  const map = {};
  for (const row of rows) {
    map[row.symbol] = row;
  }
  return map;
}

export async function getPortfolio(userId) {
  const [userResult, holdingsResult, transactionsResult] = await Promise.all([
    pool.query(`SELECT cash FROM users WHERE id = $1`, [userId]),
    pool.query(HOLDINGS_SELECT, [userId]),
    pool.query(TRANSACTIONS_SELECT, [userId]),
  ]);
  return {
    cash: userResult.rows[0].cash,
    holdings: holdingsMap(holdingsResult.rows),
    transactions: transactionsResult.rows,
  };
}

export async function buyShares(userId, { symbol, name, shares, price }) {
  if (!(shares > 0)) throw new Error('Enter a positive number of shares.');
  const cost = shares * price;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query(`SELECT cash FROM users WHERE id = $1 FOR UPDATE`, [userId]);
    const cash = userResult.rows[0].cash;
    if (cost > cash + 1e-9) throw new Error('Not enough virtual cash for this order.');

    const existingResult = await client.query(
      `SELECT symbol, name, shares, avg_cost AS "avgCost" FROM holdings WHERE user_id = $1 AND symbol = $2`,
      [userId, symbol]
    );
    const existing = existingResult.rows[0];
    const newShares = (existing?.shares || 0) + shares;
    const newAvgCost = existing ? (existing.avgCost * existing.shares + cost) / newShares : price;

    await client.query(`UPDATE users SET cash = $1 WHERE id = $2`, [cash - cost, userId]);
    await client.query(
      `INSERT INTO holdings (user_id, symbol, name, shares, avg_cost)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, symbol)
       DO UPDATE SET shares = EXCLUDED.shares, avg_cost = EXCLUDED.avg_cost, name = EXCLUDED.name`,
      [userId, symbol, name, newShares, newAvgCost]
    );
    await client.query(
      `INSERT INTO transactions (id, user_id, symbol, name, type, shares, price, total, realized_pnl, timestamp)
       VALUES ($1, $2, $3, $4, 'BUY', $5, $6, $7, NULL, $8)`,
      [crypto.randomUUID(), userId, symbol, name, shares, price, cost, Date.now()]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return getPortfolio(userId);
}

export async function sellShares(userId, { symbol, name, shares, price }) {
  if (!(shares > 0)) throw new Error('Enter a positive number of shares.');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query(`SELECT cash FROM users WHERE id = $1 FOR UPDATE`, [userId]);
    const cash = userResult.rows[0].cash;

    const existingResult = await client.query(
      `SELECT symbol, name, shares, avg_cost AS "avgCost" FROM holdings WHERE user_id = $1 AND symbol = $2`,
      [userId, symbol]
    );
    const existing = existingResult.rows[0];
    if (!existing || shares > existing.shares + 1e-9) {
      throw new Error(`You only own ${existing?.shares || 0} share(s) of ${symbol}.`);
    }

    const proceeds = shares * price;
    const realizedPnL = (price - existing.avgCost) * shares;
    const remainingShares = existing.shares - shares;

    await client.query(`UPDATE users SET cash = $1 WHERE id = $2`, [cash + proceeds, userId]);
    if (remainingShares <= 1e-9) {
      await client.query(`DELETE FROM holdings WHERE user_id = $1 AND symbol = $2`, [userId, symbol]);
    } else {
      await client.query(`UPDATE holdings SET shares = $1 WHERE user_id = $2 AND symbol = $3`, [
        remainingShares,
        userId,
        symbol,
      ]);
    }
    await client.query(
      `INSERT INTO transactions (id, user_id, symbol, name, type, shares, price, total, realized_pnl, timestamp)
       VALUES ($1, $2, $3, $4, 'SELL', $5, $6, $7, $8, $9)`,
      [crypto.randomUUID(), userId, symbol, name, shares, price, proceeds, realizedPnL, Date.now()]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return getPortfolio(userId);
}

// Reconstructs portfolio value (cash + holdings, marked at each historical price
// point) over time from the transaction log and Yahoo's historical prices, since
// no periodic net-worth snapshots are stored anywhere. Works from account
// inception forward so balances carried into the requested window are correct
// even when the range starts mid-history.
export async function getPerformance(userId, range) {
  const config = PERFORMANCE_RANGE_CONFIG[range] || PERFORMANCE_RANGE_CONFIG['1mo'];

  const userResult = await pool.query(`SELECT created_at FROM users WHERE id = $1`, [userId]);
  const createdAt = userResult.rows[0].created_at;

  const now = Date.now();
  const rangeStart = config.days != null ? now - config.days * 24 * 60 * 60 * 1000 : createdAt;
  const period1 = new Date(Math.max(rangeStart, createdAt));
  const period2 = new Date(now);
  // Yahoo's chart endpoint rejects period1 === period2, which happens for any
  // account created within the last moment (i.e. every brand-new signup) since
  // `period1` above is clamped to `createdAt`. Fetch a padded window so the
  // request stays valid, but keep filtering results to the real range below.
  const fetchPeriod1 = new Date(Math.min(createdAt, now - 24 * 60 * 60 * 1000));

  const txResult = await pool.query(
    `SELECT symbol, type, shares, price, timestamp FROM transactions WHERE user_id = $1 ORDER BY timestamp ASC`,
    [userId]
  );
  const transactions = txResult.rows;
  const symbols = [...new Set(transactions.map((t) => t.symbol))];

  const priceHistories = {};
  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const chart = await yahooFinance.chart(symbol, {
          period1: fetchPeriod1,
          period2,
          interval: config.interval,
        });
        priceHistories[symbol] = (chart.quotes || [])
          .filter((q) => q.close != null)
          .map((q) => ({ time: new Date(q.date).getTime(), close: q.close }));
      } catch (err) {
        console.error(`performance: failed to fetch history for ${symbol}`, err.message);
        priceHistories[symbol] = [];
      }
    })
  );

  const timelineSet = new Set();
  for (const symbol of symbols) {
    for (const point of priceHistories[symbol]) {
      if (point.time >= period1.getTime() && point.time <= period2.getTime()) {
        timelineSet.add(point.time);
      }
    }
  }
  let timeline = [...timelineSet].sort((a, b) => a - b);
  if (timeline.length === 0) {
    // No holdings ever traded, or no price data in range: still show a flat line.
    timeline = [period1.getTime(), period2.getTime()];
  }

  function priceAt(symbol, time) {
    const history = priceHistories[symbol];
    if (!history || history.length === 0) return null;
    let price = null;
    for (const point of history) {
      if (point.time > time) break;
      price = point.close;
    }
    return price ?? history[0].close;
  }

  let txIndex = 0;
  let cash = STARTING_CASH;
  const shares = {};

  const points = timeline.map((time) => {
    while (txIndex < transactions.length && Number(transactions[txIndex].timestamp) <= time) {
      const t = transactions[txIndex];
      const qty = Number(t.shares);
      if (t.type === 'BUY') {
        cash -= qty * Number(t.price);
        shares[t.symbol] = (shares[t.symbol] || 0) + qty;
      } else {
        cash += qty * Number(t.price);
        shares[t.symbol] = (shares[t.symbol] || 0) - qty;
      }
      txIndex += 1;
    }

    let holdingsValue = 0;
    for (const [symbol, qty] of Object.entries(shares)) {
      if (qty <= 1e-9) continue;
      holdingsValue += qty * (priceAt(symbol, time) ?? 0);
    }

    const value = cash + holdingsValue;
    return {
      date: new Date(time).toISOString(),
      value,
      roiPercent: ((value - STARTING_CASH) / STARTING_CASH) * 100,
    };
  });

  return { range, startingCash: STARTING_CASH, points };
}

export async function resetPortfolio(userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE users SET cash = $1 WHERE id = $2`, [STARTING_CASH, userId]);
    await client.query(`DELETE FROM holdings WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM transactions WHERE user_id = $1`, [userId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return getPortfolio(userId);
}

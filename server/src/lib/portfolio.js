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
  // Always anchor the timeline to the full requested span so the chart draws a
  // line (not a single dot) even when there's little or no price data inside
  // it yet — e.g. an account created earlier today.
  timelineSet.add(period1.getTime());
  timelineSet.add(period2.getTime());
  for (const symbol of symbols) {
    for (const point of priceHistories[symbol]) {
      if (point.time >= period1.getTime() && point.time <= period2.getTime()) {
        timelineSet.add(point.time);
      }
    }
  }
  const timeline = [...timelineSet].sort((a, b) => a - b);

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

// Ranks every user by portfolio return over the requested window: (value now -
// value at window start) / value at window start. For a user who joined after
// the window start, the window is clamped to their signup (value at signup is
// always exactly STARTING_CASH, before any trades), so 'all' naturally reduces
// to total return since inception without needing a special case. Price
// history is fetched once per symbol and shared across all users to avoid
// hitting Yahoo once per user.
export async function getLeaderboard(range) {
  const config = PERFORMANCE_RANGE_CONFIG[range] || PERFORMANCE_RANGE_CONFIG['1mo'];
  const now = Date.now();

  const usersResult = await pool.query(`SELECT id, username, created_at FROM users ORDER BY id`);
  const users = usersResult.rows;
  if (users.length === 0) return { range, leaderboard: [] };

  const txResult = await pool.query(
    `SELECT user_id, symbol, type, shares, price, timestamp FROM transactions ORDER BY user_id, timestamp ASC`
  );
  const txByUser = {};
  for (const t of txResult.rows) {
    if (!txByUser[t.user_id]) txByUser[t.user_id] = [];
    txByUser[t.user_id].push(t);
  }
  const symbols = [...new Set(txResult.rows.map((t) => t.symbol))];

  const rangeStart = config.days != null ? now - config.days * 24 * 60 * 60 * 1000 : null;
  const earliestCreatedAt = Math.min(...users.map((u) => Number(u.created_at)));
  const fetchPeriod1 = new Date(Math.min(rangeStart ?? earliestCreatedAt, earliestCreatedAt, now - 24 * 60 * 60 * 1000));
  const period2 = new Date(now);

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
        console.error(`leaderboard: failed to fetch history for ${symbol}`, err.message);
        priceHistories[symbol] = [];
      }
    })
  );

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

  function valueAt(transactions, time) {
    let cash = STARTING_CASH;
    const shares = {};
    for (const t of transactions) {
      if (Number(t.timestamp) > time) break;
      const qty = Number(t.shares);
      if (t.type === 'BUY') {
        cash -= qty * Number(t.price);
        shares[t.symbol] = (shares[t.symbol] || 0) + qty;
      } else {
        cash += qty * Number(t.price);
        shares[t.symbol] = (shares[t.symbol] || 0) - qty;
      }
    }
    let holdingsValue = 0;
    for (const [symbol, qty] of Object.entries(shares)) {
      if (qty <= 1e-9) continue;
      holdingsValue += qty * (priceAt(symbol, time) ?? 0);
    }
    return cash + holdingsValue;
  }

  const leaderboard = users.map((user) => {
    const transactions = txByUser[user.id] || [];
    const createdAt = Number(user.created_at);
    const periodStart = rangeStart != null ? Math.max(rangeStart, createdAt) : createdAt;

    const startValue = valueAt(transactions, periodStart);
    const currentValue = valueAt(transactions, now);
    const roiPercent = startValue > 0 ? ((currentValue - startValue) / startValue) * 100 : 0;

    return { userId: user.id, username: user.username, value: currentValue, roiPercent };
  });

  leaderboard.sort((a, b) => b.roiPercent - a.roiPercent);
  leaderboard.forEach((entry, i) => {
    entry.rank = i + 1;
  });

  return { range, leaderboard: leaderboard.slice(0, 100) };
}

// Leaderboard cuts other than ROI. Unlike getLeaderboard() above, these never
// need Yahoo price history — trade count, best single win, and current
// diversification are all directly queryable from transactions/holdings.

export async function getMostActiveLeaderboard(range) {
  const config = PERFORMANCE_RANGE_CONFIG[range] || PERFORMANCE_RANGE_CONFIG['1mo'];
  const windowStart = config.days != null ? Date.now() - config.days * 24 * 60 * 60 * 1000 : null;

  const result = await pool.query(
    `SELECT u.id AS "userId", u.username,
            COALESCE(COUNT(t.id), 0)::int AS "tradeCount"
     FROM users u
     LEFT JOIN transactions t ON t.user_id = u.id AND ($1::bigint IS NULL OR t.timestamp >= $1)
     GROUP BY u.id, u.username
     ORDER BY "tradeCount" DESC, u.id ASC`,
    [windowStart]
  );
  const leaderboard = result.rows.map((row, i) => ({ ...row, rank: i + 1 }));
  return { range, category: 'active', leaderboard: leaderboard.slice(0, 100) };
}

export async function getBiggestWinLeaderboard(range) {
  const config = PERFORMANCE_RANGE_CONFIG[range] || PERFORMANCE_RANGE_CONFIG['1mo'];
  const windowStart = config.days != null ? Date.now() - config.days * 24 * 60 * 60 * 1000 : null;

  const result = await pool.query(
    `SELECT u.id AS "userId", u.username,
            COALESCE(MAX(t.realized_pnl), 0) AS "bestWin",
            (ARRAY_AGG(t.symbol ORDER BY t.realized_pnl DESC))[1] AS "bestWinSymbol"
     FROM users u
     LEFT JOIN transactions t ON t.user_id = u.id AND t.type = 'SELL' AND t.realized_pnl IS NOT NULL
       AND ($1::bigint IS NULL OR t.timestamp >= $1)
     GROUP BY u.id, u.username
     ORDER BY "bestWin" DESC, u.id ASC`,
    [windowStart]
  );
  const leaderboard = result.rows.map((row, i) => ({ ...row, rank: i + 1 }));
  return { range, category: 'biggest_win', leaderboard: leaderboard.slice(0, 100) };
}

export async function getDiversificationLeaderboard() {
  const result = await pool.query(
    `SELECT u.id AS "userId", u.username,
            COALESCE(COUNT(DISTINCT h.symbol), 0)::int AS "holdingCount"
     FROM users u
     LEFT JOIN holdings h ON h.user_id = u.id
     GROUP BY u.id, u.username
     ORDER BY "holdingCount" DESC, u.id ASC`
  );
  const leaderboard = result.rows.map((row, i) => ({ ...row, rank: i + 1 }));
  return { category: 'diversified', leaderboard: leaderboard.slice(0, 100) };
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

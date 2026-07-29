import crypto from 'crypto';
import { pool, STARTING_CASH } from '../db.js';

const HOLDINGS_SELECT = `SELECT symbol, name, shares, avg_cost AS "avgCost" FROM holdings WHERE user_id = $1`;
const TRANSACTIONS_SELECT = `
  SELECT id, symbol, name, type, shares, price, total, realized_pnl AS "realizedPnL", timestamp
  FROM transactions WHERE user_id = $1 ORDER BY timestamp DESC
`;

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

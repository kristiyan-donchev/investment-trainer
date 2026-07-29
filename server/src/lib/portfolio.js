import crypto from 'crypto';
import db, { STARTING_CASH } from '../db.js';

const selectUserCash = db.prepare(`SELECT cash FROM users WHERE id = ?`);
const updateUserCash = db.prepare(`UPDATE users SET cash = ? WHERE id = ?`);
const selectHoldings = db.prepare(`SELECT symbol, name, shares, avg_cost AS avgCost FROM holdings WHERE user_id = ?`);
const selectHolding = db.prepare(`SELECT symbol, name, shares, avg_cost AS avgCost FROM holdings WHERE user_id = ? AND symbol = ?`);
const upsertHolding = db.prepare(`
  INSERT INTO holdings (user_id, symbol, name, shares, avg_cost)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(user_id, symbol) DO UPDATE SET shares = excluded.shares, avg_cost = excluded.avg_cost, name = excluded.name
`);
const deleteHolding = db.prepare(`DELETE FROM holdings WHERE user_id = ? AND symbol = ?`);
const insertTransaction = db.prepare(`
  INSERT INTO transactions (id, user_id, symbol, name, type, shares, price, total, realized_pnl, timestamp)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const selectTransactions = db.prepare(
  `SELECT id, symbol, name, type, shares, price, total, realized_pnl AS realizedPnL, timestamp
   FROM transactions WHERE user_id = ? ORDER BY timestamp DESC`
);
const deleteHoldingsForUser = db.prepare(`DELETE FROM holdings WHERE user_id = ?`);
const deleteTransactionsForUser = db.prepare(`DELETE FROM transactions WHERE user_id = ?`);

function holdingsMap(userId) {
  const rows = selectHoldings.all(userId);
  const map = {};
  for (const row of rows) {
    map[row.symbol] = row;
  }
  return map;
}

export function getPortfolio(userId) {
  const user = selectUserCash.get(userId);
  return {
    cash: user.cash,
    holdings: holdingsMap(userId),
    transactions: selectTransactions.all(userId),
  };
}

export function buyShares(userId, { symbol, name, shares, price }) {
  if (!(shares > 0)) throw new Error('Enter a positive number of shares.');
  const cost = shares * price;
  const user = selectUserCash.get(userId);
  if (cost > user.cash + 1e-9) throw new Error('Not enough virtual cash for this order.');

  const existing = selectHolding.get(userId, symbol);
  const newShares = (existing?.shares || 0) + shares;
  const newAvgCost = existing ? (existing.avgCost * existing.shares + cost) / newShares : price;

  db.exec('BEGIN');
  try {
    updateUserCash.run(user.cash - cost, userId);
    upsertHolding.run(userId, symbol, name, newShares, newAvgCost);
    insertTransaction.run(
      crypto.randomUUID(),
      userId,
      symbol,
      name,
      'BUY',
      shares,
      price,
      cost,
      null,
      Date.now()
    );
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return getPortfolio(userId);
}

export function sellShares(userId, { symbol, name, shares, price }) {
  if (!(shares > 0)) throw new Error('Enter a positive number of shares.');
  const existing = selectHolding.get(userId, symbol);
  if (!existing || shares > existing.shares + 1e-9) {
    throw new Error(`You only own ${existing?.shares || 0} share(s) of ${symbol}.`);
  }

  const proceeds = shares * price;
  const realizedPnL = (price - existing.avgCost) * shares;
  const remainingShares = existing.shares - shares;
  const user = selectUserCash.get(userId);

  db.exec('BEGIN');
  try {
    updateUserCash.run(user.cash + proceeds, userId);
    if (remainingShares <= 1e-9) {
      deleteHolding.run(userId, symbol);
    } else {
      upsertHolding.run(userId, symbol, name, remainingShares, existing.avgCost);
    }
    insertTransaction.run(
      crypto.randomUUID(),
      userId,
      symbol,
      name,
      'SELL',
      shares,
      price,
      proceeds,
      realizedPnL,
      Date.now()
    );
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return getPortfolio(userId);
}

export function resetPortfolio(userId) {
  db.exec('BEGIN');
  try {
    updateUserCash.run(STARTING_CASH, userId);
    deleteHoldingsForUser.run(userId);
    deleteTransactionsForUser.run(userId);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return getPortfolio(userId);
}

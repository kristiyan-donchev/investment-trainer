import { pool } from '../db.js';

export async function getWatchlist(userId) {
  const result = await pool.query(
    `SELECT symbol, name, added_at AS "addedAt" FROM watchlist WHERE user_id = $1 ORDER BY added_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function addToWatchlist(userId, { symbol, name }) {
  await pool.query(
    `INSERT INTO watchlist (user_id, symbol, name, added_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, symbol) DO NOTHING`,
    [userId, symbol, name, Date.now()]
  );
  return getWatchlist(userId);
}

export async function removeFromWatchlist(userId, symbol) {
  await pool.query(`DELETE FROM watchlist WHERE user_id = $1 AND symbol = $2`, [userId, symbol]);
  return getWatchlist(userId);
}

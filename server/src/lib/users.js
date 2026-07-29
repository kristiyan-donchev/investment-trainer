import { pool, STARTING_CASH } from '../db.js';

export async function createUser({ username, email, passwordHash }) {
  const result = await pool.query(
    `INSERT INTO users (username, email, password_hash, cash, created_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [username, email, passwordHash, STARTING_CASH, Date.now()]
  );
  return result.rows[0];
}

export async function findUserByUsername(username) {
  const result = await pool.query(`SELECT * FROM users WHERE username = $1`, [username]);
  return result.rows[0] || null;
}

export async function findUserByEmail(email) {
  const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
  return result.rows[0] || null;
}

export async function findUserById(id) {
  const result = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

export function toPublicUser(user) {
  return { id: user.id, username: user.username, email: user.email };
}

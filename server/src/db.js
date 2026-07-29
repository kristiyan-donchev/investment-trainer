import pgPkg from 'pg';

const { Pool, types } = pgPkg;

// node-postgres returns BIGINT (OID 20) as a string by default to avoid silent
// precision loss. Our timestamps fit safely in a JS number, so parse them back.
types.setTypeParser(20, (val) => parseInt(val, 10));

export const STARTING_CASH = 10000;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Point it at a Postgres instance (see server/.env.example) — ' +
      'a free Neon or Supabase database works well for both local development and production.'
  );
}

export const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
});

export async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      cash DOUBLE PRECISION NOT NULL DEFAULT ${STARTING_CASH},
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS holdings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      symbol TEXT NOT NULL,
      name TEXT NOT NULL,
      shares DOUBLE PRECISION NOT NULL,
      avg_cost DOUBLE PRECISION NOT NULL,
      UNIQUE(user_id, symbol)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      symbol TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      shares DOUBLE PRECISION NOT NULL,
      price DOUBLE PRECISION NOT NULL,
      total DOUBLE PRECISION NOT NULL,
      realized_pnl DOUBLE PRECISION,
      timestamp BIGINT NOT NULL
    );
  `);
}

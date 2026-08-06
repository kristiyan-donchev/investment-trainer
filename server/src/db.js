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
      password_hash TEXT,
      google_id TEXT UNIQUE,
      cash DOUBLE PRECISION NOT NULL DEFAULT ${STARTING_CASH},
      created_at BIGINT NOT NULL
    );

    -- Migrate existing deployments created before Google sign-in was added.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

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

    CREATE TABLE IF NOT EXISTS watchlist (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      symbol TEXT NOT NULL,
      name TEXT NOT NULL,
      added_at BIGINT NOT NULL,
      UNIQUE(user_id, symbol)
    );

    CREATE TABLE IF NOT EXISTS price_alerts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      symbol TEXT NOT NULL,
      name TEXT NOT NULL,
      direction TEXT NOT NULL, -- 'above' | 'below'
      target_price DOUBLE PRECISION NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at BIGINT NOT NULL,
      triggered_at BIGINT,
      triggered_price DOUBLE PRECISION,
      seen BOOLEAN NOT NULL DEFAULT TRUE
    );

    -- Limit/stop/stop-limit orders. Unlike market orders (executed inline in
    -- buyShares/sellShares), these sit PENDING until a scheduled job in
    -- index.js sees the trigger condition met and fills them at the then-
    -- current price via the same buyShares/sellShares functions.
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      symbol TEXT NOT NULL,
      name TEXT NOT NULL,
      side TEXT NOT NULL, -- 'BUY' | 'SELL'
      order_type TEXT NOT NULL, -- 'LIMIT' | 'STOP' | 'STOP_LIMIT'
      shares DOUBLE PRECISION NOT NULL,
      limit_price DOUBLE PRECISION,
      stop_price DOUBLE PRECISION,
      stop_triggered BOOLEAN NOT NULL DEFAULT FALSE,
      status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'FILLED' | 'CANCELLED'
      created_at BIGINT NOT NULL,
      filled_at BIGINT,
      filled_price DOUBLE PRECISION,
      cancel_reason TEXT
    );
  `);
}

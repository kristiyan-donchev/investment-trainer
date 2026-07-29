# Investment Trainer

A beginner-friendly **paper-trading simulator** for learning how stock investing works — using real,
delayed market prices and **100% virtual money**.

> ⚠️ **This is an educational simulator only.** There is no real money, no real brokerage account,
> and no real orders are ever placed. Nothing in this app can move, invest, or risk actual funds.
> It exists purely to help beginners practice the mechanics of researching and "trading" stocks
> in a risk-free environment. Nothing here is financial advice.

## What it does

- **Real user accounts.** Sign up with a username, email, and password, then log in/out. Each
  account gets its own portfolio — see [Accounts & auth](#accounts--auth) below.
- Gives every new account **$10,000 in virtual cash** to start.
- Lets you **search real ticker symbols** (e.g. `AAPL`, `MSFT`, `TSLA`) by company name or symbol.
- Shows the **current price** and a **recent price history chart** (1 day up to 1 year) for any
  stock, pulled live from Yahoo Finance.
- Lets you place simulated **market buy/sell orders** at the live price.
- Tracks your **portfolio**: current holdings, average cost basis, live market value, unrealized
  P&L per holding, and total/realized P&L.
- Keeps a full **transaction history** log of every simulated trade.
- Includes **plain-language explanations** (via hover/tap tooltips and an onboarding "Help" panel)
  for beginner terms like *market order*, *P&L*, *cost basis*, *diversification*, *ticker symbol*,
  and *volatility*.
- **Persists per-account server-side** in a local SQLite database — each user's cash, holdings, and
  transaction history are scoped to their account.

## Accounts & auth

- **Sign up / log in / log out** with a username, email, and password. Passwords are hashed with
  **bcrypt** (via `bcryptjs`) before being stored — plaintext passwords are never saved.
- Sessions are handled with a **JWT stored in an `httpOnly` cookie** (not `localStorage`, to reduce
  XSS exposure). The API's portfolio routes are protected by auth middleware that checks this
  cookie and only ever reads/writes the requesting user's own data.
- Every new account starts with **$10,000 in virtual cash** and an empty portfolio — there is no
  migration path from the old browser-`localStorage`-only version, so upgrading from an older copy
  of this app means starting fresh under a new account. That's expected and fine for a learning
  tool.
- **Security caveats (read before relying on this for anything beyond local practice):**
  - This is a **local, single-machine app**, not a hardened multi-tenant service. It has not had a
    security audit and should not be exposed to the public internet as-is.
  - There is **no email verification** and **no password reset flow** — if you forget your
    password, there's no recovery path other than editing the SQLite database directly.
  - There is **no rate limiting** on login/signup, no account lockout, and no CSRF protection beyond
    the cookie's `SameSite=Lax` setting.
  - The JWT signing secret (`JWT_SECRET`) should be set via `.env` for any persistent use; if it's
    left unset the server generates a random one at startup, which invalidates all sessions on
    every restart (see [Setup & running locally](#setup--running-locally)).

## Tech stack

- **Frontend:** React 18 + Vite, plain CSS (light/dark aware), [Recharts](https://recharts.org/) for
  the price chart. A small `AuthContext` handles the logged-in user and gates the trading UI behind
  a login/signup screen.
- **Backend:** a small Node.js + Express server that proxies market-data requests to
  [`yahoo-finance2`](https://github.com/gadicc/node-yahoo-finance2) (an unofficial, free,
  no-API-key-required wrapper around Yahoo Finance's public data), plus auth (`bcryptjs` +
  `jsonwebtoken` + `cookie-parser`) and per-user portfolio routes. The market-data proxy also avoids
  CORS issues calling Yahoo Finance directly from the browser.
- **Persistence:** SQLite via Node's built-in [`node:sqlite`](https://nodejs.org/api/sqlite.html)
  module (no extra native dependency needed) — one local database file at
  `server/data/investment-trainer.db`, storing `users`, `holdings`, and `transactions` tables scoped
  by `user_id`. This requires **Node 22.5+** (see below).

## Project structure

```
investment-trainer/
├── server/
│   ├── data/                  # SQLite database file lives here (gitignored)
│   └── src/
│       ├── routes/            # /api/search, /api/quote/:symbol, /api/history/:symbol,
│       │                      # /api/auth/*, /api/portfolio/*
│       ├── middleware/auth.js # JWT-cookie auth guard for portfolio routes
│       ├── lib/                # users.js, portfolio.js (DB access), jwt.js
│       └── db.js              # SQLite connection + schema setup
└── client/     # React + Vite frontend
```

## Setup & running locally

Requires [Node.js](https://nodejs.org/) **22.5+** (tested with Node 24 — needed for the built-in
`node:sqlite` module) and npm.

**1. Install dependencies (in two terminals, or sequentially):**

```bash
cd server && npm install
cd ../client && npm install
```

**2. Configure the server's environment:**

```bash
cd server
cp .env.example .env
```

Edit `server/.env` and set `JWT_SECRET` to a long random string (used to sign login sessions). If
you skip this, the server will still run — it just generates a random secret at startup, which logs
everyone out whenever the server restarts.

**3. Run the backend (API + auth + market-data proxy), from `server/`:**

```bash
npm run dev
```

This starts the API on `http://localhost:4000` and creates/opens the SQLite database at
`server/data/investment-trainer.db` on first run.

**4. Run the frontend, from `client/`:**

```bash
npm run dev
```

This starts the Vite dev server on `http://localhost:5173` (it proxies `/api/*` requests to the
backend on port 4000, so both need to be running). Open that URL in your browser.

**Production build** (frontend only — this is a local dev tool, there's no deployed build/CDN
step included):

```bash
cd client && npm run build && npm run preview
```

## Limitations

- **Data delay:** Yahoo Finance quotes are typically delayed ~15 minutes for most exchanges (this
  is standard for free market data). This app is for practice and learning, not real-time trading.
- **Unofficial data source:** `yahoo-finance2` is an unofficial community library that scrapes
  Yahoo Finance's public endpoints. Yahoo can change or restrict these endpoints at any time without
  notice, which could occasionally cause quote/search/chart requests to fail or need library updates.
- **Market hours:** outside of regular market hours, "current price" reflects the last available
  quote (pre-market/after-hours/previous close), which the UI labels via the market state shown
  next to the price.
- **Rate limits:** the free Yahoo Finance data source has informal rate limits. Heavy, rapid-fire
  searching/quoting could occasionally get temporarily throttled.
- **Accounts are real but not production-hardened:** see [Accounts & auth](#accounts--auth) above —
  no email verification, no password reset, no rate limiting. This is still meant for one person
  running the app locally, just with proper per-account separation instead of one shared browser
  profile. Use the in-app "Reset simulator" button if you want to intentionally wipe your own
  portfolio and start over.
- Market orders only — no limit orders, stop orders, options, short selling, margin, dividends, or
  fees/commissions are modeled. This keeps the simulator simple and focused on core buy/sell/P&L
  mechanics for beginners.

## Disclaimer

Investment Trainer is provided for **educational purposes only**. It is not a broker-dealer, does
not handle real money or securities, and nothing in this app constitutes financial, investment, or
trading advice. Simulated results do not guarantee or predict real-world investing outcomes.

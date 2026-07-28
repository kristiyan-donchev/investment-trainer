# Investment Trainer

A beginner-friendly **paper-trading simulator** for learning how stock investing works — using real,
delayed market prices and **100% virtual money**.

> ⚠️ **This is an educational simulator only.** There is no real money, no real brokerage account,
> and no real orders are ever placed. Nothing in this app can move, invest, or risk actual funds.
> It exists purely to help beginners practice the mechanics of researching and "trading" stocks
> in a risk-free environment. Nothing here is financial advice.

## What it does

- Gives you **$10,000 in virtual cash** to start.
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
- **Persists everything locally** in your browser's `localStorage` — no account, no sign-up, no
  server-side database. It's a single-user local simulator that lives entirely on your machine.

## Tech stack

- **Frontend:** React 18 + Vite, plain CSS (light/dark aware), [Recharts](https://recharts.org/) for
  the price chart.
- **Backend:** a small Node.js + Express server that proxies market-data requests to
  [`yahoo-finance2`](https://github.com/gadicc/node-yahoo-finance2) (an unofficial, free,
  no-API-key-required wrapper around Yahoo Finance's public data). The proxy exists to avoid CORS
  issues calling Yahoo Finance directly from the browser, and to keep the market-data dependency out
  of the client bundle.
- **Persistence:** browser `localStorage` — no database, no user accounts, nothing multi-tenant.

## Project structure

```
investment-trainer/
├── server/     # Express API: /api/search, /api/quote/:symbol, /api/history/:symbol
└── client/     # React + Vite frontend
```

## Setup & running locally

Requires [Node.js](https://nodejs.org/) 18+ (tested with Node 24) and npm.

**1. Install dependencies (in two terminals, or sequentially):**

```bash
cd server && npm install
cd ../client && npm install
```

**2. Run the backend (market-data proxy), from `server/`:**

```bash
npm run dev
```

This starts the API on `http://localhost:4000`.

**3. Run the frontend, from `client/`:**

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
- **No real accounts, no auth:** by design, this is a single-user local tool. All state lives in
  your browser's `localStorage` for one browser/profile — clearing site data, using a different
  browser, or using incognito mode will reset or hide your portfolio. Use the in-app "Reset
  simulator" button if you want to intentionally start over.
- Market orders only — no limit orders, stop orders, options, short selling, margin, dividends, or
  fees/commissions are modeled. This keeps the simulator simple and focused on core buy/sell/P&L
  mechanics for beginners.

## Disclaimer

Investment Trainer is provided for **educational purposes only**. It is not a broker-dealer, does
not handle real money or securities, and nothing in this app constitutes financial, investment, or
trading advice. Simulated results do not guarantee or predict real-world investing outcomes.

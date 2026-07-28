export const STARTING_CASH = 10000;
export const STORAGE_KEY = 'investment-trainer-state-v1';

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      cash: typeof parsed.cash === 'number' ? parsed.cash : STARTING_CASH,
      holdings: parsed.holdings || {},
      transactions: parsed.transactions || [],
    };
  } catch {
    return defaultState();
  }
}

export function defaultState() {
  return { cash: STARTING_CASH, holdings: {}, transactions: [] };
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Pure reducer-style helpers. Each returns a NEW state object.

export function buyShares(state, { symbol, name, shares, price }) {
  const cost = shares * price;
  if (shares <= 0) throw new Error('Enter a positive number of shares.');
  if (cost > state.cash + 1e-9) throw new Error('Not enough virtual cash for this order.');

  const existing = state.holdings[symbol];
  const newShares = (existing?.shares || 0) + shares;
  const newAvgCost = existing
    ? (existing.avgCost * existing.shares + cost) / newShares
    : price;

  const transaction = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    symbol,
    name,
    type: 'BUY',
    shares,
    price,
    total: cost,
    realizedPnL: null,
  };

  return {
    cash: state.cash - cost,
    holdings: {
      ...state.holdings,
      [symbol]: { symbol, name, shares: newShares, avgCost: newAvgCost },
    },
    transactions: [transaction, ...state.transactions],
  };
}

export function sellShares(state, { symbol, name, shares, price }) {
  const existing = state.holdings[symbol];
  if (shares <= 0) throw new Error('Enter a positive number of shares.');
  if (!existing || shares > existing.shares + 1e-9) {
    throw new Error(`You only own ${existing?.shares || 0} share(s) of ${symbol}.`);
  }

  const proceeds = shares * price;
  const realizedPnL = (price - existing.avgCost) * shares;
  const remainingShares = existing.shares - shares;

  const newHoldings = { ...state.holdings };
  if (remainingShares <= 1e-9) {
    delete newHoldings[symbol];
  } else {
    newHoldings[symbol] = { ...existing, shares: remainingShares };
  }

  const transaction = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    symbol,
    name,
    type: 'SELL',
    shares,
    price,
    total: proceeds,
    realizedPnL,
  };

  return {
    cash: state.cash + proceeds,
    holdings: newHoldings,
    transactions: [transaction, ...state.transactions],
  };
}

export function totalRealizedPnL(transactions) {
  return transactions.reduce((sum, t) => sum + (t.realizedPnL || 0), 0);
}

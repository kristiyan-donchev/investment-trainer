export const STARTING_CASH = 10000;

export function defaultState() {
  return { cash: STARTING_CASH, holdings: {}, transactions: [] };
}

export function totalRealizedPnL(transactions) {
  return transactions.reduce((sum, t) => sum + (t.realizedPnL || 0), 0);
}

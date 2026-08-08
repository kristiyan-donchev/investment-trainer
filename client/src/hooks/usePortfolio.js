import { useCallback, useEffect, useState } from 'react';
import { fetchPortfolio, buyShares, sellShares, resetPortfolio } from '../lib/api.js';
import { defaultState } from '../lib/portfolio.js';
import { useAuth } from '../context/AuthContext.jsx';

// Limit/stop/stop-limit orders can fill in the background (a scheduled server
// job, not a click in this tab), so cash/holdings are re-fetched on a timer —
// same cadence as the quote refresh elsewhere in the app — rather than only
// after a buy/sell/reset this tab itself triggered.
const PORTFOLIO_REFRESH_MS = 20000;

export function usePortfolio() {
  const { user } = useAuth();
  const [state, setState] = useState(() => defaultState());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    function load(isInitial) {
      fetchPortfolio()
        .then((portfolio) => {
          if (!cancelled) setState(portfolio);
        })
        .catch((err) => {
          if (!cancelled && isInitial) setError(err.message);
        })
        .finally(() => {
          if (!cancelled && isInitial) setLoading(false);
        });
    }
    load(true);
    const interval = setInterval(() => load(false), PORTFOLIO_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  const buy = useCallback(async (order) => {
    setError(null);
    try {
      const portfolio = await buyShares(order);
      setState(portfolio);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  const sell = useCallback(async (order) => {
    setError(null);
    try {
      const portfolio = await sellShares(order);
      setState(portfolio);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  const reset = useCallback(async () => {
    setError(null);
    try {
      const portfolio = await resetPortfolio();
      setState(portfolio);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  return { state, loading, buy, sell, reset, error, setError };
}

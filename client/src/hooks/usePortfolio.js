import { useCallback, useEffect, useState } from 'react';
import { fetchPortfolio, buyShares, sellShares, resetPortfolio } from '../lib/api.js';
import { defaultState } from '../lib/portfolio.js';

export function usePortfolio() {
  const [state, setState] = useState(() => defaultState());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchPortfolio()
      .then((portfolio) => {
        if (!cancelled) setState(portfolio);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

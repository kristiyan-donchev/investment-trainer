import { useCallback, useEffect, useState } from 'react';
import { loadState, saveState, buyShares, sellShares, defaultState } from '../lib/portfolio.js';

export function usePortfolio() {
  const [state, setState] = useState(() => loadState());
  const [error, setError] = useState(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const buy = useCallback((order) => {
    setError(null);
    try {
      setState((prev) => buyShares(prev, order));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  const sell = useCallback((order) => {
    setError(null);
    try {
      setState((prev) => sellShares(prev, order));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setState(defaultState());
  }, []);

  return { state, buy, sell, reset, error, setError };
}

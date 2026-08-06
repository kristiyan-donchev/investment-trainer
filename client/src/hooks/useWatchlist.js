import { useCallback, useEffect, useState } from 'react';
import { fetchWatchlist, addToWatchlist, removeFromWatchlist } from '../lib/api.js';

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchWatchlist()
      .then((list) => {
        if (!cancelled) setWatchlist(list);
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

  const add = useCallback(async (symbol, name) => {
    setError(null);
    try {
      setWatchlist(await addToWatchlist({ symbol, name }));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const remove = useCallback(async (symbol) => {
    setError(null);
    try {
      setWatchlist(await removeFromWatchlist(symbol));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const isWatching = useCallback((symbol) => watchlist.some((w) => w.symbol === symbol), [watchlist]);

  return { watchlist, loading, error, add, remove, isWatching };
}

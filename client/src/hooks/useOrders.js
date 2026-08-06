import { useCallback, useEffect, useState } from 'react';
import { fetchOrders, placeOrder, cancelOrder } from '../lib/api.js';

// Pending orders fill via a scheduled server job, not a click in this tab, so
// poll for status changes rather than only refreshing after a local action.
const ORDERS_REFRESH_MS = 20000;

export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    return fetchOrders()
      .then((list) => setOrders(list))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    const interval = setInterval(refresh, ORDERS_REFRESH_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const place = useCallback(async (order) => {
    setError(null);
    try {
      setOrders(await placeOrder(order));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  const cancel = useCallback(async (id) => {
    setError(null);
    try {
      setOrders(await cancelOrder(id));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  return { orders, loading, error, place, cancel, refresh };
}

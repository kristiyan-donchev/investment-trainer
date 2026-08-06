import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listOrders, placeOrder, cancelOrder } from '../lib/orders.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    res.json({ orders: await listOrders(req.userId) });
  } catch (err) {
    console.error('get orders error', err.message);
    res.status(500).json({ error: 'Could not load your orders right now.' });
  }
});

router.post('/', async (req, res) => {
  const { symbol, name, side, orderType, shares, limitPrice, stopPrice } = req.body || {};
  try {
    res.json({
      orders: await placeOrder(req.userId, {
        symbol: typeof symbol === 'string' ? symbol.toUpperCase() : symbol,
        name,
        side,
        orderType,
        shares: Number(shares),
        limitPrice: limitPrice != null ? Number(limitPrice) : null,
        stopPrice: stopPrice != null ? Number(stopPrice) : null,
      }),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/cancel', async (req, res) => {
  try {
    res.json({ orders: await cancelOrder(req.userId, req.params.id) });
  } catch (err) {
    console.error('cancel order error', err.message);
    res.status(500).json({ error: 'Could not cancel that order right now.' });
  }
});

export default router;

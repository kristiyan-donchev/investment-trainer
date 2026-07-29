import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getPortfolio, buyShares, sellShares, resetPortfolio } from '../lib/portfolio.js';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  res.json(getPortfolio(req.userId));
});

router.post('/buy', (req, res) => {
  const { symbol, name, shares, price } = req.body || {};
  try {
    const portfolio = buyShares(req.userId, {
      symbol,
      name,
      shares: Number(shares),
      price: Number(price),
    });
    res.json(portfolio);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/sell', (req, res) => {
  const { symbol, name, shares, price } = req.body || {};
  try {
    const portfolio = sellShares(req.userId, {
      symbol,
      name,
      shares: Number(shares),
      price: Number(price),
    });
    res.json(portfolio);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/reset', (req, res) => {
  res.json(resetPortfolio(req.userId));
});

export default router;

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getPortfolio,
  buyShares,
  sellShares,
  resetPortfolio,
  getPerformance,
  getLeaderboard,
  getMostActiveLeaderboard,
  getBiggestWinLeaderboard,
  getDiversificationLeaderboard,
} from '../lib/portfolio.js';

const router = Router();

const PERFORMANCE_RANGES = ['1d', '1w', '1mo', '3mo', '6mo', '1y', 'all'];
const LEADERBOARD_CATEGORIES = ['return', 'active', 'biggest_win', 'diversified'];

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    res.json(await getPortfolio(req.userId));
  } catch (err) {
    console.error('get portfolio error', err.message);
    res.status(500).json({ error: 'Could not load your portfolio right now.' });
  }
});

router.get('/performance', async (req, res) => {
  const range = PERFORMANCE_RANGES.includes(req.query.range) ? req.query.range : '1mo';
  try {
    res.json(await getPerformance(req.userId, range));
  } catch (err) {
    console.error('performance error', err.message);
    res.status(502).json({ error: 'Could not load portfolio performance right now.' });
  }
});

router.get('/leaderboard', async (req, res) => {
  const range = PERFORMANCE_RANGES.includes(req.query.range) ? req.query.range : '1mo';
  const category = LEADERBOARD_CATEGORIES.includes(req.query.category) ? req.query.category : 'return';
  try {
    if (category === 'active') return res.json(await getMostActiveLeaderboard(range));
    if (category === 'biggest_win') return res.json(await getBiggestWinLeaderboard(range));
    if (category === 'diversified') return res.json(await getDiversificationLeaderboard());
    res.json({ ...(await getLeaderboard(range)), category: 'return' });
  } catch (err) {
    console.error('leaderboard error', err.message);
    res.status(502).json({ error: 'Could not load the leaderboard right now.' });
  }
});

router.post('/buy', async (req, res) => {
  const { symbol, name, shares, price } = req.body || {};
  try {
    const portfolio = await buyShares(req.userId, {
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

router.post('/sell', async (req, res) => {
  const { symbol, name, shares, price } = req.body || {};
  try {
    const portfolio = await sellShares(req.userId, {
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

router.post('/reset', async (req, res) => {
  try {
    res.json(await resetPortfolio(req.userId));
  } catch (err) {
    console.error('reset portfolio error', err.message);
    res.status(500).json({ error: 'Could not reset your portfolio right now.' });
  }
});

export default router;

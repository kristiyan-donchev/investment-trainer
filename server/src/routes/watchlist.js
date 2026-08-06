import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getWatchlist, addToWatchlist, removeFromWatchlist } from '../lib/watchlist.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    res.json({ watchlist: await getWatchlist(req.userId) });
  } catch (err) {
    console.error('get watchlist error', err.message);
    res.status(500).json({ error: 'Could not load your watchlist right now.' });
  }
});

router.post('/', async (req, res) => {
  const { symbol, name } = req.body || {};
  if (typeof symbol !== 'string' || !symbol.trim()) {
    return res.status(400).json({ error: 'A symbol is required.' });
  }
  try {
    res.json({ watchlist: await addToWatchlist(req.userId, { symbol: symbol.toUpperCase(), name: name || symbol }) });
  } catch (err) {
    console.error('add watchlist error', err.message);
    res.status(500).json({ error: 'Could not add that to your watchlist right now.' });
  }
});

router.delete('/:symbol', async (req, res) => {
  try {
    res.json({ watchlist: await removeFromWatchlist(req.userId, req.params.symbol.toUpperCase()) });
  } catch (err) {
    console.error('remove watchlist error', err.message);
    res.status(500).json({ error: 'Could not remove that from your watchlist right now.' });
  }
});

export default router;

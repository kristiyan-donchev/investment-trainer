import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listAndAcknowledgeAlerts, getUnseenTriggeredCount, createAlert, cancelAlert } from '../lib/alerts.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    res.json({ alerts: await listAndAcknowledgeAlerts(req.userId) });
  } catch (err) {
    console.error('get alerts error', err.message);
    res.status(500).json({ error: 'Could not load your price alerts right now.' });
  }
});

router.get('/unseen-count', async (req, res) => {
  try {
    res.json({ count: await getUnseenTriggeredCount(req.userId) });
  } catch (err) {
    console.error('unseen alerts count error', err.message);
    res.status(500).json({ error: 'Could not check alerts right now.' });
  }
});

router.post('/', async (req, res) => {
  const { symbol, name, direction, targetPrice } = req.body || {};
  if (typeof symbol !== 'string' || !symbol.trim()) {
    return res.status(400).json({ error: 'A symbol is required.' });
  }
  try {
    res.json({
      alerts: await createAlert(req.userId, {
        symbol: symbol.toUpperCase(),
        name: name || symbol,
        direction,
        targetPrice: Number(targetPrice),
      }),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    res.json({ alerts: await cancelAlert(req.userId, Number(req.params.id)) });
  } catch (err) {
    console.error('cancel alert error', err.message);
    res.status(500).json({ error: 'Could not remove that alert right now.' });
  }
});

export default router;

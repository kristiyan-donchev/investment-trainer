import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAchievements } from '../lib/achievements.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    res.json({ achievements: await getAchievements(req.userId) });
  } catch (err) {
    console.error('get achievements error', err.message);
    res.status(500).json({ error: 'Could not load achievements right now.' });
  }
});

export default router;

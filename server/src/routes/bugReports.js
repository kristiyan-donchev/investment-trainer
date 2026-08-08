import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createBugReport, getBugReportsForUser } from '../lib/bugReports.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    res.json({ reports: await getBugReportsForUser(req.userId) });
  } catch (err) {
    console.error('get bug reports error', err.message);
    res.status(500).json({ error: 'Could not load your reports right now.' });
  }
});

router.post('/', async (req, res) => {
  const { description, page } = req.body || {};
  try {
    res.json({
      reports: await createBugReport(req.userId, {
        description,
        page,
        userAgent: req.headers['user-agent'],
      }),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

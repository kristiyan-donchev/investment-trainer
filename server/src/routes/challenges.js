import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createChallenge, joinChallenge, getChallengesOverview, getChallengeStandings } from '../lib/challenges.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    res.json(await getChallengesOverview(req.userId));
  } catch (err) {
    console.error('get challenges error', err.message);
    res.status(500).json({ error: 'Could not load challenges right now.' });
  }
});

router.post('/', async (req, res) => {
  const { title, description, durationDays } = req.body || {};
  try {
    const challengeId = await createChallenge(req.userId, {
      title,
      description,
      durationDays: Number(durationDays),
    });
    res.json({ challengeId, ...(await getChallengesOverview(req.userId)) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/join', async (req, res) => {
  try {
    await joinChallenge(req.userId, Number(req.params.id));
    res.json(await getChallengesOverview(req.userId));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id/standings', async (req, res) => {
  try {
    res.json(await getChallengeStandings(Number(req.params.id), req.userId));
  } catch (err) {
    console.error('challenge standings error', err.message);
    res.status(400).json({ error: err.message });
  }
});

export default router;

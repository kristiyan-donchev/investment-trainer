import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  sendFriendRequest,
  acceptFriendRequest,
  deletePendingRequest,
  unfriend,
  getFriendsOverview,
  getPendingIncomingCount,
} from '../lib/friends.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    res.json(await getFriendsOverview(req.userId));
  } catch (err) {
    console.error('get friends error', err.message);
    res.status(500).json({ error: 'Could not load your friends right now.' });
  }
});

router.get('/unseen-count', async (req, res) => {
  try {
    res.json({ count: await getPendingIncomingCount(req.userId) });
  } catch (err) {
    console.error('unseen friend requests count error', err.message);
    res.status(500).json({ error: 'Could not check friend requests right now.' });
  }
});

router.post('/requests', async (req, res) => {
  const { username } = req.body || {};
  if (typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ error: 'A username is required.' });
  }
  try {
    res.json(await sendFriendRequest(req.userId, username.trim()));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/requests/:id/accept', async (req, res) => {
  try {
    await acceptFriendRequest(req.userId, Number(req.params.id));
    res.json(await getFriendsOverview(req.userId));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/requests/:id', async (req, res) => {
  try {
    await deletePendingRequest(req.userId, Number(req.params.id));
    res.json(await getFriendsOverview(req.userId));
  } catch (err) {
    console.error('delete friend request error', err.message);
    res.status(500).json({ error: 'Could not update that request right now.' });
  }
});

router.delete('/:userId', async (req, res) => {
  try {
    await unfriend(req.userId, Number(req.params.userId));
    res.json(await getFriendsOverview(req.userId));
  } catch (err) {
    console.error('unfriend error', err.message);
    res.status(500).json({ error: 'Could not remove that friend right now.' });
  }
});

export default router;

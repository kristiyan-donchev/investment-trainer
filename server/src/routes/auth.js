import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { createUser, findUserByUsername, findUserByEmail, findUserById, toPublicUser } from '../lib/users.js';
import { signToken, COOKIE_NAME } from '../lib/jwt.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const IS_PROD = process.env.NODE_ENV === 'production';

// Cross-site cookies (frontend and backend on different domains in production)
// require SameSite=None, which browsers only honor when Secure is also set.
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: IS_PROD ? 'none' : 'lax',
  secure: IS_PROD,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: IS_PROD ? 'none' : 'lax',
  secure: IS_PROD,
};

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body || {};

  if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Username must be 3-24 characters (letters, numbers, underscore).' });
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    if (await findUserByUsername(username)) {
      return res.status(409).json({ error: 'That username is already taken.' });
    }
    if (await findUserByEmail(email)) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser({ username, email, passwordHash });

    const token = signToken(user.id);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    res.status(201).json({ user: toPublicUser(user) });
  } catch (err) {
    console.error('signup error', err.message);
    res.status(500).json({ error: 'Something went wrong creating your account.' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const user = (await findUserByUsername(username)) || (await findUserByEmail(username));
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = signToken(user.id);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    console.error('login error', err.message);
    res.status(500).json({ error: 'Something went wrong logging you in.' });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, CLEAR_COOKIE_OPTIONS);
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await findUserById(req.userId);
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    console.error('me error', err.message);
    res.status(500).json({ error: 'Something went wrong loading your account.' });
  }
});

export default router;

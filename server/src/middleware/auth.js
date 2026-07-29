import { COOKIE_NAME, verifyToken } from '../lib/jwt.js';
import { findUserById } from '../lib/users.js';

export async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Not logged in.' });
  }
  let userId;
  try {
    userId = verifyToken(token);
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }

  try {
    const user = await findUserById(userId);
    if (!user) {
      return res.status(401).json({ error: 'Not logged in.' });
    }
    req.userId = userId;
    next();
  } catch (err) {
    console.error('auth lookup error', err.message);
    res.status(500).json({ error: 'Something went wrong checking your session.' });
  }
}

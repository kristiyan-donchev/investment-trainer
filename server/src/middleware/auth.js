import { COOKIE_NAME, verifyToken } from '../lib/jwt.js';
import { findUserById } from '../lib/users.js';

export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Not logged in.' });
  }
  try {
    const userId = verifyToken(token);
    const user = findUserById(userId);
    if (!user) {
      return res.status(401).json({ error: 'Not logged in.' });
    }
    req.userId = userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }
}

import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export const COOKIE_NAME = 'tradescrim_token';
const TOKEN_TTL = '7d';

let secret = process.env.JWT_SECRET;
if (!secret) {
  secret = crypto.randomBytes(48).toString('hex');
  console.warn(
    'JWT_SECRET is not set in the environment — using a random secret generated for this process. ' +
      'Existing login sessions will be invalidated every time the server restarts. ' +
      'Set JWT_SECRET in server/.env for stable sessions (see .env.example).'
  );
}

export function signToken(userId) {
  return jwt.sign({ sub: userId }, secret, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token) {
  const payload = jwt.verify(token, secret);
  return payload.sub;
}

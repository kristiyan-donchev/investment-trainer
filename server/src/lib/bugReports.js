import { pool } from '../db.js';

const MAX_DESCRIPTION_LENGTH = 2000;

export async function createBugReport(userId, { description, page, userAgent }) {
  const trimmed = (description || '').trim();
  if (!trimmed) throw new Error('Describe what happened before submitting.');
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(`Keep it under ${MAX_DESCRIPTION_LENGTH} characters.`);
  }
  await pool.query(
    `INSERT INTO bug_reports (user_id, description, page, user_agent, created_at) VALUES ($1, $2, $3, $4, $5)`,
    [userId, trimmed, page || null, userAgent || null, Date.now()]
  );
  return getBugReportsForUser(userId);
}

export async function getBugReportsForUser(userId) {
  const result = await pool.query(
    `SELECT id, description, page, created_at AS "createdAt" FROM bug_reports
     WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

import { pool } from '../db.js';
import { findUserByUsername } from './users.js';

// Sends a friend request, or resolves one that already exists for this pair
// (in either direction) instead of erroring — re-requesting after a decline
// re-sends, requesting someone who already requested you auto-accepts (the
// only resolution that doesn't need an arbitrary tiebreak), and the DB's
// LEAST/GREATEST unique index makes this safe even if both sides request
// each other at the same instant.
export async function sendFriendRequest(userId, username) {
  const target = await findUserByUsername(username);
  if (!target) throw new Error('No user found with that username.');
  if (target.id === userId) throw new Error("You can't add yourself as a friend.");

  try {
    await pool.query(
      `INSERT INTO friend_requests (requester_id, recipient_id, status, created_at)
       VALUES ($1, $2, 'PENDING', $3)`,
      [userId, target.id, Date.now()]
    );
    return { status: 'PENDING' };
  } catch (err) {
    if (err.code !== '23505') throw err;

    const existing = await pool.query(
      `SELECT id, requester_id AS "requesterId", status FROM friend_requests
       WHERE LEAST(requester_id, recipient_id) = LEAST($1::int, $2::int)
         AND GREATEST(requester_id, recipient_id) = GREATEST($1::int, $2::int)`,
      [userId, target.id]
    );
    const row = existing.rows[0];
    if (!row || row.status === 'ACCEPTED') return { status: 'ACCEPTED' };
    if (row.requesterId === userId) return { status: 'PENDING' };

    await pool.query(`UPDATE friend_requests SET status = 'ACCEPTED', responded_at = $1 WHERE id = $2`, [
      Date.now(),
      row.id,
    ]);
    return { status: 'ACCEPTED' };
  }
}

export async function acceptFriendRequest(userId, requestId) {
  const result = await pool.query(
    `UPDATE friend_requests SET status = 'ACCEPTED', responded_at = $1
     WHERE id = $2 AND recipient_id = $3 AND status = 'PENDING' RETURNING id`,
    [Date.now(), requestId, userId]
  );
  if (result.rows.length === 0) throw new Error('Friend request not found.');
}

// Handles both declining an incoming request and cancelling an outgoing one —
// both are just "delete a pending request you're part of."
export async function deletePendingRequest(userId, requestId) {
  await pool.query(
    `DELETE FROM friend_requests
     WHERE id = $1 AND status = 'PENDING' AND (requester_id = $2 OR recipient_id = $2)`,
    [requestId, userId]
  );
}

export async function unfriend(userId, otherUserId) {
  await pool.query(
    `DELETE FROM friend_requests
     WHERE status = 'ACCEPTED'
       AND LEAST(requester_id, recipient_id) = LEAST($1::int, $2::int)
       AND GREATEST(requester_id, recipient_id) = GREATEST($1::int, $2::int)`,
    [userId, otherUserId]
  );
}

export async function getFriendsOverview(userId) {
  const result = await pool.query(
    `SELECT fr.id, fr.requester_id AS "requesterId", fr.status, fr.created_at AS "createdAt",
            CASE WHEN fr.requester_id = $1 THEN fr.recipient_id ELSE fr.requester_id END AS "otherUserId",
            CASE WHEN fr.requester_id = $1 THEN ru.username ELSE qu.username END AS "otherUsername"
     FROM friend_requests fr
     JOIN users ru ON ru.id = fr.recipient_id
     JOIN users qu ON qu.id = fr.requester_id
     WHERE fr.requester_id = $1 OR fr.recipient_id = $1
     ORDER BY fr.created_at DESC`,
    [userId]
  );

  const friends = [];
  const incoming = [];
  const outgoing = [];
  for (const row of result.rows) {
    const entry = { id: row.id, userId: row.otherUserId, username: row.otherUsername, createdAt: row.createdAt };
    if (row.status === 'ACCEPTED') friends.push(entry);
    else if (row.requesterId === userId) outgoing.push(entry);
    else incoming.push(entry);
  }
  return { friends, incoming, outgoing };
}

export async function getFriendIds(userId) {
  const result = await pool.query(
    `SELECT CASE WHEN requester_id = $1 THEN recipient_id ELSE requester_id END AS "friendId"
     FROM friend_requests WHERE status = 'ACCEPTED' AND (requester_id = $1 OR recipient_id = $1)`,
    [userId]
  );
  return result.rows.map((r) => r.friendId);
}

export async function getPendingIncomingCount(userId) {
  const result = await pool.query(
    `SELECT COUNT(*) FROM friend_requests WHERE recipient_id = $1 AND status = 'PENDING'`,
    [userId]
  );
  return Number(result.rows[0].count);
}

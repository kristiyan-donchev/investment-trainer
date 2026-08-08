import { pool } from '../db.js';
import { getFriendIds } from './friends.js';
import { computeRoiRankings } from './portfolio.js';

const DAY_MS = 24 * 60 * 60 * 1000;
export const CHALLENGE_DURATIONS_DAYS = [3, 7, 14, 30];

const CHALLENGE_SELECT = `
  SELECT id, title, description, starts_at AS "startsAt", ends_at AS "endsAt",
         created_by AS "createdBy", created_at AS "createdAt", finalized_at AS "finalizedAt"
  FROM challenges WHERE id = $1
`;

const JOINED_SELECT = `
  SELECT c.id, c.title, c.description, c.starts_at AS "startsAt", c.ends_at AS "endsAt",
         c.created_by AS "createdBy", c.finalized_at AS "finalizedAt",
         cp.joined_at AS "joinedAt", cp.final_rank AS "finalRank",
         cp.final_roi_percent AS "finalRoiPercent", cp.badge
  FROM challenge_participants cp
  JOIN challenges c ON c.id = cp.challenge_id
  WHERE cp.user_id = $1
  ORDER BY c.ends_at DESC
`;

async function getChallengeById(challengeId) {
  const result = await pool.query(CHALLENGE_SELECT, [challengeId]);
  return result.rows[0] || null;
}

// Who's allowed to see/join a challenge created by `creatorId` — the creator
// themselves plus their current friends. This is what ties challenges to the
// friends feature instead of being a second, disconnected global leaderboard.
async function getEligibleParticipantIds(creatorId) {
  const friendIds = await getFriendIds(creatorId);
  return [creatorId, ...friendIds];
}

export async function createChallenge(userId, { title, description, durationDays }) {
  if (typeof title !== 'string' || !title.trim()) throw new Error('A title is required.');
  if (!CHALLENGE_DURATIONS_DAYS.includes(durationDays)) {
    throw new Error('Choose a valid challenge duration.');
  }

  const now = Date.now();
  const endsAt = now + durationDays * DAY_MS;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO challenges (title, description, starts_at, ends_at, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [title.trim(), description?.trim() || null, now, endsAt, userId, now]
    );
    const challengeId = result.rows[0].id;
    await client.query(
      `INSERT INTO challenge_participants (challenge_id, user_id, joined_at) VALUES ($1, $2, $3)`,
      [challengeId, userId, now]
    );
    await client.query('COMMIT');
    return challengeId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function joinChallenge(userId, challengeId) {
  const challenge = await getChallengeById(challengeId);
  if (!challenge) throw new Error('Challenge not found.');
  if (challenge.createdBy == null) throw new Error('This challenge is no longer joinable.');
  if (Date.now() >= challenge.endsAt) throw new Error('This challenge has already ended.');

  const eligibleIds = await getEligibleParticipantIds(challenge.createdBy);
  if (!eligibleIds.includes(userId)) {
    throw new Error("You're not eligible to join this challenge.");
  }

  await pool.query(
    `INSERT INTO challenge_participants (challenge_id, user_id, joined_at)
     VALUES ($1, $2, $3) ON CONFLICT (challenge_id, user_id) DO NOTHING`,
    [challengeId, userId, Date.now()]
  );
}

export async function getChallengesOverview(userId) {
  const now = Date.now();
  const eligibleCreatorIds = await getEligibleParticipantIds(userId);

  const openResult = await pool.query(
    `SELECT c.id, c.title, c.description, c.starts_at AS "startsAt", c.ends_at AS "endsAt",
            cu.username AS "creatorUsername"
     FROM challenges c
     JOIN users cu ON cu.id = c.created_by
     WHERE c.created_by = ANY($1::int[]) AND c.ends_at > $2
       AND NOT EXISTS (SELECT 1 FROM challenge_participants cp WHERE cp.challenge_id = c.id AND cp.user_id = $3)
     ORDER BY c.created_at DESC`,
    [eligibleCreatorIds, now, userId]
  );

  let joinedResult = await pool.query(JOINED_SELECT, [userId]);

  // Lazily finalize anything the caller is part of that ended but hasn't been
  // scored yet, so results show up immediately rather than waiting on the
  // background job's next tick.
  const duePastIds = joinedResult.rows.filter((r) => r.endsAt <= now && r.finalizedAt == null).map((r) => r.id);
  if (duePastIds.length > 0) {
    await Promise.all(duePastIds.map((id) => finalizeChallenge(id)));
    joinedResult = await pool.query(JOINED_SELECT, [userId]);
  }

  return {
    open: openResult.rows,
    active: joinedResult.rows.filter((r) => r.endsAt > now),
    past: joinedResult.rows.filter((r) => r.endsAt <= now),
  };
}

export async function getChallengeStandings(challengeId, requestingUserId) {
  const challenge = await getChallengeById(challengeId);
  if (!challenge) throw new Error('Challenge not found.');

  const now = Date.now();
  const isParticipant = await pool.query(
    `SELECT 1 FROM challenge_participants WHERE challenge_id = $1 AND user_id = $2`,
    [challengeId, requestingUserId]
  );
  if (isParticipant.rows.length === 0) {
    const eligibleIds =
      challenge.createdBy != null ? await getEligibleParticipantIds(challenge.createdBy) : [];
    if (!eligibleIds.includes(requestingUserId)) {
      throw new Error("You don't have access to this challenge.");
    }
  }

  if (challenge.endsAt <= now && challenge.finalizedAt == null) {
    await finalizeChallenge(challengeId);
  }

  if (challenge.finalizedAt != null || challenge.endsAt <= now) {
    const result = await pool.query(
      `SELECT cp.user_id AS "userId", u.username, cp.final_rank AS rank,
              cp.final_roi_percent AS "roiPercent", cp.badge
       FROM challenge_participants cp JOIN users u ON u.id = cp.user_id
       WHERE cp.challenge_id = $1 ORDER BY cp.final_rank ASC`,
      [challengeId]
    );
    return { challenge, standings: result.rows, finalized: true };
  }

  const participants = await getParticipantsForRanking(challengeId, challenge.startsAt);
  const standings = await computeRoiRankings(participants, { endTime: now });
  return { challenge, standings, finalized: false };
}

async function getParticipantsForRanking(challengeId, challengeStartsAt) {
  const result = await pool.query(
    `SELECT cp.user_id AS "userId", u.username, cp.joined_at AS "joinedAt"
     FROM challenge_participants cp JOIN users u ON u.id = cp.user_id
     WHERE cp.challenge_id = $1`,
    [challengeId]
  );
  return result.rows.map((p) => ({
    userId: p.userId,
    username: p.username,
    periodStart: Math.max(challengeStartsAt, Number(p.joinedAt)),
  }));
}

export async function getChallengesDueForFinalization() {
  const result = await pool.query(`SELECT id FROM challenges WHERE finalized_at IS NULL AND ends_at <= $1`, [
    Date.now(),
  ]);
  return result.rows.map((r) => r.id);
}

// Computes final standings once and locks them in — safe to call more than
// once (from the background job and lazily from reads) since the UPDATE only
// proceeds if this call is the one that wins the finalized_at claim.
export async function finalizeChallenge(challengeId) {
  const now = Date.now();
  const claim = await pool.query(
    `UPDATE challenges SET finalized_at = $2 WHERE id = $1 AND finalized_at IS NULL AND ends_at <= $2
     RETURNING starts_at AS "startsAt", ends_at AS "endsAt"`,
    [challengeId, now]
  );
  if (claim.rows.length === 0) return;

  const { startsAt, endsAt } = claim.rows[0];
  const participants = await getParticipantsForRanking(challengeId, startsAt);
  const rankings = await computeRoiRankings(participants, { endTime: endsAt });

  await Promise.all(
    rankings.map((r) => {
      const badge = r.rank === 1 ? 'WINNER' : r.rank <= 3 ? 'TOP_3' : 'PARTICIPANT';
      return pool.query(
        `UPDATE challenge_participants SET final_rank = $1, final_roi_percent = $2, badge = $3
         WHERE challenge_id = $4 AND user_id = $5`,
        [r.rank, r.roiPercent, badge, challengeId, r.userId]
      );
    })
  );
}

import { pool } from '../db.js';
import { getLeaderboard } from './portfolio.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Tracks how many distinct symbols are held simultaneously as transactions
// replay in order, returning the timestamp of the transaction that first
// pushed the count to `threshold` (or null if it never has been reached).
function diversificationEarnedAt(transactions, threshold) {
  const shares = {};
  for (const t of transactions) {
    const qty = Number(t.shares);
    const current = shares[t.symbol] || 0;
    shares[t.symbol] = t.type === 'BUY' ? current + qty : current - qty;
    const distinctCount = Object.values(shares).filter((s) => s > 1e-9).length;
    if (distinctCount >= threshold) return Number(t.timestamp);
  }
  return null;
}

// A position "matures" into a long-term hold exactly 30 days after it was
// first bought — earned the moment that clock runs out, not the moment
// someone happens to check.
function longTermHolderEarnedAt(transactions, holdingSymbols, now) {
  const candidates = holdingSymbols
    .map((symbol) => {
      const firstBuy = transactions.find((t) => t.symbol === symbol && t.type === 'BUY');
      return firstBuy ? Number(firstBuy.timestamp) + 30 * DAY_MS : null;
    })
    .filter((t) => t != null && t <= now);
  return candidates.length > 0 ? Math.min(...candidates) : null;
}

// Every achievement here (other than top-of-the-board) is derived entirely
// from the user's own transaction/holdings history, so its earned date is
// exact and doesn't depend on when anyone happened to check — a user who
// hit 10 trades a week ago and only opens their profile today still sees
// last week's date, not today's.
const ACHIEVEMENTS = [
  {
    id: 'first-trade',
    title: 'First Trade',
    description: 'Place your first buy or sell order.',
    icon: '🎯',
    evaluate: (ctx) => ctx.transactions[0]?.timestamp ?? null,
  },
  {
    id: 'ten-trades',
    title: 'Getting the Hang of It',
    description: 'Place 10 trades.',
    icon: '📈',
    evaluate: (ctx) => ctx.transactions[9]?.timestamp ?? null,
  },
  {
    id: 'fifty-trades',
    title: 'Serial Trader',
    description: 'Place 50 trades.',
    icon: '⚡',
    evaluate: (ctx) => ctx.transactions[49]?.timestamp ?? null,
  },
  {
    id: 'diversified',
    title: 'Diversified',
    description: 'Hold 5 or more different symbols at once.',
    icon: '🧺',
    evaluate: (ctx) => diversificationEarnedAt(ctx.transactions, 5),
  },
  {
    id: 'well-diversified',
    title: 'Well Diversified',
    description: 'Hold 10 or more different symbols at once.',
    icon: '🌐',
    evaluate: (ctx) => diversificationEarnedAt(ctx.transactions, 10),
  },
  {
    id: 'crypto-curious',
    title: 'Crypto Curious',
    description: 'Trade a cryptocurrency.',
    icon: '🪙',
    evaluate: (ctx) => ctx.transactions.find((t) => t.symbol.endsWith('-USD'))?.timestamp ?? null,
  },
  {
    id: 'profit-taker',
    title: 'Profit Taker',
    description: 'Lock in a profitable sale.',
    icon: '💰',
    evaluate: (ctx) => ctx.transactions.find((t) => t.type === 'SELL' && t.realizedPnL > 0)?.timestamp ?? null,
  },
  {
    id: 'big-winner',
    title: 'Big Winner',
    description: 'Lock in $500+ of profit on a single sale.',
    icon: '🏅',
    evaluate: (ctx) => ctx.transactions.find((t) => t.type === 'SELL' && t.realizedPnL >= 500)?.timestamp ?? null,
  },
  {
    id: 'long-term-holder',
    title: 'Long-Term Holder',
    description: 'Hold a position for 30 days or more.',
    icon: '🌱',
    evaluate: (ctx) => longTermHolderEarnedAt(ctx.transactions, ctx.holdingSymbols, Date.now()),
  },
];

// Reach #1 unlocks like a trophy — once earned it stays earned even if rank
// later slips, since (unlike the achievements above) current leaderboard
// rank isn't part of any history we can replay, so it has to be recorded
// the first time it's observed rather than derived after the fact.
async function topOfTheBoardEarnedAt(userId, isRankOneNow) {
  if (isRankOneNow) {
    await pool.query(
      `INSERT INTO achievement_unlocks (user_id, achievement_id, earned_at)
       VALUES ($1, 'top-of-the-board', $2)
       ON CONFLICT (user_id, achievement_id) DO NOTHING`,
      [userId, Date.now()]
    );
  }
  const result = await pool.query(
    `SELECT earned_at FROM achievement_unlocks WHERE user_id = $1 AND achievement_id = 'top-of-the-board'`,
    [userId]
  );
  return result.rows[0]?.earned_at ?? null;
}

export async function getAchievements(userId) {
  const [transactionsResult, holdingsResult, leaderboard] = await Promise.all([
    pool.query(
      `SELECT symbol, type, timestamp, realized_pnl AS "realizedPnL" FROM transactions
       WHERE user_id = $1 ORDER BY timestamp ASC`,
      [userId]
    ),
    pool.query(`SELECT symbol FROM holdings WHERE user_id = $1`, [userId]),
    getLeaderboard('all').catch(() => ({ leaderboard: [] })),
  ]);

  const ctx = {
    transactions: transactionsResult.rows,
    holdingSymbols: holdingsResult.rows.map((r) => r.symbol),
  };
  const isRankOneNow = leaderboard.leaderboard.find((e) => e.userId === userId)?.rank === 1;

  const badges = ACHIEVEMENTS.map((a) => {
    const earnedAt = a.evaluate(ctx);
    return { id: a.id, title: a.title, description: a.description, icon: a.icon, unlocked: earnedAt != null, earnedAt };
  });

  const topEarnedAt = await topOfTheBoardEarnedAt(userId, isRankOneNow);
  badges.push({
    id: 'top-of-the-board',
    title: 'Top of the Board',
    description: 'Reach #1 on the all-time Leaderboard.',
    icon: '👑',
    unlocked: topEarnedAt != null,
    earnedAt: topEarnedAt,
  });

  return badges;
}

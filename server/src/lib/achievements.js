import { pool } from '../db.js';
import { getLeaderboard } from './portfolio.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Every achievement is derived from data already in the database (transactions,
// holdings) plus, for one badge, a leaderboard lookup — nothing is persisted
// separately, so "unlocked" always reflects current state rather than a
// point-in-time snapshot.
const ACHIEVEMENTS = [
  {
    id: 'first-trade',
    title: 'First Trade',
    description: 'Place your first buy or sell order.',
    icon: '🎯',
    check: (ctx) => ctx.transactions.length >= 1,
  },
  {
    id: 'ten-trades',
    title: 'Getting the Hang of It',
    description: 'Place 10 trades.',
    icon: '📈',
    check: (ctx) => ctx.transactions.length >= 10,
  },
  {
    id: 'fifty-trades',
    title: 'Serial Trader',
    description: 'Place 50 trades.',
    icon: '⚡',
    check: (ctx) => ctx.transactions.length >= 50,
  },
  {
    id: 'diversified',
    title: 'Diversified',
    description: 'Hold 5 or more different symbols at once.',
    icon: '🧺',
    check: (ctx) => ctx.holdingSymbols.length >= 5,
  },
  {
    id: 'well-diversified',
    title: 'Well Diversified',
    description: 'Hold 10 or more different symbols at once.',
    icon: '🌐',
    check: (ctx) => ctx.holdingSymbols.length >= 10,
  },
  {
    id: 'crypto-curious',
    title: 'Crypto Curious',
    description: 'Trade a cryptocurrency.',
    icon: '🪙',
    check: (ctx) => ctx.transactions.some((t) => t.symbol.endsWith('-USD')),
  },
  {
    id: 'profit-taker',
    title: 'Profit Taker',
    description: 'Lock in a profitable sale.',
    icon: '💰',
    check: (ctx) => ctx.transactions.some((t) => t.type === 'SELL' && t.realizedPnL > 0),
  },
  {
    id: 'big-winner',
    title: 'Big Winner',
    description: 'Lock in $500+ of profit on a single sale.',
    icon: '🏅',
    check: (ctx) => ctx.transactions.some((t) => t.type === 'SELL' && t.realizedPnL >= 500),
  },
  {
    id: 'long-term-holder',
    title: 'Long-Term Holder',
    description: 'Hold a position for 30 days or more.',
    icon: '🌱',
    check: (ctx) => {
      const now = Date.now();
      return ctx.holdingSymbols.some((symbol) => {
        const firstBuy = ctx.transactions
          .filter((t) => t.symbol === symbol && t.type === 'BUY')
          .reduce((earliest, t) => Math.min(earliest, Number(t.timestamp)), Infinity);
        return Number.isFinite(firstBuy) && now - firstBuy >= 30 * DAY_MS;
      });
    },
  },
  {
    id: 'top-of-the-board',
    title: 'Top of the Board',
    description: 'Reach #1 on the all-time Leaderboard.',
    icon: '👑',
    check: (ctx) => ctx.leaderboardRank === 1,
  },
];

export async function getAchievements(userId) {
  const [transactionsResult, holdingsResult, leaderboard] = await Promise.all([
    pool.query(
      `SELECT symbol, type, timestamp, realized_pnl AS "realizedPnL" FROM transactions WHERE user_id = $1`,
      [userId]
    ),
    pool.query(`SELECT symbol FROM holdings WHERE user_id = $1`, [userId]),
    getLeaderboard('all').catch(() => ({ leaderboard: [] })),
  ]);

  const ctx = {
    transactions: transactionsResult.rows,
    holdingSymbols: holdingsResult.rows.map((r) => r.symbol),
    leaderboardRank: leaderboard.leaderboard.find((e) => e.userId === userId)?.rank ?? null,
  };

  return ACHIEVEMENTS.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    icon: a.icon,
    unlocked: a.check(ctx),
  }));
}

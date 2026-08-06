import { pool } from '../db.js';

const ALERT_SELECT = `
  SELECT id, symbol, name, direction, target_price AS "targetPrice", active,
         created_at AS "createdAt", triggered_at AS "triggeredAt",
         triggered_price AS "triggeredPrice", seen
  FROM price_alerts WHERE user_id = $1 ORDER BY created_at DESC
`;

export async function listAlerts(userId) {
  const result = await pool.query(ALERT_SELECT, [userId]);
  return result.rows;
}

// Marks every currently-unseen triggered alert as seen (opening the Watchlist
// page acknowledges them, like a read receipt) and reports which ones were
// newly seen by this call so the client can highlight them once.
export async function listAndAcknowledgeAlerts(userId) {
  const alerts = await listAlerts(userId);
  const newlyTriggered = alerts.filter((a) => a.triggeredAt != null && !a.seen).map((a) => a.id);
  if (newlyTriggered.length > 0) {
    await pool.query(`UPDATE price_alerts SET seen = TRUE WHERE id = ANY($1::int[])`, [newlyTriggered]);
  }
  return alerts.map((a) => ({ ...a, justTriggered: newlyTriggered.includes(a.id) }));
}

export async function getUnseenTriggeredCount(userId) {
  const result = await pool.query(
    `SELECT COUNT(*) FROM price_alerts WHERE user_id = $1 AND triggered_at IS NOT NULL AND seen = FALSE`,
    [userId]
  );
  return Number(result.rows[0].count);
}

export async function createAlert(userId, { symbol, name, direction, targetPrice }) {
  if (direction !== 'above' && direction !== 'below') {
    throw new Error('Direction must be "above" or "below".');
  }
  if (!(targetPrice > 0)) {
    throw new Error('Enter a valid target price.');
  }
  await pool.query(
    `INSERT INTO price_alerts (user_id, symbol, name, direction, target_price, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, symbol, name, direction, targetPrice, Date.now()]
  );
  return listAlerts(userId);
}

export async function cancelAlert(userId, alertId) {
  await pool.query(`DELETE FROM price_alerts WHERE id = $1 AND user_id = $2`, [alertId, userId]);
  return listAlerts(userId);
}

export async function getActiveAlertSymbols() {
  const result = await pool.query(`SELECT DISTINCT symbol FROM price_alerts WHERE active = TRUE`);
  return result.rows.map((r) => r.symbol);
}

// Evaluates every active alert against the given price map (symbol -> current
// price) and flips triggered ones to inactive/unseen. Called from the
// scheduled market-check job in index.js with prices already fetched, so this
// does no network I/O itself.
export async function processAlerts(priceMap) {
  const result = await pool.query(
    `SELECT id, symbol, direction, target_price AS "targetPrice" FROM price_alerts WHERE active = TRUE`
  );
  const now = Date.now();
  for (const alert of result.rows) {
    const price = priceMap[alert.symbol];
    if (price == null) continue;
    const hit = alert.direction === 'above' ? price >= alert.targetPrice : price <= alert.targetPrice;
    if (!hit) continue;
    await pool.query(
      `UPDATE price_alerts SET active = FALSE, triggered_at = $1, triggered_price = $2, seen = FALSE WHERE id = $3`,
      [now, price, alert.id]
    );
  }
}

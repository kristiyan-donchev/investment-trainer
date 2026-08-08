// In local dev this stays relative and Vite's dev proxy forwards it to the API.
// In production, set VITE_API_BASE_URL to the deployed backend's origin, since
// the frontend and backend are typically hosted on different domains.
const BASE = `${import.meta.env.VITE_API_BASE_URL || ''}/api`;

// Google sign-in is a full-page redirect (not a fetch), so the backend can run
// the OAuth code exchange server-side and set the session cookie before
// bouncing back to the frontend.
export const GOOGLE_AUTH_URL = `${BASE}/auth/google`;

async function getJson(url) {
  const res = await fetch(url, { credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

async function deleteJson(url) {
  const res = await fetch(url, { method: 'DELETE', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

export function searchSymbols(query) {
  return getJson(`${BASE}/search?q=${encodeURIComponent(query)}`).then((d) => d.results || []);
}

export function fetchQuote(symbol) {
  return getJson(`${BASE}/quote/${encodeURIComponent(symbol)}`);
}

export function fetchMarketNews() {
  return getJson(`${BASE}/news`).then((d) => d.news || []);
}

export function fetchHistory(symbol, range = '1mo') {
  return getJson(`${BASE}/history/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}`).then(
    (d) => d.points || []
  );
}

export function signup({ username, email, password }) {
  return postJson(`${BASE}/auth/signup`, { username, email, password }).then((d) => d.user);
}

export function login({ username, password }) {
  return postJson(`${BASE}/auth/login`, { username, password }).then((d) => d.user);
}

export function logout() {
  return postJson(`${BASE}/auth/logout`, {});
}

export function fetchCurrentUser() {
  return getJson(`${BASE}/auth/me`).then((d) => d.user);
}

export function fetchPortfolio() {
  return getJson(`${BASE}/portfolio`);
}

export function buyShares(order) {
  return postJson(`${BASE}/portfolio/buy`, order);
}

export function sellShares(order) {
  return postJson(`${BASE}/portfolio/sell`, order);
}

export function resetPortfolio() {
  return postJson(`${BASE}/portfolio/reset`, {});
}

export function fetchPerformance(range = '1mo') {
  return getJson(`${BASE}/portfolio/performance?range=${encodeURIComponent(range)}`);
}

export function fetchLeaderboard(range = '1mo', category = 'return', scope = 'global') {
  return getJson(
    `${BASE}/portfolio/leaderboard?range=${encodeURIComponent(range)}&category=${encodeURIComponent(category)}&scope=${encodeURIComponent(scope)}`
  );
}

export function fetchWatchlist() {
  return getJson(`${BASE}/watchlist`).then((d) => d.watchlist || []);
}

export function addToWatchlist({ symbol, name }) {
  return postJson(`${BASE}/watchlist`, { symbol, name }).then((d) => d.watchlist || []);
}

export function removeFromWatchlist(symbol) {
  return deleteJson(`${BASE}/watchlist/${encodeURIComponent(symbol)}`).then((d) => d.watchlist || []);
}

export function fetchAlerts() {
  return getJson(`${BASE}/alerts`).then((d) => d.alerts || []);
}

export function fetchUnseenAlertCount() {
  return getJson(`${BASE}/alerts/unseen-count`).then((d) => d.count || 0);
}

export function createAlert({ symbol, name, direction, targetPrice }) {
  return postJson(`${BASE}/alerts`, { symbol, name, direction, targetPrice }).then((d) => d.alerts || []);
}

export function cancelAlert(id) {
  return deleteJson(`${BASE}/alerts/${id}`).then((d) => d.alerts || []);
}

export function fetchOrders() {
  return getJson(`${BASE}/orders`).then((d) => d.orders || []);
}

export function placeOrder(order) {
  return postJson(`${BASE}/orders`, order).then((d) => d.orders || []);
}

export function cancelOrder(id) {
  return postJson(`${BASE}/orders/${id}/cancel`, {}).then((d) => d.orders || []);
}

export function fetchAchievements() {
  return getJson(`${BASE}/achievements`).then((d) => d.achievements || []);
}

export function updateUsername(username) {
  return postJson(`${BASE}/auth/username`, { username }).then((d) => d.user);
}

export function updatePassword({ currentPassword, newPassword }) {
  return postJson(`${BASE}/auth/password`, { currentPassword, newPassword });
}

export function deleteAccount(confirmUsername) {
  return postJson(`${BASE}/auth/delete`, { confirmUsername });
}

export function fetchFriends() {
  return getJson(`${BASE}/friends`);
}

export function fetchUnseenFriendRequestCount() {
  return getJson(`${BASE}/friends/unseen-count`).then((d) => d.count || 0);
}

export function sendFriendRequest(username) {
  return postJson(`${BASE}/friends/requests`, { username });
}

export function acceptFriendRequest(id) {
  return postJson(`${BASE}/friends/requests/${id}/accept`, {});
}

export function declineFriendRequest(id) {
  return deleteJson(`${BASE}/friends/requests/${id}`);
}

export function unfriend(userId) {
  return deleteJson(`${BASE}/friends/${userId}`);
}

export function fetchChallenges() {
  return getJson(`${BASE}/challenges`);
}

export function createChallenge({ title, description, durationDays }) {
  return postJson(`${BASE}/challenges`, { title, description, durationDays });
}

export function joinChallenge(id) {
  return postJson(`${BASE}/challenges/${id}/join`, {});
}

export function fetchChallengeStandings(id) {
  return getJson(`${BASE}/challenges/${id}/standings`);
}

export function fetchBugReports() {
  return getJson(`${BASE}/bugs`).then((d) => d.reports || []);
}

export function submitBugReport({ description, page }) {
  return postJson(`${BASE}/bugs`, { description, page }).then((d) => d.reports || []);
}

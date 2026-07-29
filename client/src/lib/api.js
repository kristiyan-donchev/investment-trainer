const BASE = '/api';

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

export function searchSymbols(query) {
  return getJson(`${BASE}/search?q=${encodeURIComponent(query)}`).then((d) => d.results || []);
}

export function fetchQuote(symbol) {
  return getJson(`${BASE}/quote/${encodeURIComponent(symbol)}`);
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

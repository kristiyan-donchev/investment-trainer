const BASE = '/api';

async function getJson(url) {
  const res = await fetch(url);
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

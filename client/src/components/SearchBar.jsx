import { useEffect, useRef, useState } from 'react';
import { searchSymbols } from '../lib/api.js';

export default function SearchBar({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await searchSymbols(trimmed);
        setResults(r);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function handleSelect(item) {
    onSelect(item.symbol, item.name);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Search a company, ticker, or crypto, e.g. Apple, AAPL, or Bitcoin"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {loading && <div className="search-status">Searching…</div>}
      {open && results.length > 0 && (
        <ul className="search-results">
          {results.map((r) => (
            <li key={r.symbol} onMouseDown={() => handleSelect(r)}>
              <span className="search-symbol">{r.symbol}</span>
              <span className="search-name">{r.name}</span>
              {r.type === 'CRYPTOCURRENCY' ? (
                <span className="search-badge crypto">Crypto</span>
              ) : (
                <span className="search-exchange">{r.exchange}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

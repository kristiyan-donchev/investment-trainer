import { useEffect, useState } from 'react';
import { fetchLeaderboard } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const RANGES = ['1d', '1w', '1mo', '3mo', '6mo', '1y', 'all'];
const RANGE_LABELS = { '1d': '1D', '1w': '1W', '1mo': '1M', '3mo': '3M', '6mo': '6M', '1y': '1Y', all: 'All' };

export default function Leaderboard() {
  const { user } = useAuth();
  const [range, setRange] = useState('1mo');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);
    fetchLeaderboard(range)
      .then((d) => {
        if (!cancelled) setEntries(d.leaderboard || []);
      })
      .catch((err) => {
        if (!cancelled) setErrorMsg(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <div className="leaderboard">
      <div className="range-tabs">
        {RANGES.map((r) => (
          <button key={r} className={r === range ? 'range-tab active' : 'range-tab'} onClick={() => setRange(r)}>
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>
      {loading && <div className="chart-status">Loading leaderboard…</div>}
      {errorMsg && <div className="chart-status error">{errorMsg}</div>}
      {!loading && !errorMsg && entries.length > 0 && (
        <table className="holdings-table leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Trader</th>
              <th>ROI</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isMe = user && entry.userId === user.id;
              return (
                <tr key={entry.userId} className={isMe ? 'leaderboard-row-me' : ''}>
                  <td className="leaderboard-rank">#{entry.rank}</td>
                  <td>
                    {entry.username}
                    {isMe && ' (you)'}
                  </td>
                  <td className={entry.roiPercent >= 0 ? 'positive' : 'negative'}>
                    {entry.roiPercent >= 0 ? '+' : ''}
                    {entry.roiPercent.toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {!loading && !errorMsg && entries.length === 0 && <p className="empty-state">No traders to rank yet.</p>}
    </div>
  );
}

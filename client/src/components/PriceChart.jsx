import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { fetchHistory } from '../lib/api.js';

const RANGES = ['1d', '5d', '1mo', '3mo', '6mo', '1y'];

function formatDate(iso, range) {
  const d = new Date(iso);
  if (range === '1d' || range === '5d') {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function PriceChart({ symbol }) {
  const [range, setRange] = useState('1mo');
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);
    fetchHistory(symbol, range)
      .then((pts) => {
        if (!cancelled) setPoints(pts);
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
  }, [symbol, range]);

  if (!symbol) return null;

  const chartData = points.map((p) => ({
    label: formatDate(p.date, range),
    close: p.close,
  }));

  return (
    <div className="price-chart">
      <div className="range-tabs">
        {RANGES.map((r) => (
          <button
            key={r}
            className={r === range ? 'range-tab active' : 'range-tab'}
            onClick={() => setRange(r)}
          >
            {r}
          </button>
        ))}
      </div>
      {loading && <div className="chart-status">Loading chart…</div>}
      {errorMsg && <div className="chart-status error">{errorMsg}</div>}
      {!loading && !errorMsg && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--muted)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={{ stroke: 'var(--border)' }}
              minTickGap={30}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fontSize: 11, fill: 'var(--muted)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={{ stroke: 'var(--border)' }}
              width={60}
            />
            <RechartsTooltip
              formatter={(v) => `$${Number(v).toFixed(2)}`}
              contentStyle={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
              }}
              labelStyle={{ color: 'var(--muted)' }}
            />
            <Line type="monotone" dataKey="close" stroke="var(--primary)" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      )}
      {!loading && !errorMsg && chartData.length === 0 && (
        <div className="chart-status">No chart data available for this range.</div>
      )}
    </div>
  );
}

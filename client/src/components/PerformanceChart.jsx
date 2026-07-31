import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, ReferenceLine, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { fetchPerformance } from '../lib/api.js';

const RANGES = ['1d', '1w', '1mo', '3mo', '6mo', '1y', 'all'];
const RANGE_LABELS = { '1d': '1D', '1w': '1W', '1mo': '1M', '3mo': '3M', '6mo': '6M', '1y': '1Y', all: 'All' };

function formatDate(iso, range) {
  const d = new Date(iso);
  if (range === '1d') {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (range === '1w') {
    return `${d.toLocaleDateString([], { weekday: 'short' })} ${d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }
  if (range === '1y' || range === 'all') {
    return d.toLocaleDateString([], { month: 'short', year: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function PerformanceChart() {
  const [range, setRange] = useState('1mo');
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);
    fetchPerformance(range)
      .then((d) => {
        if (!cancelled) setPoints(d.points || []);
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

  const chartData = points.map((p) => ({
    label: formatDate(p.date, range),
    roi: p.roiPercent,
    value: p.value,
  }));

  const latestRoi = chartData.length > 0 ? chartData[chartData.length - 1].roi : 0;
  const lineColor = latestRoi >= 0 ? 'var(--green)' : 'var(--red)';

  return (
    <div className="price-chart">
      <div className="range-tabs">
        {RANGES.map((r) => (
          <button key={r} className={r === range ? 'range-tab active' : 'range-tab'} onClick={() => setRange(r)}>
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>
      {loading && <div className="chart-status">Loading performance…</div>}
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
              width={54}
              tickFormatter={(v) => `${v.toFixed(1)}%`}
            />
            <RechartsTooltip
              formatter={(value, name) => (name === 'roi' ? [`${Number(value).toFixed(2)}%`, 'ROI'] : value)}
              contentStyle={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
              }}
              labelStyle={{ color: 'var(--muted)' }}
            />
            <ReferenceLine y={0} stroke="var(--muted)" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="roi" stroke={lineColor} dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      )}
      {!loading && !errorMsg && chartData.length === 0 && (
        <div className="chart-status">No performance data available for this range.</div>
      )}
    </div>
  );
}

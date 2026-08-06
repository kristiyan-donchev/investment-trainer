import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

// A small fixed categorical palette — holdings count is usually low (a handful
// of symbols), so a short, visually distinct list reads better than a
// generated hue ramp. Cash always renders in --muted so it reads as "not a
// pick" rather than another holding.
const PALETTE = ['#2f6fed', '#16a34a', '#dc2626', '#b45309', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];

export default function PortfolioBreakdown({ cash, holdings, quotes }) {
  const holdingSlices = Object.values(holdings)
    .map((h) => {
      const quote = quotes[h.symbol];
      const value = quote ? quote.price * h.shares : h.avgCost * h.shares;
      return { name: h.symbol, value };
    })
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  const data = [...holdingSlices, { name: 'Cash', value: cash }].filter((s) => s.value > 0);
  const total = data.reduce((sum, s) => sum + s.value, 0);

  if (total <= 0) {
    return <p className="empty-state">Nothing to show yet — buy a stock or crypto to see your portfolio mix.</p>;
  }

  return (
    <div className="breakdown-chart">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
            {data.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={entry.name === 'Cash' ? 'var(--muted)' : PALETTE[i % PALETTE.length]}
                stroke="var(--panel-bg)"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <RechartsTooltip
            formatter={(value, name) => [`$${Number(value).toFixed(2)} (${((value / total) * 100).toFixed(1)}%)`, name]}
            contentStyle={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="breakdown-legend">
        {data.map((entry, i) => (
          <div className="breakdown-legend-item" key={entry.name}>
            <span
              className="breakdown-swatch"
              style={{ background: entry.name === 'Cash' ? 'var(--muted)' : PALETTE[i % PALETTE.length] }}
            />
            <span>{entry.name}</span>
            <span className="breakdown-legend-pct">{((entry.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

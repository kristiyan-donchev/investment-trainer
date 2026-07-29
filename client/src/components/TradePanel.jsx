import { useState } from 'react';
import Tooltip from './Tooltip.jsx';

export default function TradePanel({ quote, holding, cash, onBuy, onSell, error }) {
  const [shares, setShares] = useState('');
  const [side, setSide] = useState('BUY');

  if (!quote) return null;

  const sharesNum = Number(shares);
  const estimatedTotal = sharesNum > 0 ? sharesNum * quote.price : 0;
  const canSubmit = sharesNum > 0 && Number.isFinite(sharesNum);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    const order = { symbol: quote.symbol, name: quote.name, shares: sharesNum, price: quote.price };
    const ok = side === 'BUY' ? await onBuy(order) : await onSell(order);
    if (ok) setShares('');
  }

  return (
    <form className="trade-panel" onSubmit={handleSubmit}>
      <h3>
        Place a simulated{' '}
        <Tooltip term="An order to buy or sell immediately at the current market price.">
          market order
        </Tooltip>
      </h3>

      <div className="trade-side-toggle">
        <button
          type="button"
          className={side === 'BUY' ? 'side-button buy active' : 'side-button buy'}
          onClick={() => setSide('BUY')}
        >
          Buy
        </button>
        <button
          type="button"
          className={side === 'SELL' ? 'side-button sell active' : 'side-button sell'}
          onClick={() => setSide('SELL')}
        >
          Sell
        </button>
      </div>

      <label className="field">
        <span>Shares</span>
        <input
          type="number"
          min="0"
          step="any"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          placeholder="0"
        />
      </label>

      <div className="trade-meta">
        <div>
          Current price: <strong>${quote.price.toFixed(2)}</strong>
        </div>
        <div>
          Estimated {side === 'BUY' ? 'cost' : 'proceeds'}: <strong>${estimatedTotal.toFixed(2)}</strong>
        </div>
        {side === 'BUY' && (
          <div>
            Virtual cash available: <strong>${cash.toFixed(2)}</strong>
          </div>
        )}
        {side === 'SELL' && (
          <div>
            You own: <strong>{holding ? holding.shares : 0} share(s)</strong>
          </div>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}

      <button type="submit" className="primary-button" disabled={!canSubmit}>
        {side === 'BUY' ? 'Buy' : 'Sell'} {shares || 0} share(s) of {quote.symbol}
      </button>
      <p className="disclaimer-inline">Simulated only — no real money or brokerage is involved.</p>
    </form>
  );
}

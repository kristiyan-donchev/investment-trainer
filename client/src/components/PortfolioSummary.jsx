import Tooltip from './Tooltip.jsx';

export default function PortfolioSummary({ cash, holdingsValue, totalRealizedPnL, startingCash }) {
  const totalValue = cash + holdingsValue;
  const totalPnL = totalValue - startingCash;

  return (
    <div className="summary-cards">
      <div className="card">
        <div className="card-label">Virtual cash</div>
        <div className="card-value">${cash.toFixed(2)}</div>
      </div>
      <div className="card">
        <div className="card-label">Holdings value</div>
        <div className="card-value">${holdingsValue.toFixed(2)}</div>
      </div>
      <div className="card">
        <div className="card-label">Total portfolio value</div>
        <div className="card-value">${totalValue.toFixed(2)}</div>
      </div>
      <div className="card">
        <div className="card-label">
          <Tooltip term="How your total portfolio value compares to the $10,000 you started with, including both realized and unrealized gains/losses.">
            Total P&amp;L
          </Tooltip>
        </div>
        <div className={`card-value ${totalPnL >= 0 ? 'positive' : 'negative'}`}>
          {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
        </div>
      </div>
      <div className="card">
        <div className="card-label">
          <Tooltip term="Profit or loss that is locked in from shares you have already sold.">
            Realized P&amp;L
          </Tooltip>
        </div>
        <div className={`card-value ${totalRealizedPnL >= 0 ? 'positive' : 'negative'}`}>
          {totalRealizedPnL >= 0 ? '+' : ''}${totalRealizedPnL.toFixed(2)}
        </div>
      </div>
    </div>
  );
}

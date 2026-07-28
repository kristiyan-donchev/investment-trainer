const TERMS = [
  {
    term: 'Market order',
    text: 'An order to buy or sell a stock immediately at its current price, rather than waiting for a specific target price.',
  },
  {
    term: 'P&L (Profit & Loss)',
    text: 'How much money you have made or lost. "Unrealized" P&L is on shares you still own (paper gains/losses). "Realized" P&L is locked in once you actually sell.',
  },
  {
    term: 'Cost basis',
    text: 'What you originally paid for a holding. If you buy shares at different prices over time, your "average cost basis" is the weighted average price you paid.',
  },
  {
    term: 'Diversification',
    text: 'Spreading your money across different companies or sectors so that one bad investment does not sink your whole portfolio.',
  },
  {
    term: 'Ticker symbol',
    text: 'The short letter code used to identify a stock on an exchange, e.g. AAPL for Apple or MSFT for Microsoft.',
  },
  {
    term: 'Volatility',
    text: 'How much a stock\'s price swings up and down over time. Higher volatility means bigger, faster price changes in either direction.',
  },
];

export default function Onboarding({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Welcome to Investment Trainer</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <p>
          This is a <strong>paper-trading simulator</strong>: you practice buying and selling{' '}
          <strong>real stocks at real (delayed) market prices</strong>, using{' '}
          <strong>pretend money</strong>. No real trades are ever placed, and no brokerage account
          is connected. It's a safe place to learn how investing works.
        </p>

        <h3>How to use it</h3>
        <ol>
          <li>You start with $10,000 in virtual cash.</li>
          <li>Search for a company or ticker symbol (like AAPL or TSLA).</li>
          <li>Look at its current price and recent price chart.</li>
          <li>Place a simulated "buy" or "sell" market order.</li>
          <li>Track your holdings, profit/loss, and full transaction history any time.</li>
        </ol>

        <h3>A few beginner terms</h3>
        <dl className="glossary">
          {TERMS.map((t) => (
            <div key={t.term} className="glossary-item">
              <dt>{t.term}</dt>
              <dd>{t.text}</dd>
            </div>
          ))}
        </dl>

        <button className="primary-button" onClick={onClose}>
          Got it, let's start
        </button>
      </div>
    </div>
  );
}

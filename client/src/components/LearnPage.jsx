import { GLOSSARY_TERMS } from '../lib/glossary.js';

export default function LearnPage() {
  return (
    <>
      <section className="panel">
        <h2>How investing works here</h2>
        <p>
          Investment Trainer is a <strong>paper-trading simulator</strong>: you buy and sell{' '}
          <strong>real stocks at real (delayed) market prices</strong>, using <strong>pretend money</strong>.
          No real trades are ever placed, and no brokerage account is connected. It's a safe place to learn
          how investing works.
        </p>
        <ol>
          <li>You start with $10,000 in virtual cash.</li>
          <li>Search for a company or ticker symbol (like AAPL or TSLA) on the Dashboard.</li>
          <li>Look at its current price and recent price chart.</li>
          <li>Place a simulated "buy" or "sell" market order.</li>
          <li>Track your holdings, profit/loss, and full transaction history any time.</li>
          <li>See how your returns stack up against other traders on the Leaderboard.</li>
        </ol>
      </section>

      <section className="panel">
        <h2>Beginner terms</h2>
        <dl className="glossary">
          {GLOSSARY_TERMS.map((t) => (
            <div key={t.term} className="glossary-item">
              <dt>{t.term}</dt>
              <dd>{t.text}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}

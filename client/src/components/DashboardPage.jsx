import SearchBar from './SearchBar.jsx';
import PriceChart from './PriceChart.jsx';
import PerformanceChart from './PerformanceChart.jsx';
import TradePanel from './TradePanel.jsx';
import PortfolioSummary from './PortfolioSummary.jsx';
import HoldingsTable from './HoldingsTable.jsx';
import TransactionHistory from './TransactionHistory.jsx';
import { STARTING_CASH, totalRealizedPnL } from '../lib/portfolio.js';

export default function DashboardPage({
  state,
  holdingsValue,
  quotes,
  quoteError,
  selectedSymbol,
  selectedQuote,
  selectedHolding,
  onSelect,
  buy,
  sell,
  error,
}) {
  return (
    <>
      <PortfolioSummary
        cash={state.cash}
        holdingsValue={holdingsValue}
        totalRealizedPnL={totalRealizedPnL(state.transactions)}
        startingCash={STARTING_CASH}
      />

      <section className="panel">
        <h2>Portfolio performance</h2>
        <PerformanceChart />
      </section>

      <section className="panel">
        <h2>Look up a stock</h2>
        <SearchBar onSelect={onSelect} />

        {quoteError && <div className="form-error">{quoteError}</div>}

        {selectedQuote && (
          <div className="quote-block">
            <div className="quote-heading">
              <h3>
                {selectedQuote.symbol} — {selectedQuote.name}
              </h3>
              <div className="quote-price">
                ${selectedQuote.price.toFixed(2)}{' '}
                <span className={selectedQuote.change >= 0 ? 'positive' : 'negative'}>
                  {selectedQuote.change >= 0 ? '+' : ''}
                  {selectedQuote.change?.toFixed(2)} ({selectedQuote.changePercent?.toFixed(2)}%)
                </span>
              </div>
              <div className="quote-meta">
                {selectedQuote.exchange} · Market: {selectedQuote.marketState}
              </div>
            </div>

            <PriceChart symbol={selectedSymbol} />

            <TradePanel
              quote={selectedQuote}
              holding={selectedHolding}
              cash={state.cash}
              onBuy={buy}
              onSell={sell}
              error={error}
            />
          </div>
        )}

        {!selectedQuote && !quoteError && (
          <p className="empty-state">Search above and select a company to see its price and chart.</p>
        )}
      </section>

      <section className="panel">
        <h2>Your holdings</h2>
        <HoldingsTable holdings={state.holdings} quotes={quotes} onSelect={onSelect} />
      </section>

      <section className="panel">
        <h2>Transaction history</h2>
        <TransactionHistory transactions={state.transactions} />
      </section>
    </>
  );
}

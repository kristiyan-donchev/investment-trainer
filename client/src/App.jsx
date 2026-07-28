import { useCallback, useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import Onboarding from './components/Onboarding.jsx';
import SearchBar from './components/SearchBar.jsx';
import PriceChart from './components/PriceChart.jsx';
import TradePanel from './components/TradePanel.jsx';
import PortfolioSummary from './components/PortfolioSummary.jsx';
import HoldingsTable from './components/HoldingsTable.jsx';
import TransactionHistory from './components/TransactionHistory.jsx';
import { usePortfolio } from './hooks/usePortfolio.js';
import { fetchQuote } from './lib/api.js';
import { STARTING_CASH, totalRealizedPnL } from './lib/portfolio.js';

const SEEN_ONBOARDING_KEY = 'investment-trainer-seen-onboarding';
const QUOTE_REFRESH_MS = 20000;

export default function App() {
  const { state, buy, sell, reset, error, setError } = usePortfolio();
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [selectedName, setSelectedName] = useState('');
  const [quotes, setQuotes] = useState({});
  const [quoteError, setQuoteError] = useState(null);
  const [showHelp, setShowHelp] = useState(() => !localStorage.getItem(SEEN_ONBOARDING_KEY));

  const symbolsToTrack = Array.from(
    new Set([...Object.keys(state.holdings), ...(selectedSymbol ? [selectedSymbol] : [])])
  );

  const refreshQuotes = useCallback(async (symbols) => {
    if (symbols.length === 0) return;
    const results = await Promise.allSettled(symbols.map((s) => fetchQuote(s)));
    setQuotes((prev) => {
      const next = { ...prev };
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') next[symbols[i]] = r.value;
      });
      return next;
    });
  }, []);

  useEffect(() => {
    refreshQuotes(symbolsToTrack);
    const interval = setInterval(() => refreshQuotes(symbolsToTrack), QUOTE_REFRESH_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsToTrack.join(','), refreshQuotes]);

  function handleSelect(symbol, name) {
    setQuoteError(null);
    setSelectedSymbol(symbol);
    setSelectedName(name);
    fetchQuote(symbol)
      .then((q) => setQuotes((prev) => ({ ...prev, [symbol]: q })))
      .catch((err) => setQuoteError(err.message));
  }

  function closeHelp() {
    localStorage.setItem(SEEN_ONBOARDING_KEY, '1');
    setShowHelp(false);
  }

  function handleReset() {
    if (window.confirm('This will erase your virtual cash, holdings, and transaction history. Continue?')) {
      reset();
      setSelectedSymbol(null);
      setSelectedName('');
      setQuotes({});
    }
  }

  const holdingsValue = Object.values(state.holdings).reduce((sum, h) => {
    const q = quotes[h.symbol];
    return sum + (q ? q.price * h.shares : h.avgCost * h.shares);
  }, 0);

  const selectedQuote = selectedSymbol ? quotes[selectedSymbol] : null;
  const selectedHolding = selectedSymbol ? state.holdings[selectedSymbol] : null;

  return (
    <div className="app">
      {showHelp && <Onboarding onClose={closeHelp} />}

      <Header onShowHelp={() => setShowHelp(true)} onReset={handleReset} />

      <p className="global-disclaimer">
        ⚠️ Simulator only. Prices come from public market data (which may be delayed a few minutes)
        and no real money, brokerage account, or order ever leaves this app.
      </p>

      <PortfolioSummary
        cash={state.cash}
        holdingsValue={holdingsValue}
        totalRealizedPnL={totalRealizedPnL(state.transactions)}
        startingCash={STARTING_CASH}
      />

      <section className="panel">
        <h2>Look up a stock</h2>
        <SearchBar onSelect={handleSelect} />

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
        <HoldingsTable holdings={state.holdings} quotes={quotes} onSelect={handleSelect} />
      </section>

      <section className="panel">
        <h2>Transaction history</h2>
        <TransactionHistory transactions={state.transactions} />
      </section>

      <footer className="app-footer">
        Investment Trainer is an educational paper-trading simulator. It is not a brokerage, does not
        execute real trades, and is not financial advice.
      </footer>
    </div>
  );
}

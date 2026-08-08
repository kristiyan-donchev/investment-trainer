import { useCallback, useEffect, useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Onboarding from './Onboarding.jsx';
import DashboardPage from './DashboardPage.jsx';
import LeaderboardPage from './LeaderboardPage.jsx';
import WatchlistPage from './WatchlistPage.jsx';
import LearnPage from './LearnPage.jsx';
import FriendsPage from './FriendsPage.jsx';
import ChallengesPage from './ChallengesPage.jsx';
import NewsPage from './NewsPage.jsx';
import AdSlot from './AdSlot.jsx';
import LoadingScreen from './LoadingScreen.jsx';
import { usePortfolio } from '../hooks/usePortfolio.js';
import { fetchQuote } from '../lib/api.js';

const SEEN_ONBOARDING_KEY = 'tradescrim-seen-onboarding';
const QUOTE_REFRESH_MS = 20000;

const PAGE_META = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Practice trading with real market prices — using 100% virtual money.',
  },
  leaderboard: {
    title: 'Leaderboard',
    subtitle: 'See how your portfolio return compares to other traders.',
  },
  watchlist: {
    title: 'Watchlist',
    subtitle: 'Track symbols you care about and get notified when they hit your price.',
  },
  news: {
    title: 'News',
    subtitle: 'Latest headlines from the markets.',
  },
  learn: {
    title: 'Learn',
    subtitle: 'Beginner-friendly explanations of how investing and this simulator work.',
  },
  friends: {
    title: 'Friends',
    subtitle: 'Add friends to compare portfolios and challenge each other.',
  },
  challenges: {
    title: 'Challenges',
    subtitle: 'Time-boxed ROI competitions with your friends — badges for participating and winning.',
  },
};

export default function TradingApp() {
  const { state, loading, buy, sell, reset, error } = usePortfolio();
  const [page, setPage] = useState('dashboard');
  const [selectedSymbol, setSelectedSymbol] = useState(null);
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
    fetchQuote(symbol)
      .then((q) => setQuotes((prev) => ({ ...prev, [symbol]: q })))
      .catch((err) => setQuoteError(err.message));
  }

  // Selecting a watched symbol should jump to the Dashboard, since that's
  // where the quote, chart, and trade panel actually live.
  function handleSelectFromWatchlist(symbol, name) {
    handleSelect(symbol, name);
    setPage('dashboard');
  }

  function closeHelp() {
    localStorage.setItem(SEEN_ONBOARDING_KEY, '1');
    setShowHelp(false);
  }

  async function handleReset() {
    if (window.confirm('This will erase your virtual cash, holdings, and transaction history. Continue?')) {
      await reset();
      setSelectedSymbol(null);
      setQuotes({});
    }
  }

  if (loading) {
    return <LoadingScreen label="Loading your portfolio" />;
  }

  const holdingsValue = Object.values(state.holdings).reduce((sum, h) => {
    const q = quotes[h.symbol];
    return sum + (q ? q.price * h.shares : h.avgCost * h.shares);
  }, 0);

  const selectedQuote = selectedSymbol ? quotes[selectedSymbol] : null;
  const selectedHolding = selectedSymbol ? state.holdings[selectedSymbol] : null;
  const meta = PAGE_META[page];

  return (
    <div className="app-shell">
      {showHelp && <Onboarding onClose={closeHelp} />}

      <Sidebar page={page} onNavigate={setPage} onShowHelp={() => setShowHelp(true)} onReset={handleReset} />

      <main className="main-content">
        <div className="main-layout">
          <div className="page-column">
            <div className="page-header">
              <h1>{meta.title}</h1>
              <p className="tagline">{meta.subtitle}</p>
            </div>

            <div className="page-content">
              {page === 'dashboard' && (
                <DashboardPage
                  state={state}
                  holdingsValue={holdingsValue}
                  quotes={quotes}
                  quoteError={quoteError}
                  selectedSymbol={selectedSymbol}
                  selectedQuote={selectedQuote}
                  selectedHolding={selectedHolding}
                  onSelect={handleSelect}
                  buy={buy}
                  sell={sell}
                  error={error}
                />
              )}
              {page === 'leaderboard' && <LeaderboardPage />}
              {page === 'watchlist' && <WatchlistPage onSelectSymbol={handleSelectFromWatchlist} />}
              {page === 'learn' && <LearnPage />}
              {page === 'friends' && <FriendsPage />}
              {page === 'challenges' && <ChallengesPage />}
              {page === 'news' && <NewsPage />}
            </div>

            <footer className="app-footer">
              TradeScrim is an educational paper-trading simulator. It is not a brokerage, does not
              execute real trades, and is not financial advice.
            </footer>
          </div>

          <aside className="ad-rail" aria-label="Advertisement">
            <AdSlot />
          </aside>
        </div>
      </main>
    </div>
  );
}

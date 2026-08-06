import Watchlist from './Watchlist.jsx';
import PriceAlerts from './PriceAlerts.jsx';
import { useWatchlist } from '../hooks/useWatchlist.js';

export default function WatchlistPage({ onSelectSymbol }) {
  const { watchlist, loading, error, remove } = useWatchlist();

  return (
    <>
      <section className="panel">
        <h2>Watchlist</h2>
        <Watchlist watchlist={watchlist} loading={loading} error={error} onRemove={remove} onSelect={onSelectSymbol} />
      </section>

      <section className="panel">
        <h2>Price alerts</h2>
        <PriceAlerts />
      </section>
    </>
  );
}

import { Icon } from './icons.jsx';

// Full-screen branded loader shown while checking the session and while the
// portfolio first loads — a spinning progress ring plus a little animated
// price line "flickering" inside it, on theme with the rest of the app.
export default function LoadingScreen({ label = 'Loading…' }) {
  return (
    <div className="loading-screen">
      <div className="loading-mark">
        <svg className="loading-ring" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="44" />
        </svg>
        <svg className="loading-spark" viewBox="0 0 100 100" aria-hidden="true">
          <polyline points="10,65 30,45 45,55 65,25 90,35" />
        </svg>
        <span className="loading-logo" aria-hidden="true">
          <Icon name="trending-up" size={28} />
        </span>
      </div>
      <div className="loading-wordmark">TradeScrim</div>
      <p className="loading-label">
        {label}
        <span className="loading-dots" aria-hidden="true">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </p>
    </div>
  );
}

import { useEffect, useState } from 'react';
import ProfileMenu from './ProfileMenu.jsx';
import { fetchUnseenAlertCount, fetchUnseenFriendRequestCount } from '../lib/api.js';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'learn', label: 'Learn', icon: '🎓' },
  { key: 'watchlist', label: 'Watchlist', icon: '👁️' },
  { key: 'challenges', label: 'Challenges', icon: '🎯' },
  { key: 'friends', label: 'Friends', icon: '🧑‍🤝‍🧑' },
  { key: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
];

const UNSEEN_POLL_MS = 30000;

export default function Sidebar({ page, onNavigate, onShowHelp, onReset }) {
  const [unseenAlerts, setUnseenAlerts] = useState(0);
  const [unseenRequests, setUnseenRequests] = useState(0);

  useEffect(() => {
    let cancelled = false;
    function poll() {
      fetchUnseenAlertCount()
        .then((count) => {
          if (!cancelled) setUnseenAlerts(count);
        })
        .catch(() => {});
      fetchUnseenFriendRequestCount()
        .then((count) => {
          if (!cancelled) setUnseenRequests(count);
        })
        .catch(() => {});
    }
    poll();
    const interval = setInterval(poll, UNSEEN_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [page]);

  return (
    <nav className="sidebar">
      <button type="button" className="sidebar-logo" onClick={() => onNavigate('dashboard')}>
        <span className="sidebar-logo-mark" aria-hidden="true">
          📈
        </span>
        <span className="sidebar-logo-text">TradeScrim</span>
      </button>

      <div className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={page === item.key ? 'sidebar-nav-item active' : 'sidebar-nav-item'}
            onClick={() => onNavigate(item.key)}
          >
            <span className="sidebar-nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="sidebar-nav-label">{item.label}</span>
            {item.key === 'watchlist' && unseenAlerts > 0 && (
              <span className="sidebar-nav-badge">{unseenAlerts}</span>
            )}
            {item.key === 'friends' && unseenRequests > 0 && (
              <span className="sidebar-nav-badge">{unseenRequests}</span>
            )}
          </button>
        ))}
      </div>

      <div className="sidebar-footer">
        <button type="button" className="sidebar-nav-item" onClick={onShowHelp}>
          <span className="sidebar-nav-icon" aria-hidden="true">
            ❔
          </span>
          <span className="sidebar-nav-label">Help &amp; terms</span>
        </button>

        <ProfileMenu onReset={onReset} />
      </div>
    </nav>
  );
}

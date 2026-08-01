import { useAuth } from '../context/AuthContext.jsx';
import ProfileMenu from './ProfileMenu.jsx';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  { key: 'learn', label: 'Learn', icon: '🎓' },
];

export default function Sidebar({ page, onNavigate, onShowHelp, onReset }) {
  const { user } = useAuth();

  return (
    <nav className="sidebar">
      <button type="button" className="sidebar-logo" onClick={() => onNavigate('dashboard')}>
        <span className="sidebar-logo-mark" aria-hidden="true">
          📈
        </span>
        <span className="sidebar-logo-text">Investment Trainer</span>
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

        <div className="sidebar-account">
          <ProfileMenu onReset={onReset} />
          {user && <span className="sidebar-username">{user.username}</span>}
        </div>
      </div>
    </nav>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

function formatMemberSince(createdAt) {
  if (!createdAt) return null;
  return new Date(createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ProfileMenu({ onReset }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // null | 'profile' | 'settings'
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  if (!user) return null;

  const initial = user.username?.[0]?.toUpperCase() || '?';
  const memberSince = formatMemberSince(user.createdAt);

  return (
    <div className="profile-menu" ref={menuRef}>
      <button
        type="button"
        className="profile-button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        {initial}
      </button>

      {menuOpen && (
        <div className="profile-dropdown" role="menu">
          <button
            type="button"
            className="profile-dropdown-item"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setActiveModal('profile');
            }}
          >
            Profile
          </button>
          <button
            type="button"
            className="profile-dropdown-item"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setActiveModal('settings');
            }}
          >
            Settings
          </button>
          <button
            type="button"
            className="profile-dropdown-item profile-dropdown-logout"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              logout();
            }}
          >
            Log out
          </button>
        </div>
      )}

      {activeModal === 'profile' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Your profile</h2>
              <button className="icon-button" onClick={() => setActiveModal(null)} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="profile-info">
              <div className="profile-avatar-large">{initial}</div>
              <div>
                <div className="profile-info-username">{user.username}</div>
                <div className="profile-info-email">{user.email}</div>
                {memberSince && <div className="profile-info-meta">Member since {memberSince}</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'settings' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Settings</h2>
              <button className="icon-button" onClick={() => setActiveModal(null)} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="settings-item">
              <div>
                <div className="settings-item-title">Reset simulator</div>
                <div className="settings-item-desc">
                  Erases your virtual cash, holdings, and transaction history, and starts you over with
                  $10,000.
                </div>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setActiveModal(null);
                  onReset();
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

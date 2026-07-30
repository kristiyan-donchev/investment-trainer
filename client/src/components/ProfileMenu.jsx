import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  if (!user) return null;

  const initial = user.username?.[0]?.toUpperCase() || '?';

  return (
    <div className="profile-menu" ref={menuRef}>
      <button
        type="button"
        className="profile-button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {initial}
      </button>

      {open && (
        <div className="profile-dropdown" role="menu">
          <div className="profile-dropdown-info">
            <div className="profile-dropdown-username">{user.username}</div>
            <div className="profile-dropdown-email">{user.email}</div>
          </div>
          <button
            type="button"
            className="profile-dropdown-logout"
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

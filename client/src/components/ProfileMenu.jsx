import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import PerformanceChart from './PerformanceChart.jsx';

function formatMemberSince(createdAt) {
  if (!createdAt) return null;
  return new Date(createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const initial = user.username?.[0]?.toUpperCase() || '?';
  const memberSince = formatMemberSince(user.createdAt);

  return (
    <>
      <button
        type="button"
        className="profile-button"
        onClick={() => setOpen(true)}
        aria-label="View profile"
        aria-haspopup="dialog"
      >
        {initial}
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Your profile</h2>
              <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close">
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

            <h3>Portfolio performance</h3>
            <PerformanceChart />

            <button
              type="button"
              className="secondary-button profile-logout"
              onClick={() => {
                setOpen(false);
                logout();
              }}
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </>
  );
}

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
  const { user, logout, updateUsername, changePassword, deleteAccount } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // null | 'profile' | 'settings'
  const menuRef = useRef(null);

  const [usernameInput, setUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState(null);
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameSuccess, setUsernameSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (activeModal === 'settings' && user) {
      setUsernameInput(user.username);
      setUsernameError(null);
      setUsernameSuccess(false);
      setCurrentPassword('');
      setNewPassword('');
      setPasswordError(null);
      setPasswordSuccess(false);
      setDeleteConfirmText('');
      setDeleteError(null);
    }
  }, [activeModal, user]);

  async function handleUsernameSubmit(e) {
    e.preventDefault();
    setUsernameError(null);
    setUsernameSuccess(false);
    setUsernameSaving(true);
    try {
      await updateUsername(usernameInput.trim());
      setUsernameSuccess(true);
    } catch (err) {
      setUsernameError(err.message);
    } finally {
      setUsernameSaving(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    setPasswordSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setPasswordSuccess(true);
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleDelete() {
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteAccount(deleteConfirmText);
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  }

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

            <div className="settings-section">
              <div className="settings-section-title">Change username</div>
              <form onSubmit={handleUsernameSubmit}>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => {
                    setUsernameInput(e.target.value);
                    setUsernameSuccess(false);
                  }}
                  minLength={3}
                  maxLength={24}
                  required
                />
                {usernameError && <div className="form-error">{usernameError}</div>}
                {usernameSuccess && <div className="form-success">Username updated.</div>}
                <button
                  type="submit"
                  className="secondary-button"
                  disabled={usernameSaving || usernameInput.trim() === user.username}
                >
                  {usernameSaving ? 'Saving…' : 'Save username'}
                </button>
              </form>
            </div>

            <div className="settings-divider" />

            <div className="settings-section">
              <div className="settings-section-title">{user.hasPassword ? 'Change password' : 'Set a password'}</div>
              <div className="settings-section-desc">
                {user.hasPassword
                  ? 'Update the password you use to sign in.'
                  : 'Your account currently signs in with Google only. Set a password to also sign in with your username.'}
              </div>
              <form onSubmit={handlePasswordSubmit}>
                {user.hasPassword && (
                  <input
                    type="password"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                )}
                <input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
                {passwordError && <div className="form-error">{passwordError}</div>}
                {passwordSuccess && <div className="form-success">Password updated.</div>}
                <button type="submit" className="secondary-button" disabled={passwordSaving}>
                  {passwordSaving ? 'Saving…' : user.hasPassword ? 'Update password' : 'Set password'}
                </button>
              </form>
            </div>

            <div className="settings-divider" />

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

            <div className="settings-divider" />

            <div className="settings-danger">
              <div className="settings-section-title">Delete account</div>
              <div className="settings-section-desc">
                This permanently deletes your account, cash, holdings, and transaction history. This
                cannot be undone. Type <strong>{user.username}</strong> to confirm.
              </div>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => {
                  setDeleteConfirmText(e.target.value);
                  setDeleteError(null);
                }}
                placeholder={user.username}
              />
              {deleteError && <div className="form-error">{deleteError}</div>}
              <button
                type="button"
                className="danger-button"
                disabled={deleteConfirmText !== user.username || deleting}
                onClick={handleDelete}
              >
                {deleting ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

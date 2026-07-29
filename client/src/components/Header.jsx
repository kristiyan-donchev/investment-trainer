import { useAuth } from '../context/AuthContext.jsx';

export default function Header({ onShowHelp, onReset }) {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <div>
        <h1>Investment Trainer</h1>
        <p className="tagline">Practice trading with real market prices — using 100% virtual money.</p>
        {user && <p className="signed-in-as">Signed in as {user.username}</p>}
      </div>
      <div className="header-actions">
        <button className="secondary-button" onClick={onShowHelp}>
          Help &amp; terms
        </button>
        <button className="secondary-button" onClick={onReset}>
          Reset simulator
        </button>
        <button className="secondary-button" onClick={logout}>
          Log out
        </button>
      </div>
    </header>
  );
}

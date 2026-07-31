import ProfileMenu from './ProfileMenu.jsx';

export default function Header({ onShowHelp, onReset, onGoHome }) {
  return (
    <header className="app-header">
      <div>
        <h1
          className="app-title-home"
          onClick={onGoHome}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onGoHome();
            }
          }}
        >
          Investment Trainer
        </h1>
        <p className="tagline">Practice trading with real market prices — using 100% virtual money.</p>
      </div>
      <div className="header-actions">
        <button className="secondary-button" onClick={onShowHelp}>
          Help &amp; terms
        </button>
        <ProfileMenu onReset={onReset} />
      </div>
    </header>
  );
}

export default function Header({ onShowHelp, onReset }) {
  return (
    <header className="app-header">
      <div>
        <h1>Investment Trainer</h1>
        <p className="tagline">Practice trading with real market prices — using 100% virtual money.</p>
      </div>
      <div className="header-actions">
        <button className="secondary-button" onClick={onShowHelp}>
          Help &amp; terms
        </button>
        <button className="secondary-button" onClick={onReset}>
          Reset simulator
        </button>
      </div>
    </header>
  );
}

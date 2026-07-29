import { useAuth } from './context/AuthContext.jsx';
import AuthPage from './components/AuthPage.jsx';
import TradingApp from './components/TradingApp.jsx';

export default function App() {
  const { user, checkingSession } = useAuth();

  if (checkingSession) {
    return (
      <div className="app">
        <p className="empty-state">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <TradingApp />;
}

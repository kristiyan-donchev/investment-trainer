import { useState } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import AuthPage from './components/AuthPage.jsx';
import TradingApp from './components/TradingApp.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';

export default function App() {
  const { user, checkingSession } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  // Lifted above TradingApp so the page a guest was browsing survives the
  // trip through AuthPage (which replaces TradingApp entirely while shown,
  // unmounting it — any state kept inside TradingApp itself wouldn't survive).
  const [page, setPage] = useState('dashboard');

  if (checkingSession) {
    return <LoadingScreen />;
  }

  if (!user && showAuth) {
    return <AuthPage onBack={() => setShowAuth(false)} />;
  }

  if (!user) {
    return <TradingApp guest onRequestLogin={() => setShowAuth(true)} page={page} setPage={setPage} />;
  }

  return <TradingApp page={page} setPage={setPage} />;
}

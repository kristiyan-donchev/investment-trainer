import { useAuth } from './context/AuthContext.jsx';
import AuthPage from './components/AuthPage.jsx';
import TradingApp from './components/TradingApp.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';

export default function App() {
  const { user, checkingSession } = useAuth();

  if (checkingSession) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return <TradingApp />;
}

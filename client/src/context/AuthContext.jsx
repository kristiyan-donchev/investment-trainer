import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as api from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    api
      .fetchCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setCheckingSession(false));
  }, []);

  const signup = useCallback(async (credentials) => {
    const newUser = await api.signup(credentials);
    setUser(newUser);
    return newUser;
  }, []);

  const login = useCallback(async (credentials) => {
    const loggedInUser = await api.login(credentials);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const updateUsername = useCallback(async (username) => {
    const updated = await api.updateUsername(username);
    setUser(updated);
    return updated;
  }, []);

  const changePassword = useCallback(async ({ currentPassword, newPassword }) => {
    await api.updatePassword({ currentPassword, newPassword });
  }, []);

  const deleteAccount = useCallback(async (confirmUsername) => {
    await api.deleteAccount(confirmUsername);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, checkingSession, signup, login, logout, updateUsername, changePassword, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

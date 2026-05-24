import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, fetchMe } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // On mount, verify token and load user
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await fetchMe();
        setUser(data.user);
        setToken(storedToken);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await loginUser({ email, password });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { data } = await registerUser({ name, email, password });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  // Hydrate user from an externally-provided token (e.g., OAuth callback)
  const hydrateFromToken = useCallback(async (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    try {
      const { data } = await fetchMe();
      setUser(data.user);
      return data.user;
    } catch {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      throw new Error('Failed to hydrate user from token');
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, hydrateFromToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
};

export default AuthContext;

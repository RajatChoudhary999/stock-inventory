import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { setAccessToken } from '../api/axiosClient';
import { authApi } from '../api/resources';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, try to restore a session via the refresh cookie.
  useEffect(() => {
    authApi
      .refresh()
      .then((r) => {
        setAccessToken(r.data.accessToken);
        setUser(r.data.user);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const { data } = await authApi.register(name, email, password);
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  const logout = async () => {
    await authApi.logout().catch(() => undefined);
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

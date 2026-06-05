import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  role: string;
  isProfileComplete: boolean;
  profile?: {
    fullName: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = sessionStorage.getItem('accessToken');
      if (token) {
        const { data } = await api.get('/auth/me');
        setUser(data);
      }
    } catch {
      sessionStorage.removeItem('accessToken');
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    sessionStorage.setItem('accessToken', data.accessToken);
    setUser(data.user);
  }

  async function register(email: string, password: string) {
    const { data } = await api.post('/auth/register', { email, password });
    sessionStorage.setItem('accessToken', data.accessToken);
    setUser(data.user);
  }

  function logout() {
    api.post('/auth/logout').catch(() => {});
    sessionStorage.removeItem('accessToken');
    setUser(null);
  }

  async function refreshUser() {
    const { data } = await api.get('/auth/me');
    setUser(data);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

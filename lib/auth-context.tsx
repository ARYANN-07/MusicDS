'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface User {
  username: string;
  selectedGenres: string[];
  createdAt: number;
}

interface AuthContextType {
  currentUser: User | null;
  isLoggedIn: boolean;
  isAuthLoading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

const STORAGE_KEY_USER = 'musicds_current_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY_USER);
    if (stored) {
      try {
        const user = JSON.parse(stored) as User;
        // Verify user still exists in backend
        fetch(`/api/backend/api/auth/user/${user.username}`)
          .then(res => {
            if (res.ok) return res.json();
            throw new Error('User not found');
          })
          .then((data: User) => {
            setCurrentUser(data);
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data));
          })
          .catch(() => {
            localStorage.removeItem(STORAGE_KEY_USER);
            setCurrentUser(null);
          })
          .finally(() => setIsAuthLoading(false));
      } catch {
        localStorage.removeItem(STORAGE_KEY_USER);
        setIsAuthLoading(false);
      }
    } else {
      setIsAuthLoading(false);
    }
  }, []);

  const signup = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch('/api/backend/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Signup failed' };

      const user: User = { username, selectedGenres: [], createdAt: Date.now() };
      setCurrentUser(user);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      return { ok: true };
    } catch {
      return { ok: false, error: 'Backend unavailable' };
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch('/api/backend/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Login failed' };

      const user = data.user as User;
      setCurrentUser(user);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      return { ok: true };
    } catch {
      return { ok: false, error: 'Backend unavailable' };
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem('musicds_has_onboarded');
    localStorage.removeItem('musicds_genres');
  }, []);

  return (
    <AuthContext.Provider value={{
      currentUser,
      isLoggedIn: !!currentUser,
      isAuthLoading,
      login,
      signup,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

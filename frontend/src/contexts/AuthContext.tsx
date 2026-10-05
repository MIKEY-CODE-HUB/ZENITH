'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { User } from '@/lib/types';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (loginIdentifier: string, password: string) => Promise<void>;
  register: (data: { name: string; username: string; email: string; password: string; preferredActivity?: string }) => Promise<void>;
  demoLogin: (username?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (loginIdentifier: string, password: string) => {
    const res = await api.login({ loginIdentifier, password });
    if (res.success && res.token) {
      api.setToken(res.token);
      setUser(res.user);
      router.push('/dashboard');
    }
  };

  const register = async (data: { name: string; username: string; email: string; password: string; preferredActivity?: string }) => {
    const res = await api.register(data);
    if (res.success && res.token) {
      api.setToken(res.token);
      setUser(res.user);
      router.push('/onboarding');
    }
  };

  const demoLogin = async (username: string = 'mikey') => {
    const res = await api.demoLogin(username);
    if (res.success && res.token) {
      api.setToken(res.token);
      setUser(res.user);
      router.push('/dashboard');
    }
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        demoLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

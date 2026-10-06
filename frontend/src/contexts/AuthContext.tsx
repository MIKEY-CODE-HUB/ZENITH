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

  const createDemoUser = (username: string = 'mikey'): User => ({
    id: `demo-${username}`,
    name: 'Scholar Mikey',
    username: username,
    email: `${username}@zenith.app`,
    avatarUrl: '',
    preferredActivity: 'DSA & Engineering',
    typicalDuration: 50,
    cameraAccountability: false,
    distractionWarnings: true,
    streakTracking: true,
    createdAt: new Date().toISOString(),
  });

  const refreshUser = async () => {
    try {
      if (typeof window !== 'undefined') {
        const storedDemo = localStorage.getItem('zenith_demo_user');
        if (storedDemo) {
          try {
            setUser(JSON.parse(storedDemo));
            setLoading(false);
            return;
          } catch (e) {}
        }
      }
      const res = await api.getMe();
      if (res && res.success && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      if (typeof window !== 'undefined') {
        const storedDemo = localStorage.getItem('zenith_demo_user');
        if (storedDemo) {
          try {
            setUser(JSON.parse(storedDemo));
          } catch (e) {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (loginIdentifier: string, password: string) => {
    try {
      const res = await api.login({ loginIdentifier, password });
      if (res && res.success && res.token) {
        api.setToken(res.token);
        setUser(res.user);
        if (typeof window !== 'undefined') {
          window.location.href = '/dashboard';
        } else {
          router.push('/dashboard');
        }
        return;
      }
    } catch (err: any) {
      if (loginIdentifier.toLowerCase().includes('mikey') || loginIdentifier.toLowerCase().includes('demo') || !password) {
        await demoLogin(loginIdentifier || 'mikey');
        return;
      }
      throw err;
    }
  };

  const register = async (data: { name: string; username: string; email: string; password: string; preferredActivity?: string }) => {
    try {
      const res = await api.register(data);
      if (res && res.success && res.token) {
        api.setToken(res.token);
        setUser(res.user);
        router.push('/onboarding');
      }
    } catch (err) {
      // In standalone demo mode, create user locally
      const demoUser = createDemoUser(data.username || 'mikey');
      demoUser.name = data.name || demoUser.name;
      demoUser.email = data.email || demoUser.email;
      api.setToken('demo-token-zenith');
      if (typeof window !== 'undefined') {
        localStorage.setItem('zenith_demo_user', JSON.stringify(demoUser));
      }
      setUser(demoUser);
      router.push('/dashboard');
    }
  };

  const demoLogin = async (username: string = 'mikey') => {
    const demoUser = createDemoUser(username);
    api.setToken('demo-token-zenith');
    if (typeof window !== 'undefined') {
      localStorage.setItem('zenith_demo_user', JSON.stringify(demoUser));
    }
    setUser(demoUser);

    // Sync in background if backend is online
    api.demoLogin(username).catch(() => {});

    // Instant redirect
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    } else {
      router.push('/dashboard');
    }
  };

  const logout = () => {
    api.clearToken();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('zenith_demo_user');
    }
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    } else {
      router.push('/');
    }
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

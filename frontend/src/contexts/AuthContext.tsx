'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { User } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (loginIdentifier: string, password: string) => Promise<void>;
  register: (data: { name: string; username: string; email?: string; phoneNumber?: string; password: string; preferredActivity?: string }) => Promise<void>;
  passwordAuth: (action: 'register' | 'login', data: { username: string; password: string; name?: string }) => Promise<void>;
  googleAuth: (data: { idToken?: string; credential?: string }, inviteRoomId?: string) => Promise<void>;
  sendPhoneOtp: (phoneNumber: string) => Promise<{ success: boolean; message: string; cooldownSeconds: number; devCode?: string }>;
  verifyPhoneOtp: (phoneNumber: string, otpCode: string, name?: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string; devToken?: string }>;
  resetPassword: (resetToken: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  const refreshUser = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('trapbreaker_token') : null;
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const res = await api.getMe();
      if (res && res.success && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
        api.clearToken();
      }
    } catch (err) {
      setUser(null);
      if (err instanceof ApiError && err.status === 401) api.clearToken();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const appearanceMode = user?.settings?.appearanceMode === 'light' ? 'light' : 'dark';
  useEffect(() => {
    document.documentElement.classList.toggle('dark', appearanceMode === 'dark');
    document.documentElement.dataset.appearance = appearanceMode;
  }, [appearanceMode]);

  const login = async (loginIdentifier: string, password: string) => {
    const res = await api.login({ loginIdentifier, password });
    if (res && res.success && res.token) {
      api.setToken(res.token);
      setUser(res.user);
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard';
      } else {
        router.push('/dashboard');
      }
    }
  };

  const register = async (data: { name: string; username: string; email?: string; phoneNumber?: string; password: string; preferredActivity?: string }) => {
    const res = await api.register(data);
    if (res && res.success && res.token) {
      api.setToken(res.token);
      setUser(res.user);
      router.push('/onboarding');
    }
  };

  const passwordAuth: AuthContextType['passwordAuth'] = async (action, data) => {
    const res = await api.passwordAuth(action, data);
    if (!res.success || !res.token) throw new Error('Could not start your Zenith session.');
    api.setToken(res.token);
    setUser(res.user);
  };

  const googleAuth = async (data: { idToken?: string; credential?: string }, inviteRoomId?: string) => {
    const res = await api.googleAuth(data);
    if (!res.success || !res.token) throw new Error('Google sign-in did not establish a session.');
    api.setToken(res.token);
    setUser(res.user);
    const destination = inviteRoomId && /^[a-f0-9-]{36}$/i.test(inviteRoomId)
      ? `/invite/${inviteRoomId}`
      : '/dashboard';
    window.location.assign(destination);
  };

  const sendPhoneOtp = async (phoneNumber: string) => {
    return await api.sendPhoneOtp({ phoneNumber });
  };

  const verifyPhoneOtp = async (phoneNumber: string, otpCode: string, name?: string) => {
    const res = await api.verifyPhoneOtp({ phoneNumber, otpCode, name });
    if (res && res.success && res.token) {
      api.setToken(res.token);
      setUser(res.user);
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard';
      } else {
        router.push('/dashboard');
      }
    }
  };

  const forgotPassword = async (email: string) => {
    return await api.forgotPassword({ email });
  };

  const resetPassword = async (resetToken: string, newPassword: string) => {
    return await api.resetPassword({ resetToken, newPassword });
  };

  const logout = async () => {
    await api.logout();
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
        passwordAuth,
        googleAuth,
        sendPhoneOtp,
        verifyPhoneOtp,
        forgotPassword,
        resetPassword,
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

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { User } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (loginIdentifier: string, password: string) => Promise<void>;
  register: (data: { name: string; username: string; email?: string; phoneNumber?: string; password: string; preferredActivity?: string }) => Promise<void>;
  googleAuth: (data: { email: string; name?: string; googleId: string; avatarUrl?: string }) => Promise<void>;
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
      api.clearToken();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

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

  const googleAuth = async (data: { email: string; name?: string; googleId: string; avatarUrl?: string }) => {
    const res = await api.googleAuth(data);
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
      window.location.href = '/login';
    } else {
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
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

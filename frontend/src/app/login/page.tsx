'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Zap, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const { login, demoLogin } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(identifier, password);
    } catch (err: any) {
      setError(err.message || 'Invalid email/username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[#09090b] text-zinc-100">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-zinc-950 shadow-sm">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="m10 15 5-3-5-3v6Z" fill="currentColor" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Sign in to Zenith</h1>
          <p className="text-xs text-zinc-400">Lock into your focus room and track your deep work</p>
        </div>

        <div className="rounded-2xl bg-[#121215] border border-white/[0.08] p-6 shadow-2xl space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1.5">Email or Username</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="mikey or mikey@zenith.app"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full rounded-lg bg-[#18181c] border border-white/[0.08] pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-white/20 focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg bg-[#18181c] border border-white/[0.08] pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-white/20 focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-100 transition-colors shadow-sm disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Quick Demo Login Option */}
          <div className="space-y-2.5 pt-3 border-t border-white/[0.06]">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider text-center">
              Quick Demo Login
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => demoLogin('mikey')}
                className="py-2 px-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] text-xs font-medium text-zinc-300 transition-colors text-center"
              >
                <span>Mikey (Dev)</span>
              </button>
              <button
                type="button"
                onClick={() => demoLogin('alexchen')}
                className="py-2 px-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] text-xs font-medium text-zinc-300 transition-colors text-center"
              >
                <span>Alex (Student)</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-400">
          Don't have an account?{' '}
          <Link href="/signup" className="text-white font-medium hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}

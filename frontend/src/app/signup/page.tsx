'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityType } from '@/lib/types';
import { Zap, Lock, Mail, User, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [preferredActivity, setPreferredActivity] = useState<ActivityType>('Coding');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await register({
        name,
        username,
        email,
        password,
        preferredActivity,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
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
          <h1 className="text-xl font-semibold text-white tracking-tight">Create your account</h1>
          <p className="text-xs text-zinc-400">Join silent accountability rooms and eliminate distractions</p>
        </div>

        <div className="rounded-2xl bg-[#121215] border border-white/[0.08] p-6 shadow-2xl space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">Full Name</label>
              <input
                type="text"
                placeholder="Mikey Anderson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg bg-[#18181c] border border-white/[0.08] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-white/20 focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">Username</label>
              <input
                type="text"
                placeholder="mikey"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg bg-[#18181c] border border-white/[0.08] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-white/20 focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">Email Address</label>
              <input
                type="email"
                placeholder="mikey@zenith.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-[#18181c] border border-white/[0.08] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-white/20 focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-[#18181c] border border-white/[0.08] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-white/20 focus:outline-none transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-100 transition-colors shadow-sm disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Creating account...' : 'Create Account'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-400">
          Already have an account?{' '}
          <Link href="/login" className="text-white font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

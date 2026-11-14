'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiError } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { formatMinutesHuman } from '@/lib/utils';
import { User, Flame, Trophy } from 'lucide-react';

import Link from 'next/link';

export default function ProfilePage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof api.getProfile>>['profile'] | null>(null);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const [brokenAvatar, setBrokenAvatar] = useState('');
  const [attempt, setAttempt] = useState(0);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setExpired(false);
    setProfile(null);
    api.getProfile().then(({ profile }) => {
      if (!cancelled) setProfile(profile);
    }).catch(error => {
      if (cancelled) return;
      const needsLogin = error instanceof ApiError && error.status === 401;
      setExpired(needsLogin);
      setError(needsLogin ? 'Your session expired. Log in again to view your profile.'
        : 'Could not load your profile. Try again in a moment.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, attempt]);

  if (authLoading || !user || loading || error || !profile || profile.id !== user.id) {
    const pending = authLoading || Boolean(user && loading);
    return (
      <main className="mx-auto grid min-h-[calc(100dvh-3.5rem)] max-w-xl content-center gap-4 px-6">
        <h1 className="text-2xl font-semibold">Profile</h1>
        {pending ? <p role="status">Loading your profile…</p> : !user ? (
          <Link href="/login" className="underline">Log in to view your profile</Link>
        ) : (
          <><p role="alert">{error || 'Your profile could not be loaded.'}</p>
            {expired ? <button type="button" className="w-fit underline" onClick={() => void refreshUser().then(() => { window.location.assign('/login'); })}>Log in again</button>
              : <button type="button" className="w-fit underline" onClick={() => setAttempt(value => value + 1)}>Retry</button>}</>
        )}
      </main>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090b] text-zinc-100">
      <Sidebar />

      <main className="flex-1 p-5 sm:p-8 max-w-5xl mx-auto space-y-6">
        {/* User Hero Banner */}
        <div className="rounded-xl bg-[#121215] border border-white/[0.08] p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-zinc-800">
            {profile.avatarUrl && profile.avatarUrl !== brokenAvatar ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover"
              onError={() => setBrokenAvatar(profile.avatarUrl ?? '')} /> : <User size={24} aria-hidden />}
          </div>

          <div className="space-y-2 text-center sm:text-left flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-xl font-semibold text-white tracking-tight">{profile.name}</h1>
                <p className="text-xs text-zinc-400">@{profile.username}{profile.email && ` · ${profile.email}`}</p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.03] border border-white/[0.08] text-zinc-300 text-xs font-medium self-center sm:self-auto">
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                <span>{profile?.currentStreak || 0} day streak</span>
              </div>
            </div>

            <p className="text-xs text-zinc-400">
              Primary: <span className="font-medium text-zinc-200">{profile.preferredActivity}</span> • Default block: <span className="font-medium text-zinc-200">{profile.typicalDuration}m</span>
            </p>
          </div>
        </div>

        {/* Lifetime Productivity Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#121215] border border-white/[0.07] space-y-1">
            <span className="text-xs text-zinc-400 font-medium">Total Focus</span>
            <p className="text-2xl font-semibold text-white tracking-tight">
              {formatMinutesHuman(profile?.totalFocusedMinutes || 0)}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#121215] border border-white/[0.07] space-y-1">
            <span className="text-xs text-zinc-400 font-medium">Average Score</span>
            <p className="text-2xl font-semibold text-white tracking-tight">
              {profile?.averageFocusScore || 0}%
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#121215] border border-white/[0.07] space-y-1">
            <span className="text-xs text-zinc-400 font-medium">Total Sessions</span>
            <p className="text-2xl font-semibold text-white tracking-tight">
              {profile?.totalSessionsCount || 0}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#121215] border border-white/[0.07] space-y-1">
            <span className="text-xs text-zinc-400 font-medium">Best Score</span>
            <p className="text-2xl font-semibold text-white tracking-tight">
              {profile?.bestFocusScore || 0}%
            </p>
          </div>
        </div>

        {/* Unlocked Badges Mini Showcase */}
        <div className="rounded-xl bg-[#121215] border border-white/[0.07] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h3 className="text-xs font-semibold text-white flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5 text-zinc-400" />
              <span>Unlocked Milestones</span>
            </h3>
            <Link href="/achievements" className="text-xs text-zinc-400 hover:text-white transition-colors">
              View all
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {profile?.userAchievements && profile.userAchievements.length > 0 ? (
              profile.userAchievements.map((ua) => (
                <div
                  key={ua.id}
                  className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center gap-2.5"
                >
                  <span className="text-lg">{ua.achievement?.icon || '🏆'}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">{ua.achievement?.title}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{ua.achievement?.category}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-4 p-4 text-center text-xs text-zinc-500">
                Complete your first session to unlock achievement badges.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

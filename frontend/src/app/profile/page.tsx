'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { formatMinutesHuman } from '@/lib/utils';
import { User, Flame, Clock, Award, Trophy, Zap, Shield } from 'lucide-react';

import Link from 'next/link';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const res = await api.getProfile();
        if (res.success && res.profile) {
          setProfile(res.profile);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090b] text-zinc-100">
      <Sidebar />

      <main className="flex-1 p-5 sm:p-8 max-w-5xl mx-auto space-y-6">
        {/* User Hero Banner */}
        <div className="rounded-xl bg-[#121215] border border-white/[0.08] p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <img
            src={user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.username || 'mikey'}`}
            alt={user?.name}
            className="h-18 w-18 rounded-xl object-cover bg-zinc-800 border border-white/10 shadow-sm"
          />

          <div className="space-y-2 text-center sm:text-left flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-xl font-semibold text-white tracking-tight">{user?.name || 'Mikey'}</h1>
                <p className="text-xs text-zinc-400">@{user?.username} • {user?.email}</p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.03] border border-white/[0.08] text-zinc-300 text-xs font-medium self-center sm:self-auto">
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                <span>{profile?.currentStreak || 0} day streak</span>
              </div>
            </div>

            <p className="text-xs text-zinc-400">
              Primary: <span className="font-medium text-zinc-200">{user?.preferredActivity || 'Coding'}</span> • Default block: <span className="font-medium text-zinc-200">{user?.typicalDuration || 50}m</span>
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
              profile.userAchievements.map((ua: any) => (
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

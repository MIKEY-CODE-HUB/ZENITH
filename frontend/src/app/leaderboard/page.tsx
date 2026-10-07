'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { LeaderboardItem } from '@/lib/types';
import { formatMinutesHuman } from '@/lib/utils';
import { Award, Flame, Clock, Zap, Trophy } from 'lucide-react';

export default function LeaderboardPage() {
  const [metric, setMetric] = useState<'score' | 'time' | 'streak'>('score');
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        setLoading(true);
        const res = await api.getLeaderboard(metric);
        if (res.success && res.leaderboard) {
          setLeaderboard(res.leaderboard);
        }
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();
  }, [metric]);

  const getRankBadge = (idx: number) => {
    if (idx === 0) return <span className="text-xs font-semibold text-amber-400 font-mono">1</span>;
    if (idx === 1) return <span className="text-xs font-semibold text-zinc-300 font-mono">2</span>;
    if (idx === 2) return <span className="text-xs font-semibold text-amber-600 font-mono">3</span>;
    return <span className="text-xs font-mono text-zinc-500">{idx + 1}</span>;
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090b] text-zinc-100">
      <Sidebar />

      <main className="flex-1 p-5 sm:p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1">
              <Award className="h-3.5 w-3.5 text-zinc-400" />
              <span>Rankings</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              Community Leaderboard
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Peer rankings based on verified focus sessions and consistency.
            </p>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex gap-1 p-1 bg-[#121215] rounded-xl border border-white/[0.08]">
            <button
              onClick={() => setMetric('score')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                metric === 'score'
                  ? 'bg-white text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Score
            </button>
            <button
              onClick={() => setMetric('time')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                metric === 'time'
                  ? 'bg-white text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Time
            </button>
            <button
              onClick={() => setMetric('streak')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                metric === 'streak'
                  ? 'bg-white text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Streak
            </button>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="rounded-xl bg-[#121215] border border-white/[0.07] overflow-hidden">
          <div className="divide-y divide-white/[0.05]">
            {leaderboard.map((item, idx) => (
              <div
                key={item.id}
                className={`p-4 sm:p-4.5 flex items-center justify-between gap-4 transition-colors ${
                  idx < 3 ? 'bg-white/[0.015] hover:bg-white/[0.03]' : 'hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-6 text-center flex items-center justify-center">
                    {getRankBadge(idx)}
                  </div>
                  <img
                    src={item.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${item.username}`}
                    alt={item.name}
                    className="h-9 w-9 rounded-lg object-cover bg-zinc-800 border border-white/10"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                    <p className="text-[11px] text-zinc-400">@{item.username} • {item.preferredActivity}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-right font-mono">
                  {metric === 'score' && (
                    <div>
                      <p className="text-base font-semibold text-white">{item.averageScore}%</p>
                      <p className="text-[10px] text-zinc-500 font-sans">{item.sessionsCount} sessions</p>
                    </div>
                  )}

                  {metric === 'time' && (
                    <div>
                      <p className="text-base font-semibold text-white">
                        {formatMinutesHuman(item.totalFocusedMinutes)}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-sans">focused time</p>
                    </div>
                  )}

                  {metric === 'streak' && (
                    <div>
                      <p className="text-base font-semibold text-white flex items-center justify-end gap-1">
                        <Flame className="h-3.5 w-3.5 text-amber-400" />
                        <span>{item.streak} days</span>
                      </p>
                      <p className="text-[10px] text-zinc-500 font-sans">current streak</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && !loading && (
              <div className="p-12 text-center text-zinc-500 text-xs font-medium space-y-1">
                <p className="text-zinc-300 font-semibold text-sm">Clean cycle slate</p>
                <p>No verified sessions recorded yet this cycle. Complete your first focus session to claim your rank.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

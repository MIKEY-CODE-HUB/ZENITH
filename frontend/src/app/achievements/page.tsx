'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { AchievementBadge } from '@/components/AchievementBadge';
import { Achievement } from '@/lib/types';
import { Trophy, Award, Sparkles } from 'lucide-react';

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAchievements() {
      try {
        setLoading(true);
        const res = await api.getAchievements();
        if (res.success) {
          setAchievements(res.achievements || []);
          setUnlockedCount(res.unlockedCount || 0);
          setTotalCount(res.totalCount || 0);
        }
      } catch (err) {
        console.error('Error fetching achievements:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAchievements();
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090b] text-zinc-100">
      <Sidebar />

      <main className="flex-1 p-5 sm:p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1">
              <Trophy className="h-3.5 w-3.5 text-zinc-400" />
              <span>Milestones</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              Achievements
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Earned badges based on verified focus duration, daily consistency, and score milestones.
            </p>
          </div>

          <div className="px-3.5 py-1.5 rounded-lg bg-[#121215] border border-white/[0.08] text-xs font-medium text-zinc-300 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Unlocked: {unlockedCount} of {totalCount}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Overall completion</span>
            <span className="font-mono">{totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              style={{ width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%` }}
              className="h-full bg-white rounded-full transition-all duration-500"
            />
          </div>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((ach) => (
            <AchievementBadge key={ach.id} achievement={ach} />
          ))}
        </div>
      </main>
    </div>
  );
}

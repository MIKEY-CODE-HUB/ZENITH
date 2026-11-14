'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { AchievementBadge } from '@/components/AchievementBadge';
import { Achievement } from '@/lib/types';
import { Trophy } from 'lucide-react';

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    loadAchievements();
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] text-zinc-100">
      <Sidebar />

      <main className="zenith-room-content mx-auto min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-9 xl:px-10">
        <header className="zenith-room-intro cozy-glass">
          <div>
            <h1 className="font-serif text-4xl tracking-tight text-[#fff5e9] sm:text-5xl">Achievements</h1>
            <p className="mt-2 text-sm text-[#e3d1c0]">Milestones from your focus sessions.</p>
          </div>
          {!loading && !error && (
            <div className="min-w-[12rem] space-y-2">
              <div className="flex items-center gap-2 text-sm text-[#f5dfbf]">
                <Trophy size={16} aria-hidden /> {unlockedCount} of {totalCount} unlocked
              </div>
              <progress aria-label="Achievements unlocked" className="zenith-achievement-progress"
                value={unlockedCount} max={Math.max(totalCount, 1)} />
            </div>
          )}
        </header>
        {loading ? <p role="status">Loading achievements…</p> : error ? (
          <p role="alert">Could not load achievements. Sign in or refresh to try again.</p>
        ) : (
          <div className="zenith-room-grid">
            {achievements.map(achievement => <AchievementBadge key={achievement.id} achievement={achievement} />)}
          </div>
        )}
      </main>
    </div>
  );
}

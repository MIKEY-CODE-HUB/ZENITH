'use client';

import React from 'react';
import { Achievement } from '@/lib/types';
import { Trophy, Lock, CheckCircle2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface AchievementBadgeProps {
  achievement: Achievement;
}

export function AchievementBadge({ achievement }: AchievementBadgeProps) {
  const isUnlocked = achievement.unlocked;

  return (
    <div
      className={`relative rounded-xl p-4.5 border transition-all duration-200 flex flex-col justify-between space-y-3.5 ${
        isUnlocked
          ? 'bg-[#121215] border-white/[0.1] hover:border-white/20'
          : 'bg-[#121215]/40 border-white/[0.04] opacity-50'
      }`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg ${
            isUnlocked
              ? 'bg-white/[0.05] border border-white/10'
              : 'bg-white/[0.02] border border-white/[0.05] grayscale'
          }`}
        >
          {achievement.icon || '🏆'}
        </div>

        {isUnlocked ? (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" />
            Unlocked
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 bg-white/[0.03] px-2 py-0.5 rounded-md border border-white/[0.06]">
            <Lock className="h-3 w-3" />
            Locked
          </span>
        )}
      </div>

      <div>
        <h4 className="text-xs font-semibold text-white">{achievement.title}</h4>
        <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{achievement.description}</p>
      </div>

      {isUnlocked && achievement.unlockedAt && (
        <p className="text-[10px] text-zinc-500 font-mono border-t border-white/[0.05] pt-2">
          Earned {formatDate(achievement.unlockedAt)}
        </p>
      )}
    </div>
  );
}

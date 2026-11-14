'use client';

import { type Achievement } from '@/lib/types';
import { Lock, CheckCircle2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export function AchievementBadge({ achievement }: { achievement: Achievement }) {
  const { unlocked, unlockedAt, icon, title, description } = achievement;

  return (
    <article className="zenith-achievement cozy-glass" data-earned={unlocked}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#eed3ac]/20 bg-[#eed3ac]/10 text-lg">
          {icon || '🏆'}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 text-xs text-[#ead8c6]">
          {unlocked ? <CheckCircle2 size={14} className="text-[#efd3ac]" /> : <Lock size={13} />} {unlocked ? 'Unlocked' : 'Locked'}
        </span>
      </div>
      <div className="mt-4">
        <h2 className="text-base font-semibold text-[#fff5e9]">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-[#e3d1c0]">{description}</p>
      </div>
      {unlocked && unlockedAt && <p className="mt-3 border-t border-white/10 pt-2 text-xs text-[#efd3ac]">Earned {formatDate(unlockedAt)}</p>}
    </article>
  );
}

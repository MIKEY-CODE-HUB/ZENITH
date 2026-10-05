'use client';

import React from 'react';
import { formatSeconds, formatDurationHuman } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface TruthTrackerProps {
  plannedDurationMinutes: number;
  focusedSeconds: number;
  distractedSeconds: number;
  idleSeconds: number;
  focusScore?: number;
  showDetails?: boolean;
}

export function TruthTrackerBar({
  plannedDurationMinutes,
  focusedSeconds,
  distractedSeconds,
  idleSeconds,
  focusScore,
  showDetails = true,
}: TruthTrackerProps) {
  const totalRecorded = Math.max(1, focusedSeconds + distractedSeconds + idleSeconds);

  const focusPct = Math.min(100, Math.round((focusedSeconds / totalRecorded) * 100));
  const distractedPct = Math.min(100, Math.round((distractedSeconds / totalRecorded) * 100));
  const idlePct = Math.max(0, 100 - (focusPct + distractedPct));

  return (
    <div className="w-full rounded-xl bg-[#121215] border border-white/[0.08] p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <h3 className="text-xs font-semibold text-white tracking-tight">Focus Balance</h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-400 font-normal">Efficiency</span>
          <span className="font-semibold text-white tabular-nums px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10">
            {focusPct}%
          </span>
        </div>
      </div>

      {/* Segmented Progress Bar */}
      <div className="relative w-full h-2 bg-white/[0.05] rounded-full overflow-hidden flex gap-0.5">
        <div
          style={{ width: `${focusPct}%` }}
          className="h-full bg-emerald-500 rounded-l-full transition-all duration-500"
          title={`Focused: ${formatDurationHuman(focusedSeconds)} (${focusPct}%)`}
        />
        <div
          style={{ width: `${distractedPct}%` }}
          className="h-full bg-rose-500 transition-all duration-500"
          title={`Distracted: ${formatDurationHuman(distractedSeconds)} (${distractedPct}%)`}
        />
        <div
          style={{ width: `${idlePct}%` }}
          className="h-full bg-amber-500 rounded-r-full transition-all duration-500"
          title={`Idle: ${formatDurationHuman(idleSeconds)} (${idlePct}%)`}
        />
      </div>

      {/* Breakdown Metrics */}
      {showDetails && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-0.5">
            <span className="text-zinc-500 text-[11px] block">Planned Target</span>
            <p className="text-sm font-semibold text-white tabular-nums">{plannedDurationMinutes}m</p>
          </div>

          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-0.5">
            <span className="text-emerald-400/90 text-[11px] block">Deep Work</span>
            <p className="text-sm font-semibold text-emerald-400 tabular-nums">{formatSeconds(focusedSeconds)}</p>
          </div>

          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-0.5">
            <span className="text-rose-400/90 text-[11px] block">Paused / Distracted</span>
            <p className="text-sm font-semibold text-rose-400 tabular-nums">{formatSeconds(distractedSeconds)}</p>
          </div>

          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-0.5">
            <span className="text-amber-400/90 text-[11px] block">Idle Period</span>
            <p className="text-sm font-semibold text-amber-400 tabular-nums">{formatSeconds(idleSeconds)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

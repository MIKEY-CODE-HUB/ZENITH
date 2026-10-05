'use client';

import React from 'react';
import { FocusEvent } from '@/lib/types';
import { formatSeconds } from '@/lib/utils';

interface SessionTimelineProps {
  plannedDurationMinutes: number;
  events?: FocusEvent[];
  focusedDurationSeconds: number;
  distractedDurationSeconds: number;
  idleDurationSeconds: number;
}

export function SessionTimelineView({
  plannedDurationMinutes,
  events = [],
  focusedDurationSeconds,
  distractedDurationSeconds,
  idleDurationSeconds,
}: SessionTimelineProps) {
  const totalSeconds = Math.max(60, plannedDurationMinutes * 60);

  // If detailed events are available, generate timeline segments; otherwise use aggregate blocks
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Focused ({formatSeconds(focusedDurationSeconds)})</span>
          </div>
          {distractedDurationSeconds > 0 && (
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              <span>Distracted ({formatSeconds(distractedDurationSeconds)})</span>
            </div>
          )}
          {idleDurationSeconds > 0 && (
            <div className="flex items-center gap-1.5 text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
              <span>Idle ({formatSeconds(idleDurationSeconds)})</span>
            </div>
          )}
        </div>
      </div>

      {/* Visual Timeline Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-3 bg-white/[0.04] rounded-full overflow-hidden flex border border-white/[0.06] p-0.5 gap-0.5">
          <div
            style={{ width: `${(focusedDurationSeconds / totalSeconds) * 100}%` }}
            className="h-full bg-emerald-500/80 rounded-full"
            title={`Focused: ${formatSeconds(focusedDurationSeconds)}`}
          />
          {distractedDurationSeconds > 0 && (
            <div
              style={{ width: `${(distractedDurationSeconds / totalSeconds) * 100}%` }}
              className="h-full bg-rose-500/80 rounded-full"
              title={`Distracted: ${formatSeconds(distractedDurationSeconds)}`}
            />
          )}
          {idleDurationSeconds > 0 && (
            <div
              style={{ width: `${(idleDurationSeconds / totalSeconds) * 100}%` }}
              className="h-full bg-zinc-600 rounded-full"
              title={`Idle: ${formatSeconds(idleDurationSeconds)}`}
            />
          )}
        </div>

        {/* Timestamps */}
        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span>00:00</span>
          <span>{Math.round(plannedDurationMinutes / 2)}:00</span>
          <span>{plannedDurationMinutes}:00</span>
        </div>
      </div>
    </div>
  );
}

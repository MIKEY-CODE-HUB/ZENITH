'use client';

import React from 'react';
import { formatSeconds } from '@/lib/utils';
import { FocusStatus } from '@/lib/types';
import { Flame } from 'lucide-react';

interface FocusTimerProps {
  remainingSeconds: number;
  totalPlannedSeconds: number;
  focusStatus: FocusStatus;
  streakSeconds: number;
  isRunning?: boolean;
}

export function FocusTimer({
  remainingSeconds,
  totalPlannedSeconds,
  focusStatus,
  streakSeconds,
  isRunning = true,
}: FocusTimerProps) {
  const elapsed = Math.max(0, totalPlannedSeconds - remainingSeconds);
  const progressPercent = Math.min(100, Math.max(0, (elapsed / Math.max(1, totalPlannedSeconds)) * 100));

  // Circle geometry
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const getStatusBadge = () => {
    switch (focusStatus) {
      case 'FOCUSED':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>In deep focus</span>
          </div>
        );
      case 'IDLE':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>Idle / Inactive</span>
          </div>
        );
      case 'DISTRACTED':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping" />
            <span>Shield active</span>
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-xs font-medium">
            <span>Offline</span>
          </div>
        );
    }
  };

  const getRingColor = () => {
    if (focusStatus === 'DISTRACTED') return '#F43F5E';
    if (focusStatus === 'IDLE') return '#F59E0B';
    return '#10B981';
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-4">
      {getStatusBadge()}

      {/* Circular SVG Timer */}
      <div className="relative flex items-center justify-center">
        <svg className="w-56 h-56 transform -rotate-90">
          {/* Background circle track */}
          <circle
            cx="112"
            cy="112"
            r={radius}
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth="6"
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx="112"
            cy="112"
            r={radius}
            stroke={getRingColor()}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>

        {/* Center Countdown Display */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-semibold tracking-tight text-white tabular-nums">
            {formatSeconds(remainingSeconds)}
          </span>
          <span className="text-[11px] font-medium text-zinc-500 mt-1 uppercase tracking-wider">
            Remaining
          </span>
          {streakSeconds > 0 && focusStatus === 'FOCUSED' && (
            <span className="mt-2 text-[11px] font-medium text-amber-400/90 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              <Flame className="h-3 w-3 fill-current" />
              <span>{formatSeconds(streakSeconds)} streak</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

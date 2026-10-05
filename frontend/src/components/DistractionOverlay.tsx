'use client';

import React from 'react';
import { ShieldAlert, ArrowRight, LogOut } from 'lucide-react';

interface DistractionOverlayProps {
  isOpen: boolean;
  distractionSeconds?: number;
  message?: string;
  tabSwitchCount: number;
  onReturnToRoom: () => void;
  onLeaveSession: () => void;
}

export function DistractionOverlay({
  isOpen,
  distractionSeconds = 0,
  message,
  tabSwitchCount,
  onReturnToRoom,
  onLeaveSession,
}: DistractionOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl bg-[#141418] border border-white/10 p-6 sm:p-7 shadow-2xl text-center space-y-6">
        {/* Calm Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10 text-rose-400">
          <ShieldAlert className="h-7 w-7" />
        </div>

        {/* Title & Message */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
            Pause for a moment
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xs mx-auto">
            {message || "You navigated away from your session. The distraction shield paused your window so you can stay in flow."}
          </p>
        </div>

        {/* Focus stat card */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs">
          <span className="text-zinc-400">Interventions this session</span>
          <span className="font-semibold text-white">
            {tabSwitchCount} {tabSwitchCount === 1 ? 'time' : 'times'}
          </span>
        </div>

        {/* Choices */}
        <div className="space-y-2 pt-1">
          <button
            onClick={onReturnToRoom}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-white text-zinc-950 px-4 py-3 text-sm font-semibold hover:bg-zinc-100 transition-colors shadow-sm"
          >
            <span>Resume focus</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            onClick={onLeaveSession}
            className="w-full flex items-center justify-center gap-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 py-2.5 transition-colors"
          >
            <span>Leave session early</span>
          </button>
        </div>
      </div>
    </div>
  );
}

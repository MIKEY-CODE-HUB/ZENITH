'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, ArrowRight, Radio } from 'lucide-react';

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
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(3);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onReturnToRoom();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onReturnToRoom]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150 select-none">
      <div className="relative w-full max-w-md rounded-3xl bg-[#12141e] border border-rose-500/30 p-6 sm:p-8 shadow-2xl text-center space-y-6 overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-400" />

        {/* Pulsing Icon */}
        <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shadow-inner">
          <ShieldAlert className="h-8 w-8 animate-pulse" />
        </div>

        {/* Title & Message */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-[11px] font-bold tracking-wider uppercase border border-rose-500/30">
            <span>🛡️ Focus Protected</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Tab Switch Intercepted
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-xs mx-auto">
            {message || "You switched away from your active focus room. Zenith is pulling you back."}
          </p>
        </div>

        {/* Snap-Back Countdown Banner */}
        <div className="p-3.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 text-xs font-semibold flex items-center justify-center gap-2 shadow-inner">
          <Radio className="h-4 w-4 text-indigo-400 animate-ping" />
          <span>Snapping you back to session in <strong className="text-white font-mono text-sm">{countdown}s</strong>...</span>
        </div>

        {/* Focus stat card */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between text-xs text-zinc-400 font-mono">
          <span>Interventions This Session</span>
          <span className="font-bold text-white text-sm">
            {tabSwitchCount} {tabSwitchCount === 1 ? 'time' : 'times'}
          </span>
        </div>

        {/* Choices */}
        <div className="space-y-2 pt-1">
          <button
            onClick={onReturnToRoom}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-white text-zinc-950 px-4 py-3 text-xs sm:text-sm font-bold hover:bg-zinc-200 transition-all shadow-lg active:scale-95"
          >
            <span>Resume Focus Now</span>
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

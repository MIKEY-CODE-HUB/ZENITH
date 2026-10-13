'use client';

import React from 'react';
import { VideoLayoutMode } from './AdaptiveVideoGallery';
import { LayoutGrid, LogOut, ShieldCheck, Users } from 'lucide-react';

interface RoomHeaderProps {
  roomName: string;
  category: string;
  participantCount: number;
  maxParticipants: number;
  videoLayout: VideoLayoutMode;
  onChangeVideoLayout: (layout: VideoLayoutMode) => void;
  onExit: () => void;
}

export function RoomHeader({
  roomName,
  category,
  participantCount,
  maxParticipants,
  videoLayout,
  onChangeVideoLayout,
  onExit,
}: RoomHeaderProps) {
  return (
    <header className="absolute top-3 inset-x-4 z-30 flex items-center justify-between pointer-events-none">
      {/* Left: Zenith Brand & Room Indicator */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 shadow-lg text-white">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-extrabold tracking-wider text-xs bg-gradient-to-r from-sky-400 via-indigo-300 to-white bg-clip-text text-transparent">
            ZENITH
          </span>
          <span className="text-zinc-600 font-mono">/</span>
          <span className="text-xs font-semibold text-zinc-200">{roomName}</span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-mono tracking-wider bg-white/10 text-zinc-300">
            {category}
          </span>
        </div>
      </div>

      {/* Center: Live Count & Shield Status */}
      <div className="hidden md:flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 text-xs font-mono text-zinc-300 shadow-md">
          <Users className="h-3.5 w-3.5 text-sky-400" />
          <span className="text-white font-semibold">
            {participantCount}/{maxParticipants}
          </span>
          <span className="text-zinc-600">•</span>
          <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Shield Active</span>
          </span>
        </div>
      </div>

      {/* Right: Video Layout Selector & Exit */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Video Layout Mode Toggle */}
        <div className="flex items-center p-0.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 text-xs text-zinc-400 shadow-lg">
          {(['footer', 'header', 'middle', 'scattered'] as VideoLayoutMode[]).map((mode) => {
            const isActive = videoLayout === mode;
            return (
              <button
                key={mode}
                onClick={() => onChangeVideoLayout(mode)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all capitalize ${
                  isActive
                    ? 'bg-sky-500/25 text-sky-300 border border-sky-400/30 shadow-sm font-semibold'
                    : 'hover:text-zinc-200 text-zinc-400'
                }`}
                title={`Switch video layout to ${mode}`}
              >
                {mode === 'footer' ? 'Footer' : mode}
              </button>
            );
          })}
        </div>

        {/* Quick Exit */}
        <button
          onClick={onExit}
          className="p-1.5 rounded-full bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 transition-all shadow-md"
          title="Exit Room"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}

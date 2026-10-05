'use client';

import React from 'react';
import { ParticipantPresence } from '@/lib/types';
import { Camera, CameraOff, Flame } from 'lucide-react';

interface ParticipantCardProps {
  participant: ParticipantPresence;
  isSelf?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

export function ParticipantCard({ participant, isSelf = false, videoRef }: ParticipantCardProps) {
  const getStatusBadge = () => {
    switch (participant.focusStatus) {
      case 'FOCUSED':
        return (
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Focusing</span>
          </span>
        );
      case 'IDLE':
        return (
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-400 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-amber-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>Away</span>
          </span>
        );
      case 'DISTRACTED':
        return (
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-rose-400 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-rose-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            <span>Paused</span>
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-medium text-zinc-400 bg-black/60 px-2 py-0.5 rounded-full">
            Ready
          </span>
        );
    }
  };

  return (
    <div
      className="relative aspect-video rounded-xl bg-[#121215] border border-white/[0.08] overflow-hidden flex flex-col justify-between p-3 transition-colors group"
    >
      {/* Background: Video stream OR Avatar */}
      {isSelf && participant.cameraOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover -scale-x-100 bg-[#09090b]"
        />
      ) : participant.cameraOn && !participant.isSimulated ? (
        <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
          <img
            src={participant.avatarUrl}
            alt={participant.name}
            className="h-14 w-14 rounded-xl object-cover border border-white/10"
          />
        </div>
      ) : (
        <div className="absolute inset-0 bg-[#0c0c0f] flex flex-col items-center justify-center p-4">
          <div className="h-14 w-14 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center text-sm font-semibold text-zinc-300 mb-2">
            {participant.name?.slice(0, 2).toUpperCase() || 'P'}
          </div>
        </div>
      )}

      {/* Top Bar Overlay */}
      <div className="relative z-10 flex items-center justify-between">
        {getStatusBadge()}

        {participant.focusStreakMinutes > 0 && participant.focusStatus === 'FOCUSED' && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-amber-300 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-amber-500/20">
            <Flame className="h-3 w-3 fill-current" />
            <span>{participant.focusStreakMinutes}m</span>
          </span>
        )}
      </div>

      {/* Bottom Bar Overlay */}
      <div className="relative z-10 flex items-center justify-between bg-black/60 backdrop-blur-md rounded-lg px-2.5 py-1.5 border border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-xs font-medium text-white truncate">
            {participant.name} {isSelf && <span className="text-zinc-400 font-normal">(You)</span>}
          </p>
          <span className="text-[10px] text-zinc-400 bg-white/[0.05] px-1.5 py-0.5 rounded">
            {participant.activityType}
          </span>
        </div>

        <div className="flex items-center gap-1 text-zinc-400">
          {participant.cameraOn ? (
            <Camera className="h-3 w-3 text-emerald-400" />
          ) : (
            <CameraOff className="h-3 w-3 text-zinc-500" />
          )}
        </div>
      </div>
    </div>
  );
}

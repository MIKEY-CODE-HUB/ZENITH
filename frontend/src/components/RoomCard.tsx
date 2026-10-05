'use client';

import React from 'react';
import { Room } from '@/lib/types';
import { Users, Clock, Flame, ArrowRight } from 'lucide-react';

interface RoomCardProps {
  room: Room;
  onJoin: (room: Room) => void;
}

export function RoomCard({ room, onJoin }: RoomCardProps) {
  return (
    <div className="rounded-xl bg-[#121215] border border-white/[0.08] p-5 hover:border-white/20 transition-all flex flex-col justify-between space-y-4 group">
      <div className="space-y-3">
        {/* Activity pill & Room code */}
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-white/10 bg-white/[0.03] text-zinc-300">
            {room.activityType}
          </span>
          <span className="text-[11px] font-mono text-zinc-500 bg-white/[0.02] px-2 py-0.5 rounded border border-white/5">
            {room.roomCode}
          </span>
        </div>

        {/* Room Title & Description */}
        <div>
          <h3 className="text-sm font-semibold text-white group-hover:text-zinc-200 transition-colors line-clamp-1">
            {room.name}
          </h3>
          <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
            {room.description || 'Silent collaborative focus room. Lock in together.'}
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="space-y-3 pt-3 border-t border-white/[0.06]">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-zinc-500" />
            <span>{Math.max(1, room.activeParticipantsCount)}/{room.maxParticipants} peers</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-zinc-500" />
            <span>{room.defaultDuration}m block</span>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span>{room.averageFocusScore || 85}%</span>
          </div>
        </div>

        {/* Join Room CTA */}
        <button
          onClick={() => onJoin(room)}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-white/[0.04] hover:bg-white text-zinc-300 hover:text-zinc-950 py-2 text-xs font-semibold border border-white/10 hover:border-transparent transition-all"
        >
          <span>Enter Room</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

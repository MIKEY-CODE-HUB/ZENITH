'use client';

import React from 'react';
import { ParticipantPresence } from '@/lib/types';
import { ParticipantCard } from './ParticipantCard';

interface VideoGridProps {
  participants: ParticipantPresence[];
  selfUserId: string;
  selfVideoRef?: React.RefObject<HTMLVideoElement>;
}

export function VideoGrid({ participants, selfUserId, selfVideoRef }: VideoGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
      {participants.map((participant) => (
        <ParticipantCard
          key={participant.socketId || participant.userId}
          participant={participant}
          isSelf={participant.userId === selfUserId}
          videoRef={participant.userId === selfUserId ? selfVideoRef : undefined}
        />
      ))}
    </div>
  );
}

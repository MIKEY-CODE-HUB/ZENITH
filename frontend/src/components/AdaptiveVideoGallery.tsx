'use client';

import React, { useState } from 'react';
import { ParticipantPresence } from '@/lib/types';
import { CameraOff, Mic, MicOff, Maximize2, Minimize2, User as UserIcon, Flag } from 'lucide-react';

export type VideoLayoutMode = 'footer' | 'header' | 'middle' | 'scattered';

interface AdaptiveVideoGalleryProps {
  layoutMode: VideoLayoutMode;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  isCameraOn: boolean;
  isMicOn: boolean;
  isLocalSpeaking: boolean;
  user: any;
  participants: ParticipantPresence[];
  remoteStreams: Map<string, MediaStream>;
  isInteractionRoom?: boolean;
  onReportPeer?: (peer: ParticipantPresence) => void;
}

// Scattered positions (10 non-overlapping ambient floating coordinates)
const SCATTERED_COORDINATES = [
  { top: '16%', left: '8%' },
  { top: '16%', right: '8%' },
  { top: '34%', left: '4%' },
  { top: '34%', right: '4%' },
  { top: '52%', left: '10%' },
  { top: '52%', right: '10%' },
  { top: '70%', left: '6%' },
  { top: '70%', right: '6%' },
  { top: '24%', left: '22%' },
  { top: '24%', right: '22%' },
];

export function AdaptiveVideoGallery({
  layoutMode,
  localVideoRef,
  isCameraOn,
  isMicOn,
  isLocalSpeaking,
  user,
  participants,
  remoteStreams,
  isInteractionRoom = false,
  onReportPeer,
}: AdaptiveVideoGalleryProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Combine local user and remote peers up to 10
  const remotePeers = participants.filter((p) => p.userId !== user?.id);

  // Base tile dimensions depending on expansion and layout
  const tileClasses = isExpanded
    ? 'w-44 h-28 sm:w-52 sm:h-32'
    : layoutMode === 'footer' || layoutMode === 'header'
    ? 'w-28 h-18 sm:w-32 sm:h-20'
    : 'w-32 h-20 sm:w-36 sm:h-24';

  const renderLocalTile = () => (
    <div
      key="local-user-tile"
      className={`relative rounded-xl overflow-hidden backdrop-blur-md border transition-all duration-300 shadow-xl group shrink-0 ${tileClasses} ${
        isLocalSpeaking
          ? 'border-sky-400 ring-2 ring-sky-400/50 shadow-sky-500/20'
          : 'border-white/15 bg-black/45'
      }`}
    >
      {isCameraOn ? (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform -scale-x-100"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black/60 text-zinc-400 p-2">
          <img
            src={user?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username || 'you'}`}
            alt="avatar"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-white/20 mb-1"
          />
          <div className="flex items-center gap-1 text-[10px] text-zinc-400">
            <CameraOff className="h-3 w-3" />
            <span className="hidden sm:inline">Camera Off</span>
          </div>
        </div>
      )}

      {/* Tile Glass Badge */}
      <div className="absolute bottom-1 inset-x-1 flex items-center justify-between text-[10px] px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm border border-white/10">
        <span className="font-semibold text-white truncate max-w-[80px]">
          {user?.name?.split(' ')[0] || 'You'} (You)
        </span>
        {isInteractionRoom && (
          <div className="flex items-center gap-1">
            {isLocalSpeaking && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />}
            {isMicOn ? <Mic className="h-2.5 w-2.5 text-emerald-400" /> : <MicOff className="h-2.5 w-2.5 text-zinc-500" />}
          </div>
        )}
      </div>
    </div>
  );

  const renderRemoteTile = (peer: ParticipantPresence, index: number) => {
    const remoteStream = remoteStreams.get(peer.socketId);
    const peerHasVideo = peer.cameraOn && Boolean(remoteStream);

    return (
      <div
        key={peer.socketId || `peer-${index}`}
        className={`relative rounded-xl overflow-hidden backdrop-blur-md border transition-all duration-300 shadow-xl group shrink-0 ${tileClasses} ${
          peer.speaking
            ? 'border-emerald-400 ring-2 ring-emerald-400/50 shadow-emerald-500/20'
            : 'border-white/15 bg-black/45'
        }`}
      >
        {peerHasVideo ? (
          <video
            autoPlay
            playsInline
            ref={(el) => {
              if (el && remoteStream && el.srcObject !== remoteStream) {
                el.srcObject = remoteStream;
              }
            }}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-black/60 text-zinc-400 p-2">
            <img
              src={peer.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${peer.username || `peer-${index}`}`}
              alt={peer.name}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-white/20 mb-1"
            />
            <div className="flex items-center gap-1 text-[10px] text-zinc-400">
              <CameraOff className="h-3 w-3" />
              <span className="hidden sm:inline">Camera Off</span>
            </div>
          </div>
        )}

        {/* Remote Tile Badge */}
        <div className="absolute bottom-1 inset-x-1 flex items-center justify-between text-[10px] px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm border border-white/10">
          <span className="font-semibold text-white truncate max-w-[80px]">
            {peer.name?.split(' ')[0] || peer.username}
          </span>
          {isInteractionRoom && (
            <div className="flex items-center gap-1">
              {peer.speaking && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />}
              {peer.micOn ? <Mic className="h-2.5 w-2.5 text-emerald-400" /> : <MicOff className="h-2.5 w-2.5 text-zinc-500" />}
            </div>
          )}
        </div>

        {/* Report Flag Trigger */}
        {onReportPeer && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReportPeer(peer);
            }}
            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-black/80 hover:bg-rose-500 text-zinc-400 hover:text-white border border-white/10 shadow"
            title={`Report ${peer.name || peer.username} for community violation`}
          >
            <Flag className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
    );
  };

  // Expand / Collapse gallery control
  const expandToggleButton = (
    <button
      onClick={() => setIsExpanded(!isExpanded)}
      className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-zinc-300 hover:text-white border border-white/15 transition-all shadow-md self-center"
      title={isExpanded ? 'Collapse Gallery' : 'Expand Gallery'}
    >
      {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
    </button>
  );

  // ── 1. FOOTER LAYOUT (DEFAULT) ──────────────────────────────────────────
  if (layoutMode === 'footer') {
    return (
      <div className="absolute bottom-20 inset-x-0 z-20 flex justify-center px-4 pointer-events-none transition-all duration-500">
        <div className="flex items-center gap-2 max-w-full overflow-x-auto no-scrollbar py-2 px-3 rounded-2xl bg-black/35 backdrop-blur-md border border-white/10 shadow-2xl pointer-events-auto">
          {renderLocalTile()}
          {remotePeers.map(renderRemoteTile)}
          {expandToggleButton}
        </div>
      </div>
    );
  }

  // ── 2. HEADER LAYOUT ────────────────────────────────────────────────────
  if (layoutMode === 'header') {
    return (
      <div className="absolute top-16 inset-x-0 z-20 flex justify-center px-4 pointer-events-none transition-all duration-500">
        <div className="flex items-center gap-2 max-w-full overflow-x-auto no-scrollbar py-2 px-3 rounded-2xl bg-black/35 backdrop-blur-md border border-white/10 shadow-2xl pointer-events-auto">
          {renderLocalTile()}
          {remotePeers.map(renderRemoteTile)}
          {expandToggleButton}
        </div>
      </div>
    );
  }

  // ── 3. MIDDLE LAYOUT ────────────────────────────────────────────────────
  if (layoutMode === 'middle') {
    return (
      <div className="absolute inset-x-6 top-32 bottom-28 z-20 flex items-center justify-center pointer-events-none transition-all duration-500">
        <div className="flex flex-wrap items-center justify-center gap-3.5 max-w-4xl p-4 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/15 shadow-2xl pointer-events-auto">
          {renderLocalTile()}
          {remotePeers.map(renderRemoteTile)}
          {expandToggleButton}
        </div>
      </div>
    );
  }

  // ── 4. SCATTERED LAYOUT ─────────────────────────────────────────────────
  if (layoutMode === 'scattered') {
    const allTiles = [
      { render: renderLocalTile, key: 'local' },
      ...remotePeers.map((peer, idx) => ({ render: () => renderRemoteTile(peer, idx), key: peer.socketId })),
    ];

    return (
      <div className="absolute inset-0 z-15 pointer-events-none transition-all duration-500">
        {allTiles.slice(0, 10).map((item, idx) => {
          const pos = SCATTERED_COORDINATES[idx % SCATTERED_COORDINATES.length];
          return (
            <div
              key={item.key}
              className="absolute pointer-events-auto transition-all duration-700 ease-out"
              style={{
                top: pos.top,
                left: pos.left,
                right: pos.right,
              }}
            >
              {item.render()}
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}

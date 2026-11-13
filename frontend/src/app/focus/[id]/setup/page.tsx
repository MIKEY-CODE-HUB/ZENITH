'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { RoomInviteControls } from '@/components/RoomInviteControls';
import { api, ApiError } from '@/lib/api';
import { useCameraStream } from '@/hooks/useCameraStream';
import {
  Camera,
  CameraOff,
  ShieldAlert,
  Radio,
  ArrowRight,
  Lock,
} from 'lucide-react';

export default function PreSessionSetupPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const roomIdOrCode = params.id as string;

  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(50);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { videoRef, isCameraOn, pending: cameraPending, error: cameraError, toggleCamera } = useCameraStream();

  useEffect(() => {
    async function loadRoom() {
      try {
        setLoading(true);
        const res = await api.getRoom(roomIdOrCode);
        if (res.success && res.room) {
          setRoom(res.room);
          setDuration(res.room.defaultDuration || 50);
        }
      } catch (err: any) {
        setError(err.message || 'Room not found');
      } finally {
        setLoading(false);
      }
    }

    if (roomIdOrCode) {
      loadRoom();
    }
  }, [roomIdOrCode]);

  const handleStartSession = async () => {
    try {
      setStarting(true);
      if (!room) throw new Error('The room could not be loaded.');
      try {
        await api.joinRoom(room.id);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 402 || room.category !== 'INTERACTION') throw error;
        const { quote } = await api.getInteractionQuote();
        if (!quote.canAfford) throw new Error('You need weekly points to enter this room.');
        if (!window.confirm(`Join for approximately ${quote.cost} weekly points?`)) {
          setStarting(false);
          return;
        }
        await api.authorizeInteraction(room.id);
      }

      // 1. Start Focus Session
      const sessionRes = await api.startSession({
        roomId: room?.id || null,
        category: room?.category,
        activityType: room?.activityType || 'Coding',
        plannedDuration: duration,
      });

      if (sessionRes.success && sessionRes.session) {
        const sessionId = sessionRes.session.id;
        sessionStorage.setItem('active_session_id', sessionId);
        sessionStorage.setItem('active_session_duration', String(duration));


      }

      router.push(`/focus/${room?.id || roomIdOrCode}`);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize focus session');
      setStarting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-[#09090b] text-zinc-100">
      <div className="w-full max-w-lg rounded-2xl bg-[#121215] border border-white/[0.08] p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-1.5 border-b border-white/[0.06] pb-5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-xs font-medium">
            <Radio className="h-3 w-3 text-emerald-400" />
            <span>Ready Check</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            {room?.name || 'Silent Focus Room'}
          </h1>
          <p className="text-xs text-zinc-400">
            {room?.activityType || 'Coding'} • {duration}m target
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {room?.isPrivate && user && room.creator?.id === user.id && <RoomInviteControls roomId={room.id} />}

        {cameraError && <p role="status" className="text-sm text-amber-200">{cameraError}</p>}

        {/* Camera Preview */}
        <div className="space-y-3">
          <div className="relative aspect-video max-w-md mx-auto rounded-xl bg-black/60 border border-white/[0.08] overflow-hidden flex items-center justify-center">
            {isCameraOn ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-4">
                <CameraOff className="h-6 w-6 text-zinc-500 mb-1" />
                <p className="text-xs font-medium text-zinc-300">{cameraPending ? 'Waiting for camera access…' : 'Camera off'}</p>
              </div>
            )}

            <div className="absolute bottom-2.5 flex items-center gap-2 bg-[#09090b]/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
              <button
                onClick={toggleCamera}
                className={`p-1 rounded text-xs transition-colors ${
                  isCameraOn ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:text-white'
                }`}
                title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
              >
                {isCameraOn ? <Camera className="h-3.5 w-3.5" /> : <CameraOff className="h-3.5 w-3.5" />}
              </button>
              <span className="text-[11px] font-medium text-zinc-300">
                {isCameraOn ? 'Camera on' : 'Camera off'}
              </span>
            </div>
          </div>
        </div>

        {/* Duration Selector */}
        <div className="space-y-2 max-w-md mx-auto">
          <label className="text-xs font-medium text-zinc-400 block text-center">Session Length</label>
          <div className="grid grid-cols-3 gap-2">
            {[25, 50, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`py-2 rounded-lg text-xs font-medium transition-all ${
                  duration === d
                    ? 'bg-white text-zinc-950 shadow-sm'
                    : 'bg-white/[0.03] text-zinc-400 hover:text-zinc-200 border border-white/[0.06]'
                }`}
              >
                {d} minutes
              </button>
            ))}
          </div>
        </div>

        {/* Shield Enforcement Notice */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-3">
          <Lock className="h-4 w-4 text-emerald-400 shrink-0" />
          <div className="text-left text-xs">
            <p className="font-medium text-zinc-200">Enforcement Ready</p>
            <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
              Distraction Shield will engage upon entry. Switching tabs will trigger an immediate snap-back.
            </p>
          </div>
        </div>

        {/* Start Focus Session Button */}
        <button
          onClick={handleStartSession}
          disabled={starting}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-xs font-semibold text-zinc-950 hover:bg-zinc-100 transition-colors shadow-sm disabled:opacity-50"
        >
          <span>{starting ? 'Entering room...' : 'Enter Focus Room'}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

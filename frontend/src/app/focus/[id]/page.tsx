'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useFocusTracker } from '@/hooks/useFocusTracker';
import { useWebRTC } from '@/hooks/useWebRTC';
import { api } from '@/lib/api';
import { ATMOSPHERES, getAtmosphereById, AtmosphereTheme } from '@/lib/atmospheres';
import { AtmosphereCanvas } from '@/components/AtmosphereCanvas';
import { SoundscapeMixerModal } from '@/components/SoundscapeMixerModal';
import { MusicPlayerModal } from '@/components/MusicPlayerModal';
import { AtmosphereSelectorModal } from '@/components/AtmosphereSelectorModal';
import { DistractionOverlay } from '@/components/DistractionOverlay';
import { ParticipantPresence, FocusStatus, Room, ActivityCategory } from '@/lib/types';
import { formatSeconds, formatMinutesHuman } from '@/lib/utils';
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Palette,
  Music,
  Sliders,
  Shield,
  Users,
  LogOut,
  ChevronUp,
  ChevronDown,
  Star,
  CheckCircle,
  AlertTriangle,
  Flame,
  Clock,
  Sparkles,
  Volume2,
} from 'lucide-react';

export default function LiveRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { socket } = useSocket();
  const roomIdOrCode = params.id as string;

  // Room & Session state
  const [room, setRoom] = useState<Room | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [category, setCategory] = useState<ActivityCategory>('EDUCATION');
  const [activityName, setActivityName] = useState<string>('Deep Focus');
  const [plannedMinutes, setPlannedMinutes] = useState<number>(50);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(50 * 60);
  const [participants, setParticipants] = useState<ParticipantPresence[]>([]);
  const [ending, setEnding] = useState<boolean>(false);

  // Atmosphere State
  const [currentAtmosphere, setCurrentAtmosphere] = useState<AtmosphereTheme>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('active_session_atmosphere');
      if (stored) return getAtmosphereById(stored);
    }
    return ATMOSPHERES[0];
  });

  // UI Modals & Panels
  const [isAtmosphereModalOpen, setIsAtmosphereModalOpen] = useState(false);
  const [isMusicModalOpen, setIsMusicModalOpen] = useState(false);
  const [isSoundscapeModalOpen, setIsSoundscapeModalOpen] = useState(false);
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
  const [isTapeExpanded, setIsTapeExpanded] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Auto-hide controls state
  const [controlsVisible, setControlsVisible] = useState(true);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isInteractionRoom = category === 'INTERACTION';

  // WebRTC Audio/Video Hook
  const {
    localStream,
    remoteStreams,
    localVideoRef,
    isCameraOn,
    isMicOn,
    isSpeaking: isLocalSpeaking,
    toggleCamera,
    toggleMic,
  } = useWebRTC({
    socket,
    roomId: roomIdOrCode,
    userId: user?.id || 'guest',
    enableCameraDefault: true,
    enableMicDefault: false,
    allowVoice: isInteractionRoom,
  });

  // Reset auto-hide idle timer on cursor movement
  const resetIdleTimer = useCallback(() => {
    setControlsVisible(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
      setIsTapeExpanded(false);
    }, 4500);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('touchstart', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    resetIdleTimer();

    return () => {
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('touchstart', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  // Load Room metadata
  useEffect(() => {
    async function loadRoom() {
      try {
        const res = await api.getRoom(roomIdOrCode);
        if (res.success && res.room) {
          setRoom(res.room);
          setCategory(res.room.category || 'EDUCATION');
          setActivityName(res.room.activityType || 'Deep Focus');
          if (res.room.atmosphere) {
            setCurrentAtmosphere(getAtmosphereById(res.room.atmosphere));
          }
        }
      } catch (err) {
        console.error('Room fetch error:', err);
      }
    }
    loadRoom();
  }, [roomIdOrCode]);

  // Session Initialization
  useEffect(() => {
    async function initSession() {
      const storedDuration = sessionStorage.getItem('active_session_duration');
      const storedCategory = sessionStorage.getItem('active_session_category') as ActivityCategory;
      const storedActivity = sessionStorage.getItem('active_session_activity');

      if (storedDuration) {
        const mins = parseInt(storedDuration, 10);
        setPlannedMinutes(mins);
        setRemainingSeconds(mins * 60);
      }
      if (storedCategory) setCategory(storedCategory);
      if (storedActivity) setActivityName(storedActivity);

      let storedSessionId = sessionStorage.getItem('active_session_id');
      if (!storedSessionId) {
        try {
          const res = await api.startSession({
            roomId: roomIdOrCode !== 'custom' ? roomIdOrCode : null,
            category: storedCategory || category,
            activityType: storedActivity || activityName,
            specificActivity: storedActivity || activityName,
            atmosphere: currentAtmosphere.id,
            plannedDuration: plannedMinutes,
          });
          if (res.success && res.session) {
            sessionStorage.setItem('active_session_id', res.session.id);
            setSessionId(res.session.id);
            api.activateBlocker(res.session.id, 'STRICT').catch(() => {});
          }
        } catch (err) {
          console.error('Session start error:', err);
        }
      } else {
        setSessionId(storedSessionId);
        api.activateBlocker(storedSessionId, 'STRICT').catch(() => {});
      }

      if (typeof window !== 'undefined') {
        window.postMessage({ type: 'ZENITH_ROOM_ACTIVE', roomUrl: window.location.href }, '*');
        localStorage.setItem('zenith_shield_active', 'true');
        localStorage.setItem('zenith_shield_url', window.location.href);
      }
    }

    initSession();
  }, [roomIdOrCode]);

  // Focus Tracker Hook (Page Visibility API + Idle Detection)
  const {
    focusStatus,
    focusedSeconds,
    distractedSeconds,
    idleSeconds,
    tabSwitchCount,
    warningCount,
    currentFocusStreak,
    longestFocusStreak,
    isFrozen,
    lastDistractionDuration,
    warningMessage,
    returnToRoom,
  } = useFocusTracker({
    sessionId: sessionId || undefined,
    idleThresholdSeconds: 60,
    isActiveSession: !ending,
    onStatusChange: (newStatus: FocusStatus) => {
      if (socket && room) {
        socket.emit('focus_status_changed', {
          roomId: room.id,
          userId: user?.id || 'guest',
          focusStatus: newStatus,
          focusStreakMinutes: Math.floor(currentFocusStreak / 60),
        });
      }
    },
  });

  // Socket.IO Room Presence
  useEffect(() => {
    if (!socket || !room || !user) return;

    socket.emit('join_room', {
      roomId: room.id,
      userId: user.id,
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
      activityType: activityName,
      category,
      cameraOn: isCameraOn,
      micOn: isMicOn,
      withSimulatedPeers: false,
    });

    socket.on('room_presence_list', (data: { participants: ParticipantPresence[] }) => {
      setParticipants(data.participants);
    });

    socket.on('participant_status_updated', (data: { socketId: string; userId: string; focusStatus: FocusStatus; focusStreakMinutes: number }) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.userId === data.userId || p.socketId === data.socketId
            ? { ...p, focusStatus: data.focusStatus, focusStreakMinutes: data.focusStreakMinutes }
            : p
        )
      );
    });

    socket.on('participant_speaking', (data: { socketId: string; userId: string; isSpeaking: boolean }) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.userId === data.userId || p.socketId === data.socketId
            ? { ...p, speaking: data.isSpeaking }
            : p
        )
      );
    });

    return () => {
      socket.emit('leave_room', { roomId: room.id });
      socket.off('room_presence_list');
      socket.off('participant_status_updated');
      socket.off('participant_speaking');
    };
  }, [socket, room, user, isCameraOn, isMicOn, activityName, category]);

  // Synchronized countdown timer
  const startTimeRef = useRef<number>(Date.now());
  useEffect(() => {
    if (ending) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, plannedMinutes * 60 - elapsed);
      setRemainingSeconds(remaining);

      if (remaining === 0) {
        handleEndSession();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [plannedMinutes, ending]);

  // End Session and Save Truth Records
  const handleEndSession = async () => {
    try {
      setEnding(true);

      if (typeof window !== 'undefined') {
        window.postMessage({ type: 'ZENITH_ROOM_ENDED' }, '*');
        localStorage.removeItem('zenith_shield_active');
        localStorage.removeItem('zenith_shield_url');
      }

      if (sessionId) {
        const res = await api.endSession(sessionId, {
          focusedDuration: focusedSeconds,
          distractedDuration: distractedSeconds,
          idleDuration: idleSeconds,
          tabSwitchCount,
          warningCount,
          longestFocusStreak,
        });

        sessionStorage.removeItem('active_session_id');
        router.push(`/focus/summary/${sessionId}`);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('End session error:', err);
      router.push('/dashboard');
    }
  };

  // Focus score calculation
  const totalTrackedSeconds = focusedSeconds + distractedSeconds + idleSeconds;
  const currentFocusRate = totalTrackedSeconds > 0 ? Math.round((focusedSeconds / totalTrackedSeconds) * 100) : 100;
  const estimatedPoints = Math.max(5, Math.round((focusedSeconds / 60) * 1.0) + (currentFocusRate >= 90 ? 15 : 5));

  // Progress Bar Percentage
  const sessionProgressPercent = Math.min(100, Math.round(((plannedMinutes * 60 - remainingSeconds) / (plannedMinutes * 60)) * 100));

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black text-zinc-100 select-none">
      {/* ── 80-90% ATMOSPHERE & VISUAL ENVIRONMENT (THE HERO) ── */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out"
        style={{
          backgroundImage: `url(${currentAtmosphere.bgImageUrl})`,
        }}
      />
      <div
        className="absolute inset-0 transition-all duration-1000 ease-in-out"
        style={{ background: currentAtmosphere.gradientOverlay }}
      />

      {/* Procedural Canvas Dynamics (Raindrops, Stars, Cyber Grid, Particles) */}
      <AtmosphereCanvas
        effectType={currentAtmosphere.effectType}
        accentColor={currentAtmosphere.accentColor}
      />

      {/* ── SUBTLE NON-DOMINANT TIMER & ROOM NAME (TOP CENTER) ── */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/90 text-xs font-mono mb-1.5 shadow-lg">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold tracking-wider">{room?.name || 'ZENITH'}</span>
          <span>•</span>
          <span className="text-zinc-400">{activityName}</span>
        </div>
        <div className="text-4xl sm:text-5xl font-extralight tracking-widest text-white/95 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] font-mono">
          {formatSeconds(remainingSeconds)}
        </div>
      </div>

      {/* ── TRANSLUCENT PARTICIPANT VIDEO & PRESENCE GRID ── */}
      <div className="absolute inset-x-6 top-28 bottom-24 z-10 flex items-center justify-center pointer-events-none">
        <div className="flex flex-wrap items-center justify-center gap-5 max-w-5xl pointer-events-auto">
          {/* User's Own Camera Container */}
          <div
            className={`relative rounded-2xl overflow-hidden backdrop-blur-md border transition-all duration-300 shadow-2xl ${
              isLocalSpeaking
                ? 'border-sky-400 ring-2 ring-sky-400/50 shadow-sky-500/20'
                : 'border-white/15 bg-black/30'
            }`}
            style={{ width: '240px', height: '145px' }}
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
              <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 text-zinc-400 space-y-1">
                <img
                  src={user?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username || 'user'}`}
                  alt="avatar"
                  className="h-12 w-12 rounded-full border border-white/20"
                />
                <span className="text-[11px] font-medium text-zinc-300">Camera Off</span>
              </div>
            )}

            {/* Glass Label Overlay */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10">
              <span className="font-semibold text-white truncate max-w-[120px]">
                {user?.name?.split(' ')[0] || 'You'} (You)
              </span>
              {isInteractionRoom && (
                <div className="flex items-center gap-1.5">
                  {isLocalSpeaking && (
                    <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  )}
                  {isMicOn ? (
                    <Mic className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <MicOff className="h-3 w-3 text-zinc-500" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Remote Peer Containers */}
          {participants
            .filter((p) => p.userId !== user?.id)
            .map((peer) => {
              const remoteStream = remoteStreams.get(peer.socketId);
              return (
                <div
                  key={peer.socketId}
                  className={`relative rounded-2xl overflow-hidden backdrop-blur-md border transition-all duration-300 shadow-2xl ${
                    peer.speaking
                      ? 'border-emerald-400 ring-2 ring-emerald-400/50 shadow-emerald-500/20'
                      : 'border-white/15 bg-black/30'
                  }`}
                  style={{ width: '240px', height: '145px' }}
                >
                  {remoteStream && peer.cameraOn ? (
                    <video
                      autoPlay
                      playsInline
                      ref={(el) => {
                        if (el && el.srcObject !== remoteStream) {
                          el.srcObject = remoteStream;
                        }
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 text-zinc-400 space-y-1">
                      <img
                        src={peer.avatarUrl}
                        alt={peer.name}
                        className="h-12 w-12 rounded-full border border-white/20"
                      />
                      <span className="text-[11px] font-medium text-zinc-300">{peer.name}</span>
                    </div>
                  )}

                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10">
                    <span className="font-semibold text-white truncate max-w-[120px]">
                      {peer.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {peer.speaking && (
                        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                      )}
                      <span className="text-[9px] font-mono text-zinc-400">{peer.activityType}</span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* ── EXPANDED SESSION PROGRESS PANEL ── */}
      {isTapeExpanded && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 w-full max-w-md p-5 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/15 shadow-2xl text-xs space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="font-semibold text-white tracking-tight">Active Session Truth Progress</h3>
            <button
              onClick={() => setIsTapeExpanded(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono">
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/5">
              <span className="text-[10px] text-zinc-400 uppercase">Focused Time</span>
              <div className="text-base font-bold text-emerald-400 mt-0.5">
                {formatMinutesHuman(Math.round(focusedSeconds / 60))}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/5">
              <span className="text-[10px] text-zinc-400 uppercase">Away / Distracted</span>
              <div className="text-base font-bold text-rose-400 mt-0.5">
                {formatMinutesHuman(Math.round(distractedSeconds / 60))}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/5">
              <span className="text-[10px] text-zinc-400 uppercase">Focus Score</span>
              <div className="text-base font-bold text-sky-400 mt-0.5">{currentFocusRate}%</div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/5">
              <span className="text-[10px] text-zinc-400 uppercase">Points Gained</span>
              <div className="text-base font-bold text-amber-400 mt-0.5">+{estimatedPoints} ⭐</div>
            </div>
          </div>

          <p className="text-[10px] text-zinc-400 italic leading-relaxed">
            Zenith Focus Score is an estimate derived from active tab visibility and user interaction signals.
          </p>
        </div>
      )}

      {/* ── PERSISTENT BOTTOM PROGRESS TAPE ── */}
      <div className="absolute bottom-16 inset-x-0 z-20 flex justify-center px-4 pointer-events-none">
        <button
          onClick={() => setIsTapeExpanded(!isTapeExpanded)}
          className="pointer-events-auto flex items-center gap-4 px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-xs text-zinc-300 hover:text-white hover:border-white/30 transition-all shadow-xl font-mono"
        >
          <span className="flex items-center gap-1.5 font-sans font-semibold text-white">
            🎓 {activityName}
          </span>
          <span>•</span>
          <span className="text-emerald-400">{Math.round(focusedSeconds / 60)}m Focused</span>
          <span>•</span>
          <div className="w-24 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-sky-400 h-full rounded-full" style={{ width: `${sessionProgressPercent}%` }} />
          </div>
          <span>•</span>
          <span className="text-sky-300 font-semibold">{currentFocusRate}% Focus</span>
          <span>•</span>
          <span className="text-amber-400 font-semibold">+{estimatedPoints} ⭐</span>
          {isTapeExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* ── AUTO-HIDING TRANSLUCENT FLOATING CONTROL BAR (BOTTOM) ── */}
      <div
        className={`absolute bottom-4 inset-x-0 z-30 flex justify-center px-4 transition-opacity duration-500 ${
          controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/15 shadow-2xl">
          {/* Atmosphere Picker */}
          <button
            onClick={() => setIsAtmosphereModalOpen(true)}
            className="p-2.5 rounded-xl hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
            title="Atmosphere"
          >
            <Palette className="h-4 w-4" />
          </button>

          {/* Music System */}
          <button
            onClick={() => setIsMusicModalOpen(true)}
            className="p-2.5 rounded-xl hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
            title="Zenith Music & Spotify"
          >
            <Music className="h-4 w-4" />
          </button>

          {/* Soundscape Mixer */}
          <button
            onClick={() => setIsSoundscapeModalOpen(true)}
            className="p-2.5 rounded-xl hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
            title="Layered Soundscape Mixer"
          >
            <Sliders className="h-4 w-4" />
          </button>

          {/* Mic Toggle: strictly available in Interaction Rooms ONLY */}
          {isInteractionRoom && (
            <>
              <div className="h-5 w-px bg-white/15 mx-1" />
              <button
                onClick={toggleMic}
                className={`p-2.5 rounded-xl transition-colors ${
                  isMicOn
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'hover:bg-white/10 text-zinc-400 hover:text-white'
                }`}
                title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
              >
                {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </button>
            </>
          )}

          {/* Camera Toggle */}
          <button
            onClick={toggleCamera}
            className={`p-2.5 rounded-xl transition-colors ${
              isCameraOn
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                : 'hover:bg-white/10 text-zinc-400 hover:text-white'
            }`}
            title={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
          >
            {isCameraOn ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
          </button>

          <div className="h-5 w-px bg-white/15 mx-1" />

          {/* Focus Protection Indicator */}
          <button
            className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            title="Focus Protection Active (Strict Mode)"
          >
            <Shield className="h-4 w-4" />
          </button>

          {/* Leave / Complete Session */}
          <button
            onClick={() => setShowExitConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white border border-rose-500/30 transition-all font-semibold text-xs ml-1"
          >
            <LogOut className="h-4 w-4" />
            <span>End Session</span>
          </button>
        </div>
      </div>

      {/* ── DISTRACTION WARNING OVERLAY ── */}
      {isFrozen && (
        <DistractionOverlay
          isOpen={isFrozen}
          message={warningMessage}
          distractionSeconds={lastDistractionDuration}
          tabSwitchCount={tabSwitchCount}
          onReturnToRoom={returnToRoom}
          onLeaveSession={handleEndSession}
        />
      )}

      {/* ── CONFIRM EXIT MODAL ── */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0d0f14]/95 p-6 shadow-2xl text-zinc-100 space-y-4">
            <h3 className="text-base font-semibold text-white tracking-tight">Complete Session?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Your focus telemetry and truth stats will be saved to your profile and points will be awarded.
            </p>
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono space-y-1">
              <div>Focused Time: {formatMinutesHuman(Math.round(focusedSeconds / 60))}</div>
              <div>Estimated Points: +{estimatedPoints} ⭐</div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Continue Working
              </button>
              <button
                onClick={handleEndSession}
                className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-semibold hover:bg-rose-400 transition-colors shadow-md"
              >
                Confirm & Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      <AtmosphereSelectorModal
        isOpen={isAtmosphereModalOpen}
        onClose={() => setIsAtmosphereModalOpen(false)}
        selectedId={currentAtmosphere.id}
        onSelectAtmosphere={(atm) => {
          setCurrentAtmosphere(atm);
          sessionStorage.setItem('active_session_atmosphere', atm.id);
        }}
      />

      <SoundscapeMixerModal
        isOpen={isSoundscapeModalOpen}
        onClose={() => setIsSoundscapeModalOpen(false)}
      />

      <MusicPlayerModal
        isOpen={isMusicModalOpen}
        onClose={() => setIsMusicModalOpen(false)}
      />
    </div>
  );
}

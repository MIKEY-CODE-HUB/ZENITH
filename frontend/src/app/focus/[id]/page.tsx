'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useFocusTracker } from '@/hooks/useFocusTracker';
import { useWebRTC } from '@/hooks/useWebRTC';
import { api, ApiConnectionError, ApiError } from '@/lib/api';
import { ATMOSPHERES, getAtmosphereById, AtmosphereTheme } from '@/lib/atmospheres';
import { AtmosphereCanvas } from '@/components/AtmosphereCanvas';
import { RoomHeader } from '@/components/RoomHeader';
import { AdaptiveVideoGallery, VideoLayoutMode } from '@/components/AdaptiveVideoGallery';
import { FloatingControlDock } from '@/components/FloatingControlDock';
import { SoundscapeMixerModal } from '@/components/SoundscapeMixerModal';
import { MusicPlayerModal } from '@/components/MusicPlayerModal';
import { AtmosphereSelectorModal } from '@/components/AtmosphereSelectorModal';
import { DistractionOverlay } from '@/components/DistractionOverlay';
import {
  ReportParticipantModal,
  ModerationBallotBanner,
  KickedNoticeModal,
  ActiveBallotState,
} from '@/components/ModerationModal';
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
  GraduationCap,
  Sparkles,
  Volume2,
} from 'lucide-react';

export default function LiveRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { socket, connected } = useSocket();
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

  const [joinAttempt, setJoinAttempt] = useState(0);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [presenceError, setPresenceError] = useState<string | null>(null);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [shieldActive, setShieldActive] = useState(false);
  const [deadline, setDeadline] = useState<number | null>(null);
  const finishing = useRef(false);

  // Video Layout Mode ('footer' [DEFAULT], 'header', 'middle', 'scattered')
  const [videoLayout, setVideoLayout] = useState<VideoLayoutMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('zenith_video_layout');
      if (stored && ['footer', 'header', 'middle', 'scattered'].includes(stored)) {
        return stored as VideoLayoutMode;
      }
    }
    return 'footer'; // DEFAULT
  });

  const handleVideoLayoutChange = (newLayout: VideoLayoutMode) => {
    setVideoLayout(newLayout);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zenith_video_layout', newLayout);
    }
    api.updateSettings({ videoLayout: newLayout }).catch(() => {});
  };

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

  // Community Moderation State
  const [reportingPeer, setReportingPeer] = useState<ParticipantPresence | null>(null);
  const [activeBallot, setActiveBallot] = useState<ActiveBallotState | null>(null);
  const [kickedNotice, setKickedNotice] = useState<{ isOpen: boolean; reason: string }>({
    isOpen: false,
    reason: '',
  });
  const [moderationNotification, setModerationNotification] = useState<string | null>(null);

  // Auto-hide controls state
  const [controlsVisible, setControlsVisible] = useState(true);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isInteractionRoom = category === 'INTERACTION';

  const activeRoomId = room?.id || roomIdOrCode;

  // WebRTC Audio/Video Hook
  const {
    localStream,
    remoteStreams,
    isCameraOn,
    isMicOn,
    isSpeaking: isLocalSpeaking,
    deviceError,
    toggleCamera,
    toggleMic,
  } = useWebRTC({
    socket: sessionId ? socket : null,
    roomId: sessionId ? activeRoomId : '',
    userId: user?.id || 'guest',
    enableCameraDefault: Boolean(sessionId),
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

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    let cancelled = false;

    async function initialize() {
      let step = 'Restore your focus session';
      try {
        const storedId = sessionStorage.getItem('active_session_id');
        const stored = storedId ? (await api.getSession(storedId).catch((error) => {
          if (error instanceof ApiError && error.status === 404) return null;
          throw error;
        }))?.session : null;
        const solo = roomIdOrCode === 'custom' || (stored?.id === roomIdOrCode && !stored.roomId);
        step = 'Load the room';
        const currentRoom = solo ? null : (await api.getRoom(roomIdOrCode)).room as Room;
        if (cancelled) return;
        step = 'Join the room';
        if (currentRoom) await api.joinRoom(currentRoom.id);
        if (cancelled) return;
        const reusable = stored?.status === 'ACTIVE' && (stored.roomId ?? null) === (currentRoom?.id ?? null);
        step = 'Start the focus session';
        const session = reusable ? stored : (await api.startSession({
          roomId: currentRoom?.id ?? null,
          category: currentRoom?.category || 'EDUCATION',
          activityType: currentRoom?.activityType || 'Deep Focus',
          atmosphere: currentRoom?.atmosphere || currentAtmosphere.id,
          plannedDuration: currentRoom?.defaultDuration || 50,
        })).session;
        if (cancelled) return;
        sessionStorage.setItem('active_session_id', session.id);
        setRoom(currentRoom);
        setSessionId(session.id);
        setCategory(session.category);
        setActivityName(session.activityType);
        setPlannedMinutes(session.plannedDuration);
        const end = Date.parse(session.startTime) + session.plannedDuration * 60_000;
        setDeadline(end);
        setRemainingSeconds(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
        if (session.atmosphere) setCurrentAtmosphere(getAtmosphereById(session.atmosphere));

        if (session.protectionEnabled === false || (reusable && sessionStorage.getItem('active_session_protection') === 'false')) return;
        const blocker = await api.activateBlocker(session.id, 'STRICT').catch(() => null);
        if (blocker?.success && !cancelled) {
          window.postMessage({
            type: 'ZENITH_BLOCKER_ACTIVATE', roomUrl: window.location.href,
            focusSessionId: session.id, blockerToken: blocker.blockerToken,
            expiresAt: end + 60_000, config: blocker.config,
          }, window.location.origin);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/login');
          return;
        }
        setRoomError(err instanceof ApiConnectionError
          ? `${step} failed. ${err.message}`
          : err instanceof Error ? err.message : 'Could not start the room.');
      }
    }

    const shieldStatus = (event: MessageEvent) => {
      if (event.source === window && event.origin === window.location.origin &&
          event.data?.type === 'ZENITH_SHIELD_STATUS') setShieldActive(event.data.active === true);
    };
    window.addEventListener('message', shieldStatus);
    void initialize();
    return () => {
      cancelled = true;
      window.removeEventListener('message', shieldStatus);
    };
  }, [authLoading, user?.id, roomIdOrCode, router, joinAttempt]);

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
    shieldActive,
    idleThresholdSeconds: 60,
    isActiveSession: Boolean(sessionId) && !ending,
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
    if (!socket || !connected || !room || !user || !sessionId) return;

    setParticipants([]);
    const join = () => socket.emit('join_room', {
      roomId: activeRoomId,
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

    socket.on('room_presence_list', (data: { roomId: string; participants: ParticipantPresence[] }) => {
      if (data.roomId === activeRoomId) {
        setPresenceError(null);
        setParticipants(data.participants);
      }
    });

    socket.on('participant_media_updated', (data: { socketId: string; userId: string; cameraOn: boolean; micOn: boolean }) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.userId === data.userId || p.socketId === data.socketId
            ? { ...p, cameraOn: data.cameraOn, micOn: data.micOn }
            : p
        )
      );
    });

    socket.on('user_joined', (data: { participant: ParticipantPresence }) => {
      setParticipants((prev) => {
        const filtered = prev.filter((p) => p.socketId !== data.participant.socketId && p.userId !== data.participant.userId);
        return [...filtered, data.participant];
      });
    });

    socket.on('user_left', (data: { socketId: string; userId?: string }) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== data.socketId && (!data.userId || p.userId !== data.userId)));
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

    socket.on('moderation_incident_started', (data: ActiveBallotState) => {
      setActiveBallot(data);
    });

    socket.on('moderation_incident_resolved', (data: { incidentId: string; status: string; kickedUserId?: string; reason?: string }) => {
      setActiveBallot(null);
      if (data.status === 'CONFIRMED') {
        setModerationNotification(`Participant was removed from the room by community vote (${data.reason}).`);
      } else {
        setModerationNotification('Moderation ballot concluded without removal.');
      }
      setTimeout(() => setModerationNotification(null), 6000);
    });

    socket.on('participant_kicked', (data: { roomId: string; reason: string; message: string }) => {
      setKickedNotice({ isOpen: true, reason: data.reason });
    });

    socket.on('room_error', (data: { message: string }) => {
      setParticipants([]);
      setPresenceError(data.message);
    });
    join();

    return () => {
      socket.emit('leave_room', { roomId: activeRoomId });
      socket.off('room_presence_list');
      socket.off('participant_media_updated');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('participant_status_updated');
      socket.off('participant_speaking');
      socket.off('moderation_incident_started');
      socket.off('moderation_incident_resolved');
      socket.off('participant_kicked');
      socket.off('room_error');
    };
  }, [socket, connected, activeRoomId, user?.id, sessionId, room]);

  const handleEndSession = async () => {
    if (!sessionId || finishing.current) return;
    finishing.current = true;
    setEnding(true);
    setFinishError(null);
    try {
      await api.endSession(sessionId, {
        focusedDuration: focusedSeconds, distractedDuration: distractedSeconds, idleDuration: idleSeconds,
        tabSwitchCount, warningCount, longestFocusStreak,
      });
      if (room) await api.leaveRoom(room.id).catch(() => {});
      window.postMessage({ type: 'ZENITH_ROOM_ENDED', focusSessionId: sessionId }, window.location.origin);
      sessionStorage.removeItem('active_session_id');
      sessionStorage.removeItem('active_session_protection');
      router.push(`/focus/summary/${sessionId}`);
    } catch (err) {
      setFinishError(err instanceof Error ? err.message : 'Could not save your session. Try again.');
      finishing.current = false;
      setEnding(false);
    }
  };

  const finishRef = useRef(handleEndSession);
  finishRef.current = handleEndSession;
  useEffect(() => {
    if (deadline === null || ending || finishError) return;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining === 0) void finishRef.current();
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline, ending, finishError]);

  // Community Moderation Actions
  const handleFileReport = async (data: { accusedId: string; reason: string; details?: string }) => {
    if (socket && user) {
      socket.emit('report_participant', {
        roomId: activeRoomId,
        reporterId: user.id,
        accusedId: data.accusedId,
        reason: data.reason,
        details: data.details,
      });
      setModerationNotification('Report submitted. Corroboration ballot initiated across eligible peers.');
      setTimeout(() => setModerationNotification(null), 5000);
    }
  };

  const handleCastBallotVote = (decision: 'YES' | 'NO') => {
    if (socket && user && activeBallot) {
      socket.emit('cast_moderation_vote', {
        incidentId: activeBallot.incidentId,
        voterId: user.id,
        decision,
      });
    }
  };

  // Focus score calculation
  const totalTrackedSeconds = focusedSeconds + distractedSeconds + idleSeconds;
  const currentFocusRate = totalTrackedSeconds > 0 ? Math.round((focusedSeconds / totalTrackedSeconds) * 100) : 100;
  const estimatedPoints = focusedSeconds === 0 ? 0 : Math.max(5, Math.round((focusedSeconds / 60) * 1.0) + (currentFocusRate >= 90 ? 15 : 5));

  // Progress Bar Percentage
  const sessionProgressPercent = Math.min(100, Math.round(((plannedMinutes * 60 - remainingSeconds) / (plannedMinutes * 60)) * 100));

  if (!sessionId || roomError) {
    return (
      <main className="grid min-h-screen place-content-center gap-4 bg-zinc-950 p-6 text-zinc-100">
        {roomError ? <p role="alert">{roomError}</p> : <p role="status">Connecting to your focus session…</p>}
        {roomError && (
          <div className="flex justify-center gap-4">
            <button className="text-sky-300 underline" onClick={() => {
              setRoomError(null);
              setJoinAttempt(attempt => attempt + 1);
            }}>Retry room entry</button>
            <button className="text-sky-300 underline" onClick={() => router.push('/rooms')}>Back to rooms</button>
          </div>
        )}
      </main>
    );
  }

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

      {/* ── LAYER A: UNOBTRUSIVE ROOM HEADER ── */}
      <RoomHeader
        roomName={room?.name || 'Solo focus'}
        category={category}
        participantCount={room && connected && participants.length > 0 ? participants.length : room ? null : 1}
        shieldActive={shieldActive}
        maxParticipants={room?.maxParticipants || 1}
        videoLayout={videoLayout}
        onChangeVideoLayout={handleVideoLayoutChange}
        onExit={() => setShowExitConfirm(true)}
      />

      {(finishError || presenceError || deviceError) && (
        <div role="alert" className="absolute left-1/2 top-32 z-40 -translate-x-1/2 rounded-lg bg-zinc-950 px-4 py-2 text-sm text-rose-300">
          {finishError || presenceError || deviceError}
        </div>
      )}

      {/* ── LAYER C: SUBTLE NON-DOMINANT TIMER (CENTER TOP) ── */}
      <div className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none">
        <div className="text-3xl sm:text-5xl font-mono font-extralight tracking-widest text-white/90 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
          {formatSeconds(remainingSeconds)}
        </div>
      </div>

      {/* ── LAYER D: ADAPTIVE PARTICIPANT GALLERY (10 PEER LIVE MESH) ── */}
      <AdaptiveVideoGallery
        layoutMode={videoLayout}
        localStream={localStream}
        isCameraOn={isCameraOn}
        isMicOn={isMicOn}
        isLocalSpeaking={isLocalSpeaking}
        user={user}
        participants={participants}
        remoteStreams={remoteStreams}
        isInteractionRoom={isInteractionRoom}
        onReportPeer={(peer) => setReportingPeer(peer)}
      />

      {/* ── LAYER E: 5-BUTTON FLOATING BOTTOM CONTROL DOCK (320–420px) ── */}
      <FloatingControlDock
        currentAtmosphere={currentAtmosphere}
        onSelectAtmosphere={(atm) => {
          setCurrentAtmosphere(atm);
          sessionStorage.setItem('active_session_atmosphere', atm.id);
          api.updateSettings({ customThemeUrl: atm.bgImageUrl }).catch(() => {});
        }}
        isCameraOn={isCameraOn}
        isMicOn={isMicOn}
        toggleCamera={toggleCamera}
        toggleMic={toggleMic}
        isInteractionRoom={isInteractionRoom}
        remainingSeconds={remainingSeconds}
        plannedMinutes={plannedMinutes}
        focusedSeconds={focusedSeconds}
        distractedSeconds={distractedSeconds}
        focusScore={currentFocusRate}
        estimatedPoints={estimatedPoints}
        onEndSession={() => setShowExitConfirm(true)}
      />

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

      {/* ── COMMUNITY MODERATION SUITE ── */}
      {activeBallot && user && (
        <ModerationBallotBanner
          ballot={activeBallot}
          currentUserId={user.id}
          onCastVote={handleCastBallotVote}
        />
      )}

      {reportingPeer && (
        <ReportParticipantModal
          isOpen={Boolean(reportingPeer)}
          onClose={() => setReportingPeer(null)}
          accusedPeer={reportingPeer}
          onSubmitReport={handleFileReport}
        />
      )}

      <KickedNoticeModal
        isOpen={kickedNotice.isOpen}
        reason={kickedNotice.reason}
        onAcknowledge={() => {
          setKickedNotice({ isOpen: false, reason: '' });
          router.push('/dashboard');
        }}
      />

      {moderationNotification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-black/85 border border-white/20 text-xs text-zinc-200 shadow-2xl backdrop-blur-md animate-in fade-in duration-300">
          ⚖️ {moderationNotification}
        </div>
      )}
    </div>
  );
}

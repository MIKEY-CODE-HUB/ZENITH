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
    localVideoRef,
    isCameraOn,
    isMicOn,
    isSpeaking: isLocalSpeaking,
    toggleCamera,
    toggleMic,
  } = useWebRTC({
    socket,
    roomId: activeRoomId,
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

    socket.on('room_presence_list', (data: { participants: ParticipantPresence[] }) => {
      setParticipants(data.participants);
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

    socket.on('room_error', (data: { code: string; message: string }) => {
      if (data.code === 'ROOM_RESTRICTED') {
        alert(data.message);
        router.push('/rooms');
      }
    });

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
  }, [socket, activeRoomId, user?.id, activityName, category]);

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

      {/* ── LAYER A: UNOBTRUSIVE ROOM HEADER ── */}
      <RoomHeader
        roomName={room?.name || 'SEM Room'}
        category={category}
        participantCount={participants.length}
        maxParticipants={category === 'INTERACTION' ? 6 : (room?.maxParticipants || 10)}
        videoLayout={videoLayout}
        onChangeVideoLayout={handleVideoLayoutChange}
        onExit={() => setShowExitConfirm(true)}
      />

      {/* ── LAYER C: SUBTLE NON-DOMINANT TIMER (CENTER TOP) ── */}
      <div className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none">
        <div className="text-3xl sm:text-5xl font-mono font-extralight tracking-widest text-white/90 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
          {formatSeconds(remainingSeconds)}
        </div>
      </div>

      {/* ── LAYER D: ADAPTIVE PARTICIPANT GALLERY (10 PEER LIVE MESH) ── */}
      <AdaptiveVideoGallery
        layoutMode={videoLayout}
        localVideoRef={localVideoRef}
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

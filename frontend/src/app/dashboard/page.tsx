'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAmbient } from '@/contexts/AmbientContext';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { StartSessionModal } from '@/components/StartSessionModal';
import { Room, FocusSession, DashboardStats } from '@/lib/types';
import { formatMinutesHuman, formatDate } from '@/lib/utils';
import {
  GraduationCap,
  Dumbbell,
  Compass,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Flame,
  Clock,
  Shield,
  Star,
  Users,
  Play,
  Volume2,
  VolumeX,
  Radio,
  Image as ImageIcon,
  Zap,
  Moon,
  Sun,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const DEFAULT_ROOMS: Room[] = [
  // EDUCATION
  {
    id: 'room-grind-1',
    name: 'Grind',
    description: 'Intense DSA & Systems programming coworking',
    category: 'EDUCATION',
    topic: 'DSA & Algorithms',
    activityType: 'Coding',
    atmosphere: 'Tokyo Midnight',
    roomCode: 'GRIND1',
    isPrivate: false,
    maxParticipants: 12,
    defaultDuration: 50,
    defaultCamera: false,
    defaultMic: false,
    activeParticipantsCount: 4,
    averageFocusScore: 96,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'room-focus-2',
    name: 'Focus',
    description: 'Silent study and deep mathematics research',
    category: 'EDUCATION',
    topic: 'Discrete Math & Calculus',
    activityType: 'Mathematics',
    atmosphere: 'Rainy Library',
    roomCode: 'FOCUS2',
    isPrivate: false,
    maxParticipants: 12,
    defaultDuration: 45,
    defaultCamera: false,
    defaultMic: false,
    activeParticipantsCount: 3,
    averageFocusScore: 94,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'room-forge-3',
    name: 'Forge',
    description: 'Building compilers, OS kernels, and backend architecture',
    category: 'EDUCATION',
    topic: 'Operating Systems & Rust',
    activityType: 'Coding',
    atmosphere: 'Terminal',
    roomCode: 'FORGE3',
    isPrivate: false,
    maxParticipants: 12,
    defaultDuration: 60,
    defaultCamera: false,
    defaultMic: false,
    activeParticipantsCount: 5,
    averageFocusScore: 97,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'room-zone-4',
    name: 'Zone',
    description: 'Theoretical computer science and algorithm proofs',
    category: 'EDUCATION',
    topic: 'Algorithms & Complexity',
    activityType: 'Study',
    atmosphere: 'Nordic Pines',
    roomCode: 'ZONE4',
    isPrivate: false,
    maxParticipants: 10,
    defaultDuration: 50,
    defaultCamera: false,
    defaultMic: false,
    activeParticipantsCount: 2,
    averageFocusScore: 93,
    createdAt: new Date().toISOString(),
  },

  // EXERCISE
  {
    id: 'room-arena-5',
    name: 'Arena',
    description: 'Cardio, posture resets & mobility intervals',
    category: 'EXERCISE',
    topic: 'Cardio & Mobility',
    activityType: 'Cardio',
    atmosphere: 'Nordic Pines',
    roomCode: 'ARENA5',
    isPrivate: false,
    maxParticipants: 8,
    defaultDuration: 30,
    defaultCamera: false,
    defaultMic: false,
    activeParticipantsCount: 2,
    averageFocusScore: 98,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'room-boost-6',
    name: 'Boost',
    description: 'High-cadence calisthenics, core stability and active rest',
    category: 'EXERCISE',
    topic: 'Strength & Core',
    activityType: 'Home Workout',
    atmosphere: 'Energy Grid',
    roomCode: 'BOOST6',
    isPrivate: false,
    maxParticipants: 8,
    defaultDuration: 30,
    defaultCamera: false,
    defaultMic: false,
    activeParticipantsCount: 3,
    averageFocusScore: 95,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'room-momentum-7',
    name: 'Momentum',
    description: 'Box breathing, physical tension release & desk stretches',
    category: 'EXERCISE',
    topic: 'Posture & Recovery',
    activityType: 'Mobility',
    atmosphere: 'Sunset Dusk',
    roomCode: 'MOMENT7',
    isPrivate: false,
    maxParticipants: 10,
    defaultDuration: 25,
    defaultCamera: false,
    defaultMic: false,
    activeParticipantsCount: 1,
    averageFocusScore: 99,
    createdAt: new Date().toISOString(),
  },

  // SIDE QUEST
  {
    id: 'room-flow-8',
    name: 'Flow',
    description: 'Speed chess endgames, puzzle rushes & tactical strategy',
    category: 'SIDE_QUEST',
    topic: 'Chess Tactics & Openings',
    activityType: 'Chess',
    atmosphere: 'Sunset Dusk',
    roomCode: 'FLOW8',
    isPrivate: false,
    maxParticipants: 6,
    defaultDuration: 40,
    defaultCamera: false,
    defaultMic: false,
    activeParticipantsCount: 3,
    averageFocusScore: 91,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'room-pulse-9',
    name: 'Pulse',
    description: 'Independent product shipping, full-stack side projects',
    category: 'SIDE_QUEST',
    topic: 'Indie Web Apps',
    activityType: 'Personal Projects',
    atmosphere: 'Tokyo Midnight',
    roomCode: 'PULSE9',
    isPrivate: false,
    maxParticipants: 8,
    defaultDuration: 45,
    defaultCamera: false,
    defaultMic: false,
    activeParticipantsCount: 4,
    averageFocusScore: 92,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'room-circuit-10',
    name: 'Circuit',
    description: 'Technical writing, design docs, RFCs & research papers',
    category: 'SIDE_QUEST',
    topic: 'System Design Docs',
    activityType: 'Creative',
    atmosphere: 'Rainy Library',
    roomCode: 'CIRCUIT10',
    isPrivate: false,
    maxParticipants: 8,
    defaultDuration: 50,
    defaultCamera: false,
    defaultMic: false,
    activeParticipantsCount: 2,
    averageFocusScore: 95,
    createdAt: new Date().toISOString(),
  },

  // INTERACTION
  {
    id: 'room-collab-11',
    name: 'Collab Circle',
    description: 'Pair programming, technical interview mocks & architecture debate',
    category: 'INTERACTION',
    topic: 'Technical Interview Mock & Architecture',
    activityType: 'Problem Discussion',
    atmosphere: 'Tokyo Midnight',
    roomCode: 'COLLAB11',
    isPrivate: false,
    maxParticipants: 6,
    defaultDuration: 35,
    defaultCamera: true,
    defaultMic: true,
    activeParticipantsCount: 2,
    averageFocusScore: 95,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'room-rise-12',
    name: 'Rise Lab',
    description: 'Whiteboard walkthroughs & career roadmap discussion',
    category: 'INTERACTION',
    topic: 'System Design & Career',
    activityType: 'Discussion',
    atmosphere: 'City Run',
    roomCode: 'RISE12',
    isPrivate: false,
    maxParticipants: 6,
    defaultDuration: 30,
    defaultCamera: true,
    defaultMic: true,
    activeParticipantsCount: 3,
    averageFocusScore: 96,
    createdAt: new Date().toISOString(),
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { currentScenery, isPlayingSound, toggleSound, setIsSceneryModalOpen, activeSound } = useAmbient();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [rooms, setRooms] = useState<Room[]>(DEFAULT_ROOMS);
  const [loading, setLoading] = useState<boolean>(true);
  const [showStartModal, setShowStartModal] = useState<boolean>(false);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const [statsRes, roomsRes] = await Promise.all([
          api.getDashboardStats().catch(() => ({ success: false, stats: null })),
          api.getRooms().catch(() => ({ success: false, rooms: [] })),
        ]);

        if (statsRes.success && statsRes.stats) {
          setStats(statsRes.stats);
        }
        if (roomsRes.success && roomsRes.rooms && roomsRes.rooms.length > 0) {
          setRooms(roomsRes.rooms);
        } else {
          setRooms(DEFAULT_ROOMS);
        }
      } catch (err) {
        console.error('Error loading dashboard:', err);
        setRooms(DEFAULT_ROOMS);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  // Time-based atmospheric greeting & mood
  const getAtmosphericVibe = () => {
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 5) {
      return {
        greeting: 'Late Night Flow',
        icon: Moon,
        vibe: 'Deep midnight immersion. When the world is asleep, you build.',
        accent: 'from-sky-600/25 via-teal-600/20 to-transparent',
      };
    }
    if (hour >= 5 && hour < 12) {
      return {
        greeting: 'Dawn Momentum',
        icon: Sun,
        vibe: 'Fresh morning clarity. Seize high-cognitive energy before distractions wake.',
        accent: 'from-amber-600/25 via-orange-600/20 to-transparent',
      };
    }
    if (hour >= 12 && hour < 17) {
      return {
        greeting: 'Peak Focus Zone',
        icon: Zap,
        vibe: 'Afternoon power block. Execute your hardest engineering and problem sets.',
        accent: 'from-emerald-600/25 via-teal-600/20 to-transparent',
      };
    }
    return {
      greeting: 'Golden Hour Dusk',
      icon: Compass,
      vibe: 'Evening consistency. Lock in your closing study sprint for the day.',
      accent: 'from-rose-600/25 via-amber-600/20 to-transparent',
    };
  };

  const vibe = getAtmosphericVibe();
  const VibeIcon = vibe.icon;
  const weeklyPoints = stats?.weeklyPoints || 640;
  const weeklyGoal = 1000;
  const progressPercent = Math.min(100, Math.round((weeklyPoints / weeklyGoal) * 100));

  const categoryMinutes = stats?.categoryMinutes || {
    education: 134,
    exercise: 32,
    sideQuest: 45,
    interaction: 15,
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#07080b] text-zinc-100">
      <Sidebar />

      <main className="flex-1 p-5 sm:p-9 max-w-6xl mx-auto space-y-9">
        {/* Dynamic Atmospheric Hero Banner */}
        <div className={`relative p-6 sm:p-9 rounded-3xl bg-gradient-to-r ${vibe.accent} bg-[#10121a] border border-white/[0.08] shadow-2xl overflow-hidden`}>
          {/* Subtle Ambient Blur Halos */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                <VibeIcon className="h-4 w-4 text-emerald-400" />
                <span className="uppercase tracking-widest text-[11px] font-bold text-white/90">
                  {vibe.greeting} • {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <span className="text-zinc-600">•</span>
                <button
                  onClick={() => setIsSceneryModalOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[11px] text-zinc-300 transition-colors border border-white/10"
                >
                  <ImageIcon className="h-3 w-3 text-emerald-400" />
                  <span>Theme: {currentScenery.name}</span>
                </button>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Welcome back, {user?.name?.split(' ')[0] || 'Scholar'}.
              </h1>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
                {vibe.vibe}
              </p>
            </div>

            {/* Quick Actions (Start Session + Soundscape) */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={toggleSound}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-xs font-semibold transition-all ${
                  isPlayingSound
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-lg shadow-emerald-950/40'
                    : 'bg-white/[0.04] border-white/10 text-zinc-300 hover:bg-white/[0.08]'
                }`}
                title="Toggle ambient study audio"
              >
                {isPlayingSound ? (
                  <>
                    <Volume2 className="h-4 w-4 text-emerald-400 animate-pulse" />
                    <span className="capitalize">{activeSound} Playing</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="h-4 w-4 text-zinc-400" />
                    <span>Play Ambience</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setShowStartModal(true)}
                className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-white text-zinc-950 text-xs sm:text-sm font-bold hover:bg-zinc-100 transition-all shadow-xl hover:shadow-white/10 group active:scale-95"
              >
                <Sparkles className="h-4 w-4 text-emerald-600 transition-transform group-hover:scale-110" />
                <span>START SESSION</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Weekly Progress & Verified Points Ledger */}
        <div className="p-6 sm:p-7 rounded-3xl bg-[#10121a] border border-white/[0.08] shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Weekly Momentum</span>
              <div className="flex items-center gap-2.5 mt-1">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400 drop-shadow" />
                <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{weeklyPoints} points</span>
                <span className="text-xs text-zinc-500 font-mono">/ {weeklyGoal} target</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/25 font-semibold">
                <Flame className="h-4 w-4 fill-current" />
                <span>{stats?.currentStreak || 1}-Day Streak</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-semibold">
                <Clock className="h-4 w-4" />
                <span>{formatMinutesHuman(stats?.todayFocusedMinutes || 120)} Today</span>
              </div>
            </div>
          </div>

          {/* Glowing Atmospheric Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full bg-zinc-900 rounded-full h-3.5 overflow-hidden p-0.5 border border-white/[0.08]">
              <div
                className="bg-gradient-to-r from-emerald-400 via-sky-400 to-amber-400 h-full rounded-full transition-all duration-700 shadow-md shadow-emerald-500/30"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-zinc-400 font-mono pt-0.5">
              <span>0 pts</span>
              <span className="text-emerald-400 font-semibold">{progressPercent}% verified focus complete</span>
              <span>{weeklyGoal} pts target</span>
            </div>
          </div>
        </div>

        {/* The 4 Category Pillars with Rich Aesthetic Styling */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">Today&apos;s Focus by Category</h2>
              <p className="text-xs text-zinc-400">Verifiable time logged across Zenith&apos;s four core disciplines</p>
            </div>
            <Link href="/analytics" className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors">
              <span>Analytics Telemetry</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 1. Education */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-[#131b2c] to-[#10121a] border border-sky-500/25 hover:border-sky-500/40 transition-all shadow-lg space-y-3 group">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-inner">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold font-mono text-sky-400/80 uppercase">Pillar I</span>
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-300">Education</h3>
                <p className="text-2xl font-extrabold text-white mt-0.5 font-mono">
                  {formatMinutesHuman(categoryMinutes.education)}
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">DSA, Math, Exams & Code</p>
              </div>
            </div>

            {/* 2. Exercise */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-[#1a1712] to-[#10121a] border border-amber-500/25 hover:border-amber-500/40 transition-all shadow-lg space-y-3 group">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-inner">
                  <Dumbbell className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold font-mono text-amber-400/80 uppercase">Pillar II</span>
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-300">Exercise</h3>
                <p className="text-2xl font-extrabold text-white mt-0.5 font-mono">
                  {formatMinutesHuman(categoryMinutes.exercise)}
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">Workouts & Form Training</p>
              </div>
            </div>

            {/* 3. Side Quest */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-[#10191c] to-[#10121a] border border-teal-500/25 hover:border-teal-500/40 transition-all shadow-lg space-y-3 group">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30 shadow-inner">
                  <Compass className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold font-mono text-teal-400/80 uppercase">Pillar III</span>
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-300">Side Quest</h3>
                <p className="text-2xl font-extrabold text-white mt-0.5 font-mono">
                  {formatMinutesHuman(categoryMinutes.sideQuest)}
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">Side Projects, Chess & Books</p>
              </div>
            </div>

            {/* 4. Interaction */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-[#111915] to-[#10121a] border border-emerald-500/25 hover:border-emerald-500/40 transition-all shadow-lg space-y-3 group">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-inner">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold font-mono text-emerald-400/80 uppercase">Pillar IV</span>
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-300">Interaction</h3>
                <p className="text-2xl font-extrabold text-white mt-0.5 font-mono">
                  {formatMinutesHuman(categoryMinutes.interaction)}
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">6-Person Voice Circles</p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Active Rooms Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">Active Focus Rooms</h2>
              <p className="text-xs text-zinc-400">Join peers currently studying in shared atmospheric rooms</p>
            </div>
            <Link href="/rooms" className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors">
              <span>View All Rooms</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {rooms.slice(0, 6).map((room) => {
              const isInteraction = room.category === 'INTERACTION';
              return (
                <div
                  key={room.id}
                  className="p-5 rounded-3xl bg-[#10121a] border border-white/[0.08] hover:border-white/20 transition-all space-y-4 shadow-xl relative overflow-hidden group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <h3 className="text-base font-bold text-white tracking-tight">{room.name}</h3>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-400 border border-white/5">
                      {room.roomCode}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-zinc-400">
                    <div className="flex items-center justify-between">
                      <span>Atmosphere:</span>
                      <strong className="text-zinc-200">{room.atmosphere || 'Rainy Window'}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Capacity:</span>
                      <span className="font-mono text-zinc-300">{room.participants?.length || 1} / {room.maxParticipants} students</span>
                    </div>
                  </div>

                  <Link
                    href={`/focus/${room.id}`}
                    className="w-full py-2.5 rounded-xl bg-white text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition-colors flex items-center justify-center gap-1.5 shadow-md group-hover:shadow-white/10"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Enter Room</span>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grounding Student Philosophy Card */}
        <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-4 text-xs text-zinc-400">
          <p className="italic leading-relaxed max-w-2xl">
            &ldquo;We don&apos;t track hours to impress anyone. We expose distractions so you can witness where your actual time goes and build unshakeable consistency.&rdquo;
          </p>
          <span className="font-semibold text-white font-mono shrink-0 hidden sm:inline">ZENITH 2026</span>
        </div>
      </main>

      {/* Start Session Modal */}
      {showStartModal && (
        <StartSessionModal isOpen={showStartModal} onClose={() => setShowStartModal(false)} />
      )}
    </div>
  );
}

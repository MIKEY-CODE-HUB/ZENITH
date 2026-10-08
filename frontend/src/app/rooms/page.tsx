'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { CreateRoomModal } from '@/components/CreateRoomModal';
import { Room, ActivityCategory } from '@/lib/types';
import {
  Search,
  Plus,
  Users,
  MessageSquare,
  Mic,
  Video,
  Lock,
  Star,
  GraduationCap,
  Dumbbell,
  Compass,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Interaction Entry Modal State
  const [interactionRoomToJoin, setInteractionRoomToJoin] = useState<Room | null>(null);
  const [interactionQuote, setInteractionQuote] = useState<{
    weeklyBalance: number;
    cost: number;
    remaining: number;
    canAfford: boolean;
  } | null>(null);
  const [authorizing, setAuthorizing] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const categories = [
    { id: 'All', label: 'All Rooms', icon: null },
    { id: 'EDUCATION', label: 'Education', icon: GraduationCap },
    { id: 'EXERCISE', label: 'Exercise', icon: Dumbbell },
    { id: 'SIDE_QUEST', label: 'Side Quest', icon: Compass },
    { id: 'INTERACTION', label: 'Interaction (Voice)', icon: MessageSquare },
  ];

  const DEFAULT_ROOM_LIST: Room[] = [
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
      activeParticipantsCount: 0,
      averageFocusScore: 0,
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
      activeParticipantsCount: 0,
      averageFocusScore: 0,
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
      activeParticipantsCount: 0,
      averageFocusScore: 0,
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
      activeParticipantsCount: 0,
      averageFocusScore: 0,
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
      activeParticipantsCount: 0,
      averageFocusScore: 0,
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
      activeParticipantsCount: 0,
      averageFocusScore: 0,
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
      activeParticipantsCount: 0,
      averageFocusScore: 0,
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
      activeParticipantsCount: 0,
      averageFocusScore: 0,
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
      activeParticipantsCount: 0,
      averageFocusScore: 0,
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
      activeParticipantsCount: 0,
      averageFocusScore: 0,
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
      activeParticipantsCount: 0,
      averageFocusScore: 0,
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
      activeParticipantsCount: 0,
      averageFocusScore: 0,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'room-cortex-13',
      name: 'Cortex',
      description: 'Machine Learning research, paper reading & model training',
      category: 'EDUCATION',
      topic: 'Deep Learning & Math',
      activityType: 'Research',
      atmosphere: 'Nordic Pines',
      roomCode: 'CORTEX13',
      isPrivate: false,
      maxParticipants: 12,
      defaultDuration: 60,
      defaultCamera: false,
      defaultMic: false,
      activeParticipantsCount: 0,
      averageFocusScore: 0,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'room-zenith-14',
      name: 'Zenith Peak',
      description: 'Silent ultra-deep work block for long marathon sessions',
      category: 'SIDE_QUEST',
      topic: 'Open Source & Sprints',
      activityType: 'Coding',
      atmosphere: 'Terminal',
      roomCode: 'PEAK14',
      isPrivate: false,
      maxParticipants: 10,
      defaultDuration: 75,
      defaultCamera: false,
      defaultMic: false,
      activeParticipantsCount: 0,
      averageFocusScore: 0,
      createdAt: new Date().toISOString(),
    },
  ];

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await api.getRooms({
        category: selectedCategory,
        search,
      });
      if (res && res.success && res.rooms && res.rooms.length > 0) {
        setRooms(res.rooms);
      } else {
        const filtered = selectedCategory === 'All'
          ? DEFAULT_ROOM_LIST
          : DEFAULT_ROOM_LIST.filter(r => r.category === selectedCategory);
        setRooms(filtered);
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
      const filtered = selectedCategory === 'All'
        ? DEFAULT_ROOM_LIST
        : DEFAULT_ROOM_LIST.filter(r => r.category === selectedCategory);
      setRooms(filtered);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRooms();
  };

  const handleRoomClick = async (room: Room) => {
    if (room.category === 'INTERACTION') {
      // Fetch transparent 30% weekly cost quote
      try {
        setInteractionRoomToJoin(room);
        setAuthError(null);
        const quoteRes = await api.getInteractionQuote();
        if (quoteRes.success) {
          setInteractionQuote(quoteRes.quote);
        }
      } catch (e: any) {
        alert(e.message || 'Failed to fetch quote');
      }
    } else {
      router.push(`/focus/${room.id}`);
    }
  };

  const handleConfirmInteractionEntry = async () => {
    if (!interactionRoomToJoin) return;
    try {
      setAuthorizing(true);
      setAuthError(null);
      const res = await api.authorizeInteraction(interactionRoomToJoin.id);
      if (res.success) {
        setInteractionRoomToJoin(null);
        router.push(`/focus/${interactionRoomToJoin.id}`);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authorization failed. Insufficient points or room full.');
    } finally {
      setAuthorizing(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090b] text-zinc-100">
      <Sidebar />

      <main className="flex-1 p-6 sm:p-10 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-Time Social Presence</span>
            </div>
            <h1 className="text-3xl font-semibold text-white tracking-tight">Focus & Interaction Rooms</h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              The room is shared. The activity can differ. The atmosphere can be personal.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-100 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Create Room</span>
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-white/[0.06] pb-3">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === c.id
                  ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                  : 'bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search rooms by name or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-white/20 focus:outline-none transition-colors"
          />
        </form>

        {/* Room Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rooms.map((room) => {
            const isInteraction = room.category === 'INTERACTION';
            const isFull = room.activeParticipantsCount >= room.maxParticipants;

            return (
              <div
                key={room.id}
                className="group relative rounded-2xl bg-white/[0.02] border border-white/[0.07] hover:border-white/15 p-5 transition-all duration-300 flex flex-col justify-between space-y-4 hover:shadow-xl hover:shadow-black/40"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-white tracking-wider">{room.name}</span>
                    <span
                      className={`text-[10px] font-mono px-2.5 py-1 rounded-md border ${
                        isInteraction
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {isInteraction ? 'MAX 6 STUDENTS' : room.category}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">{room.description}</p>

                  {room.topic && (
                    <div className="mt-2.5 p-2 rounded-lg bg-amber-500/5 border border-amber-500/15 text-[11px] text-amber-200">
                      Topic: <span className="font-semibold text-white">{room.topic}</span>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-3 text-xs text-zinc-400">
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-zinc-500" />
                      <span className="font-mono text-zinc-300">
                        {room.activeParticipantsCount} / {room.maxParticipants}
                      </span>
                    </div>
                    {isInteraction && (
                      <div className="flex items-center gap-1 text-amber-400">
                        <Mic className="h-3.5 w-3.5" />
                        <span>Voice Enabled</span>
                      </div>
                    )}
                    {room.defaultCamera && (
                      <div className="flex items-center gap-1 text-zinc-400">
                        <Video className="h-3.5 w-3.5 text-zinc-500" />
                        <span>Camera</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                  <div className="text-[11px] font-mono text-zinc-500">
                    Code: {room.roomCode}
                  </div>

                  <button
                    onClick={() => handleRoomClick(room)}
                    disabled={isFull}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      isFull
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : isInteraction
                        ? 'bg-amber-400 text-zinc-950 hover:bg-amber-300 shadow-md font-bold'
                        : 'bg-white/10 hover:bg-white text-zinc-100 hover:text-zinc-950'
                    }`}
                  >
                    <span>{isFull ? 'Room Full' : isInteraction ? 'Enter (30% Points)' : 'Enter Room'}</span>
                    {!isFull && <ArrowRight className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* INTERACTION ROOM TRANSPARENT COST MODAL */}
        {interactionRoomToJoin && interactionQuote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-[#0d0f14]/95 p-6 shadow-2xl text-zinc-100 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">INTERACTION ROOM</h3>
                  <p className="text-xs text-zinc-400">Talk with up to 5 other ambitious students.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5 text-xs font-mono">
                <div className="text-zinc-400">
                  Room: <span className="text-white font-bold">{interactionRoomToJoin.name}</span>
                </div>
                {interactionRoomToJoin.topic && (
                  <div className="text-zinc-400">
                    Topic: <span className="text-amber-300 font-semibold">{interactionRoomToJoin.topic}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-white/10 text-zinc-400">
                  Cost: <span className="text-white font-semibold">30% of weekly points</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Your balance:</span>
                  <span className="text-white font-bold">{interactionQuote.weeklyBalance} pts</span>
                </div>
                <div className="flex justify-between text-amber-400">
                  <span>Room cost:</span>
                  <span className="font-bold">-{interactionQuote.cost} pts</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-white/10 text-zinc-300">
                  <span>Remaining:</span>
                  <span className="font-bold text-white">{interactionQuote.remaining} pts</span>
                </div>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setInteractionRoomToJoin(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmInteractionEntry}
                  disabled={authorizing || !interactionQuote.canAfford}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 text-zinc-950 text-xs font-bold hover:bg-amber-300 transition-colors shadow-lg disabled:opacity-50"
                >
                  {authorizing ? 'Authorizing Deduction...' : 'ENTER INTERACTION'}
                </button>
              </div>
            </div>
          </div>
        )}

        <CreateRoomModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            fetchRooms();
          }}
        />
      </main>
    </div>
  );
}

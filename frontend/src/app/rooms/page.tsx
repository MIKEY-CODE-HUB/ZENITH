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
  Mic,
  MessageSquare,
  Video,
  Lock,
  ArrowRight,
  ShieldAlert,
  KeyRound,
  Shuffle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [roomAction, setRoomAction] = useState<'host' | 'member' | null>(null);
  useEffect(() => {
    const url = new URL(window.location.href);
    const action = url.searchParams.get('roomAction');
    if (action !== 'host' && action !== 'member') return;
    setRoomAction(action);
    url.searchParams.delete('roomAction');
    window.history.replaceState(window.history.state, '', url);
  }, []);

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
    { id: 'All', label: 'All Rooms' },
    { id: 'EDUCATION', label: 'Education' },
    { id: 'EXERCISE', label: 'Exercise' },
    { id: 'SIDE_QUEST', label: 'Side Quest' },
    { id: 'INTERACTION', label: 'Interaction' },
  ];

  const [roomListError, setRoomListError] = useState<string | null>(null);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setRoomListError(null);
      const result = await api.getRooms({ category: selectedCategory, search });
      setRooms(result.rooms);
    } catch (err) {
      setRooms([]);
      setRoomListError(err instanceof Error ? err.message : 'Could not load rooms.');
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

  const [matchmaking, setMatchmaking] = useState<boolean>(false);
  const [matchmakeError, setMatchmakeError] = useState<string | null>(null);

  const handleDynamicMatchmake = async () => {
    try {
      setMatchmaking(true);
      setMatchmakeError(null);
      const targetCategory = selectedCategory === 'All' ? 'EDUCATION' : selectedCategory;

      let confirmInteraction = false;
      if (targetCategory === 'INTERACTION') {
        const quoteRes = await api.getInteractionQuote();
        if (quoteRes.success && !quoteRes.quote.canAfford) {
          setMatchmakeError(`Insufficient weekly points (requires ${quoteRes.quote.cost} ⭐).`);
          return;
        }
        confirmInteraction = window.confirm(`Join an Interaction room for approximately ${quoteRes.quote.cost} weekly points?`);
        if (!confirmInteraction) return;
      }

      const res = await api.allocateRoom({ category: targetCategory, confirmInteraction });
      if (res.success && res.room) {
        router.push(`/focus/${res.room.id}`);
      } else {
        setMatchmakeError('Matchmaking allocation failed. Please retry.');
      }
    } catch (err: any) {
      console.error('Matchmaking error:', err);
      setMatchmakeError(err.message || 'Unable to allocate room.');
    } finally {
      setMatchmaking(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] text-zinc-100">
      <Sidebar />

      <main className="zenith-room-content mx-auto min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-9 xl:px-10">
        <header className="zenith-room-intro cozy-glass">
          <div>
            <h1 className="font-serif text-4xl tracking-tight text-[#fff5e9] sm:text-5xl">Focus rooms</h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[#e3d1c0]">Find a room to study, train, or work alongside others.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setRoomAction('member')} className="zenith-room-quiet">
              <KeyRound size={16} /> Join with code
            </button>
            <button type="button" onClick={() => setRoomAction('host')} className="zenith-room-primary">
              <Plus size={17} /> Create room
            </button>
          </div>
        </header>

        <div className="zenith-room-toolbar cozy-glass">
          <div role="group" aria-label="Room category" className="flex flex-wrap gap-1.5">
            {categories.map(({ id, label }) => (
              <button type="button" key={id} aria-pressed={selectedCategory === id} onClick={() => setSelectedCategory(id)}
                className="zenith-room-tab">{label}</button>
            ))}
          </div>
          <form onSubmit={handleSearchSubmit} role="search" className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-[#e3d1c0]" aria-hidden />
            <input type="search" aria-label="Search rooms" placeholder="Search rooms" value={search}
              onChange={event => setSearch(event.target.value)} className="zenith-room-field !mt-0 !pl-10" />
          </form>
          <button type="button" onClick={() => handleDynamicMatchmake()} disabled={matchmaking} className="zenith-room-quiet justify-center">
            <Shuffle size={16} /> {matchmaking ? 'Finding a room…' : 'Quick match'}
          </button>
        </div>
        {matchmakeError && <p role="alert" className="mb-4 text-sm text-rose-100">{matchmakeError}</p>}

        <div className="zenith-room-grid">
          {loading && <p role="status">Loading rooms…</p>}
          {!loading && roomListError && (
            <div role="alert">
              <p>{roomListError}</p>
              <button onClick={fetchRooms} className="text-sky-300 underline">Retry</button>
            </div>
          )}
          {!loading && !roomListError && rooms.length === 0 && <p>No rooms found.</p>}
          {!loading && rooms.map((room) => {
            const isInteraction = room.category === 'INTERACTION';
            const isFull = room.activeParticipantsCount >= room.maxParticipants;

            const categoryLabel = categories.find(category => category.id === room.category)?.label ?? 'Focus';
            return (
              <article key={room.id} className="zenith-room-card cozy-glass">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="min-w-0 break-words text-lg font-semibold tracking-tight text-[#fff5e9]">{room.name}</h2>
                  <span className="rounded-full border border-[#edd4ae]/20 bg-[#edd4ae]/10 px-2.5 py-1 text-xs text-[#f7dfbc]">{categoryLabel}</span>
                </div>
                {room.description && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#e3d1c0]">{room.description}</p>}
                {room.topic && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#f0d2a6]">{room.topic}</p>}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#ead6c3]">
                    <span className="inline-flex items-center gap-1.5"><Users size={15} aria-hidden /> {room.activeParticipantsCount}/{room.maxParticipants}</span>
                    {isInteraction && <span className="inline-flex items-center gap-1"><Mic size={14} aria-hidden /> Voice</span>}
                    {room.defaultCamera && <span className="inline-flex items-center gap-1"><Video size={14} aria-hidden /> Camera</span>}
                  </div>
                  <button type="button" onClick={() => handleRoomClick(room)} disabled={isFull}
                    className={isInteraction ? 'zenith-room-primary' : 'zenith-room-quiet'}>
                    {isFull ? 'Full' : isInteraction ? 'Enter · 30% points' : 'Enter room'}
                    {!isFull && <ArrowRight size={15} />}
                  </button>
                </div>
              </article>
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

        {roomAction && <CreateRoomModal initialMode={roomAction} onClose={() => setRoomAction(null)} onCreated={fetchRooms} />}
      </main>
    </div>
  );
}

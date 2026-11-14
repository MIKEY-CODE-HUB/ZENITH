'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, KeyRound, Plus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiError, type RoomInvitation } from '@/lib/api';
import { type ActivityCategory, type ActivityType, type Room } from '@/lib/types';
import { RoomInviteControls } from '@/components/RoomInviteControls';

type Mode = 'host' | 'member';
const activities: ActivityType[] = ['Study', 'Work', 'Coding', 'Gym', 'Creative', 'Reading', 'Practice', 'Other'];

export function CreateRoomModal({ initialMode = 'host', onClose, onCreated }: {
  initialMode?: Mode;
  onClose: () => void;
  onCreated: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [category, setCategory] = useState<ActivityCategory>('EDUCATION');
  const [inviteCode, setInviteCode] = useState('');
  const [quote, setQuote] = useState<{ cost: number; canAfford: boolean } | null>(null);
  const [created, setCreated] = useState<{ room: Room; invitation: RoomInvitation } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  function selectMode(next: Mode) {
    setMode(next);
    setError('');
    setQuote(null);
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('roomName')).trim();
    if (!name) {
      setError('Enter a room name.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { room, invitation } = await api.hostRoom({
        name,
        description: String(form.get('description')).trim(),
        activityType: String(form.get('activity')),
        category,
        duration: Number(form.get('duration')),
        isPrivate: !form.has('listed'),
        maxParticipants: category === 'INTERACTION' ? 6 : 10,
        camera: false,
        mic: false,
      });
      setCreated({ room, invitation });
      onCreated();
    } catch (failure) {
      setError(failure instanceof ApiError && failure.status === 404
        ? 'Hosting with codes is unavailable on this deployment.'
        : failure instanceof Error ? failure.message : 'Could not create your room.');
    } finally {
      setBusy(false);
    }
  }

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || quote?.canAfford === false) return;
    setBusy(true);
    setError('');
    try {
      const { room } = await api.joinRoomByCode(inviteCode.trim(), Boolean(quote));
      onClose();
      router.push(`/focus/${room.id}/setup`);
    } catch (failure) {
      if (!quote && failure instanceof ApiError && failure.status === 402) {
        try {
          setQuote((await api.getInteractionQuote()).quote);
        } catch {
          setError('Could not load the points cost. Try again.');
        }
      } else {
        setError(failure instanceof ApiError && failure.status === 404
          ? 'That code is invalid or expired. Ask your host for a new code.'
          : failure instanceof Error ? failure.message : 'Could not join the room.');
      }
    } finally {
      setBusy(false);
    }
  }

  const title = created ? 'Your room is ready' : 'Create or join a room';

  return (
    <dialog ref={dialog} aria-labelledby="room-entry-title"
      onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
      className="zenith-room-dialog m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl p-5 sm:p-7">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 id="room-entry-title" className="font-serif text-3xl tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-[#e3d1c0]">{created ? created.room.name : 'Host a room or use a code from your host.'}</p>
        </div>
        <button type="button" aria-label="Close room dialog" disabled={busy} onClick={onClose} className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-50">
          <X size={20} />
        </button>
      </header>

      {created ? (
        <div className="space-y-5">
          <RoomInviteControls roomId={created.room.id} initialInvitation={created.invitation} />
          <Link className="zenith-room-primary w-full justify-center" onClick={onClose} href={`/focus/${created.room.id}/setup`}>Enter as host <ArrowRight size={16} /></Link>
        </div>
      ) : (
        <>
          <div role="group" aria-label="Room role" className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-black/20 p-1.5">
            <button type="button" disabled={busy} aria-pressed={mode === 'host'} onClick={() => selectMode('host')} className="zenith-room-tab">
              <Plus size={16} /> Join as host
            </button>
            <button type="button" disabled={busy} aria-pressed={mode === 'member'} onClick={() => selectMode('member')} className="zenith-room-tab">
              <KeyRound size={16} /> Join as member
            </button>
          </div>
          {error && <p role="alert" className="mb-4 rounded-xl border border-rose-300/30 bg-rose-950/45 px-3 py-2 text-sm text-rose-100">{error}</p>}
          {authLoading ? <p role="status" className="text-sm">Checking your account…</p> : !user ? (
            <Link href={`/login?roomAction=${mode}`} className="zenith-room-primary w-full justify-center">
              Sign in to {mode === 'host' ? 'host a room' : 'join with a code'} <ArrowRight size={16} />
            </Link>
          ) : mode === 'host' ? (
            <form onSubmit={create}>
              <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
                <label className="block text-sm">Room name
                  <input name="roomName" required maxLength={72} placeholder="Sunday study group" className="zenith-room-field" />
                </label>
                <label className="block text-sm">What are you working on? <span className="text-xs text-[#e3d1c0]">(optional)</span>
                  <input name="description" maxLength={240} placeholder="Review graphs and solve two practice problems" className="zenith-room-field" />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">Category
                    <select value={category} onChange={event => setCategory(event.target.value as ActivityCategory)} className="zenith-room-field">
                      <option value="EDUCATION">Education</option><option value="EXERCISE">Exercise</option>
                      <option value="SIDE_QUEST">Side Quest</option><option value="INTERACTION">Interaction</option>
                    </select>
                  </label>
                  <label className="block text-sm">Activity
                    <select name="activity" defaultValue="Study" className="zenith-room-field">{activities.map(activity => <option key={activity}>{activity}</option>)}</select>
                  </label>
                </div>
                <label className="block text-sm">Session length
                  <select name="duration" defaultValue="50" className="zenith-room-field">
                    {[25, 50, 90].map(minutes => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
                  </select>
                </label>
                <label className="flex items-start gap-2 text-sm text-[#e3d1c0]">
                  <input name="listed" type="checkbox" className="mt-1 accent-[#efd3ac]" />
                  List this room so others can find it
                </label>
                {category === 'INTERACTION' && <p className="text-sm text-[#e3d1c0]">Up to six people. Entry costs 30% of weekly points.</p>}
                <button className="zenith-room-primary w-full justify-center">{busy ? 'Creating…' : 'Create room'} <ArrowRight size={16} /></button>
              </fieldset>
            </form>
          ) : (
            <form onSubmit={join}>
              <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
                <label className="block text-sm">Room code
                  <input required autoCapitalize="characters" spellCheck={false} maxLength={32} placeholder="7F2A-B140-8C93-E561"
                    value={inviteCode} onChange={event => { setInviteCode(event.target.value.toUpperCase()); setQuote(null); setError(''); }}
                    className="zenith-room-field font-mono tracking-wider" />
                </label>
                {quote && <p className="text-sm text-[#efd3ac]">{quote.canAfford ? `This Interaction room costs ${quote.cost} weekly points to enter.` : 'You need weekly points to join this Interaction room.'}</p>}
                <button disabled={quote?.canAfford === false} className="zenith-room-primary w-full justify-center">
                  {busy ? 'Checking code…' : quote?.canAfford ? `Join for ${quote.cost} points` : 'Join room'} <ArrowRight size={16} />
                </button>
              </fieldset>
            </form>
          )}
        </>
      )}
    </dialog>
  );
}

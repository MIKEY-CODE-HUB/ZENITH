'use client';

import { useState } from 'react';
import { api, type RoomInvitation } from '@/lib/api';
import { Check, Copy } from 'lucide-react';

export function RoomInviteControls({ roomId, initialInvitation }: { roomId: string; initialInvitation?: RoomInvitation }) {
  const [invitation, setInvitation] = useState(initialInvitation);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [busy, setBusy] = useState(false);

  async function update(revoke: boolean) {
    setBusy(true);
    setMessage('');
    setCopied(null);
    try {
      if (revoke) {
        await api.revokeRoomInvite(roomId);
        setInvitation(undefined);
        setMessage('Invitation revoked.');
      } else {
        setInvitation(await api.createRoomInvite(roomId));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update the invitation.');
    } finally {
      setBusy(false);
    }
  }

  async function copy(kind: 'code' | 'link') {
    if (!invitation) return;
    const value = kind === 'code' ? invitation.code : `${window.location.origin}/invite/${roomId}#${invitation.token}`;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setMessage(kind === 'code' ? 'Room code copied.' : 'Invite link copied.');
    } catch {
      setMessage(kind === 'code' ? 'Select the room code to copy it.' : 'Could not copy the link. You can share the room code.');
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-white/15 bg-white/5 p-4 text-sm" aria-label="Room invitation">
      {invitation && (
        <>
          <label className="block text-xs text-[#e3d1c0]" htmlFor={`room-code-${roomId}`}>Room code</label>
          <div className="flex flex-wrap items-center gap-2">
            <input id={`room-code-${roomId}`} className="min-w-[13rem] flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono tracking-wide"
              value={invitation.code} readOnly onFocus={event => event.target.select()} />
            <button type="button" className="zenith-room-quiet" onClick={() => void copy('code')}>
              {copied === 'code' ? <Check size={14} /> : <Copy size={14} />} Copy code
            </button>
          </div>
          <p className="text-xs leading-relaxed text-[#e3d1c0]">Share the code or link with members. Both expire in 24 hours.</p>
        </>
      )}
      <div className="flex flex-wrap gap-4 text-xs">
        {invitation && <button type="button" className="underline underline-offset-4" onClick={() => void copy('link')}>Copy invite link</button>}
        <button type="button" disabled={busy} className="underline underline-offset-4" onClick={() => void update(false)}>
          {invitation ? 'Replace code and link' : 'Generate code and link'}
        </button>
        <button type="button" disabled={busy} className="underline underline-offset-4" onClick={() => void update(true)}>Revoke invitation</button>
      </div>
      {message && <p role="status" className="text-xs text-[#efd3ac]">{message}</p>}
    </section>
  );
}

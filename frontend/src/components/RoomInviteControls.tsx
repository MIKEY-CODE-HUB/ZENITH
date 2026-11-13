'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export function RoomInviteControls({ roomId }: { roomId: string }) {
  const [link, setLink] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function update(revoke: boolean) {
    setBusy(true);
    setMessage('');
    try {
      if (revoke) {
        await api.revokeRoomInvite(roomId);
        setLink('');
        setMessage('Invite revoked.');
      } else {
        const { token } = await api.createRoomInvite(roomId);
        setLink(`${window.location.origin}/invite/${roomId}#${token}`);
        setMessage('Link expires in 24 hours. Creating a new link replaces the previous one.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update the invite.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm" aria-label="Private room invitation">
      <div className="flex flex-wrap gap-4">
        <button type="button" disabled={busy} className="underline" onClick={() => void update(false)}>Create invite link</button>
        <button type="button" disabled={busy} className="underline" onClick={() => void update(true)}>Revoke invite</button>
      </div>
      {link && (
        <div className="flex gap-2">
          <input className="min-w-0 flex-1 rounded border border-white/10 bg-black/30 p-2" aria-label="Invite link" value={link} readOnly onFocus={event => event.target.select()} />
          <button type="button" className="underline" onClick={async () => {
            try { await navigator.clipboard.writeText(link); setMessage('Invite copied. It expires in 24 hours.'); }
            catch { setMessage('Select the link to copy it.'); }
          }}>Copy</button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}

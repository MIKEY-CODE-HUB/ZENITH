'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiError } from '@/lib/api';

export default function RoomInvitePage() {
  const roomId = useParams<{ id: string }>().id;
  const router = useRouter();
  const { user, loading } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [joining, setJoining] = useState(false);
  const [quote, setQuote] = useState<{ cost: number; canAfford: boolean } | null>(null);
  const [error, setError] = useState('');
  const key = `zenith_invite_${roomId}`;

  useEffect(() => {
    const fromLink = window.location.hash.slice(1);
    try {
      if (fromLink) sessionStorage.setItem(key, fromLink);
      setToken(fromLink || sessionStorage.getItem(key));
    } catch {
      setToken(fromLink || null);
    }
    if (fromLink) window.history.replaceState(window.history.state, '', window.location.pathname);
    setReady(true);
  }, [key]);

  async function join() {
    if (!token || joining) return;
    setJoining(true);
    setError('');
    try {
      await api.joinRoom(roomId, { inviteToken: token, confirmInteraction: Boolean(quote) });
      try { sessionStorage.removeItem(key); } catch {}
      router.replace(`/focus/${roomId}`);
    } catch (err) {
      if (!quote && err instanceof ApiError && err.status === 402) {
        try {
          const result = await api.getInteractionQuote();
          setQuote(result.quote);
        } catch {
          setError('Could not load the points cost. Try again.');
        }
      } else {
        setError(err instanceof ApiError && err.status === 404
          ? 'This invite is invalid or expired. Ask the host for a new link.'
          : err instanceof Error ? err.message : 'Could not join the room.');
      }
    } finally {
      setJoining(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <h1 className="text-2xl font-semibold">Private room invite</h1>
      {(!ready || loading) ? <p role="status" className="mt-4">Opening your invite…</p> : !token ? (
        <p role="alert" className="mt-4">Open the original invite link to join this room.</p>
      ) : (
        <>
          {error && <p role="alert" className="mt-4">{error}</p>}
          {quote && <p className="mt-4">{quote.canAfford
            ? `Interaction room entry costs ${quote.cost} weekly points.`
            : 'You need weekly points to join this Interaction room.'}</p>}
          <button type="button" disabled={joining || quote?.canAfford === false}
            className="mt-5 rounded-lg bg-[rgb(var(--action))] px-4 py-2 text-[rgb(var(--action-ink))] disabled:opacity-50"
            onClick={() => user ? void join() : router.push(`/login?invite=${encodeURIComponent(roomId)}`)}>
            {!user ? 'Sign in to join' : joining ? 'Joining…' : quote ? `Join for ${quote.cost} points` : 'Join private room'}
          </button>
        </>
      )}
    </main>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export function useRoomShield(sessionId: string | null, enabled: boolean, deadline: number | null) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ status: 'checking' | 'active' | 'unavailable' | 'stopped'; message?: string }>({ status: 'checking' });

  useEffect(() => {
    if (!sessionId || !enabled || deadline === null) return;
    const origin = window.location.origin;
    const requestId = crypto.randomUUID();
    let cancelled = false;
    let replied = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setState({ status: 'checking' });

    function onStatus(event: MessageEvent) {
      if (event.source !== window || event.origin !== origin || event.data?.type !== 'ZENITH_SHIELD_STATUS') return;
      const status = event.data;
      if (status.focusSessionId && status.focusSessionId !== sessionId) return;
      if (status.requestId && status.requestId !== requestId) return;
      if (!status.requestId && !status.focusSessionId && replied) return;
      replied = true;
      clearTimeout(timer);
      if (status.active === true) setState({ status: 'active' });
      else if (status.stopped === true) setState({ status: 'stopped' });
      else setState({ status: 'unavailable', message: 'Chrome could not apply the Shield rules. Check the extension and retry.' });
    }

    window.addEventListener('message', onStatus);
    void (async () => {
      try {
        const blocker = await api.activateBlocker(sessionId, 'STRICT', AbortSignal.timeout(10_000));
        if (cancelled) return;
        if (!blocker.success || !blocker.blockerToken) throw new Error('Zenith could not authorize the Shield.');
        timer = setTimeout(() => {
          setState({ status: 'unavailable', message: 'Chrome did not confirm protection. Load the Zenith extension, then reload this tab or retry.' });
        }, 6500);
        window.postMessage({
          type: 'ZENITH_BLOCKER_ACTIVATE', requestId, roomUrl: window.location.href,
          focusSessionId: sessionId, blockerToken: blocker.blockerToken, expiresAt: deadline + 60_000,
        }, origin);
      } catch (error) {
        if (!cancelled) setState({ status: 'unavailable', message: error instanceof Error ? error.message : 'Zenith could not authorize the Shield.' });
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener('message', onStatus);
    };
  }, [deadline, enabled, sessionId, attempt]);

  return { ...state, status: enabled ? state.status : 'off' as const, retry: () => setAttempt(value => value + 1) };
}

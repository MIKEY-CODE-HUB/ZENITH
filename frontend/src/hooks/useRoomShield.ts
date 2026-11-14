'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const shieldErrors: Record<string, string> = {
  room_changed: 'Chrome could not match this tab to the focus room. Reconnect from the extension popup.',
  session_inactive: 'Zenith did not confirm an active protected session. Retry Shield or start a new focus session.',
  session_expired: 'This focus session expired. Start a new session to enable Shield.',
  status_unreachable: 'The extension could not reach Zenith to verify this session. Check your connection, then retry.',
  rules_rejected: 'Chrome rejected the blocking rules. Check the extension’s Errors panel in chrome://extensions.',
  extension_reloaded: 'The extension was reloaded. Open its popup and select Reconnect current focus room.',
};

export function useRoomShield(sessionId: string | null, enabled: boolean, deadline: number | null) {
  const [attempt, setAttempt] = useState(0);
  const [desktopNeedsPermission, setDesktopNeedsPermission] = useState(false);
  const [state, setState] = useState<{ status: 'checking' | 'active' | 'unavailable' | 'stopped'; message?: string }>({ status: 'checking' });

  useEffect(() => {
    if (!sessionId || !enabled || deadline === null) return;
    const origin = window.location.origin;
    const requestId = crypto.randomUUID();
    let cancelled = false;
    let replied = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setState({ status: 'checking' });
    setDesktopNeedsPermission(false);

    function onStatus(event: MessageEvent) {
      if (event.source !== window || event.origin !== origin) return;
      if (event.data?.type === 'ZENITH_DESKTOP_STATUS' && event.data.focusSessionId === sessionId) {
        setDesktopNeedsPermission(event.data.state === 'permission_required');
        return;
      }
      if (event.data?.type === 'ZENITH_RETRY_SHIELD') {
        setAttempt(value => value + 1);
        return;
      }
      if (event.data?.type !== 'ZENITH_SHIELD_STATUS') return;
      const status = event.data;
      if (status.focusSessionId && status.focusSessionId !== sessionId) return;
      if (status.requestId && status.requestId !== requestId) return;
      if (!status.requestId && !status.focusSessionId && replied) return;
      replied = true;
      clearTimeout(timer);
      if (status.active === true) setState({ status: 'active' });
      else if (status.stopped === true) setState({ status: 'stopped' });
      else setState({ status: 'unavailable', message: (typeof status.reason === 'string' && Object.hasOwn(shieldErrors, status.reason) && shieldErrors[status.reason]) || 'Chrome could not activate Shield. Open the extension popup and reconnect this room.' });
    }

    window.addEventListener('message', onStatus);
    void (async () => {
      try {
        const blocker = await api.activateBlocker(sessionId, 'STRICT', AbortSignal.timeout(10_000));
        if (cancelled) return;
        if (!blocker.success || !blocker.blockerToken) throw new Error('Zenith could not authorize the Shield.');
        timer = setTimeout(() => {
          setState({ status: 'unavailable', message: 'Chrome did not respond. Open the extension popup and select Reconnect current focus room.' });
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

  return { ...state, desktopNeedsPermission, status: enabled ? state.status : 'off' as const, retry: () => setAttempt(value => value + 1) };
}

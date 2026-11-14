'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const shieldErrors: Record<string, string> = {
  room_changed: 'Chrome could not match this tab to the focus room. Reconnect from the extension popup.',
  session_inactive: 'Zenith did not confirm an active protected session. Retry Shield or start a new focus session.',
  session_expired: 'This focus session expired. Start a new session to enable Shield.',
  status_unreachable: 'The extension could not reach Zenith to verify this session. Check your connection, then retry.',
  rules_rejected: 'Chrome rejected the blocking rules. Check the extension’s Errors panel in chrome://extensions.',
  extension_error: 'Chrome could not verify the focus tab. Reload this Zenith tab or reconnect through the extension popup.',
  extension_reloaded: 'The extension was reloaded. Open its popup and select Reconnect current focus room.',
};

export function useRoomShield(sessionId: string | null, enabled: boolean, deadline: number | null) {
  const [attempt, setAttempt] = useState(0);
  const [desktopStatus, setDesktopStatus] = useState<'idle' | 'active' | 'setup_needed' | 'permission_required' | 'disconnected'>('idle');
  const [state, setState] = useState<{ status: 'checking' | 'active' | 'unavailable' | 'stopped'; message?: string }>({ status: 'checking' });

  useEffect(() => {
    if (!sessionId || !enabled || deadline === null) return;
    if (deadline <= Date.now()) {
      setState({ status: 'stopped' });
      return;
    }
    const origin = window.location.origin;
    const requestId = crypto.randomUUID();
    let cancelled = false;
    let replied = false;
    let expired = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setState({ status: 'checking' });
    setDesktopStatus('idle');

    function onStatus(event: MessageEvent) {
      if (expired || event.source !== window || event.origin !== origin) return;
      if (event.data?.type === 'ZENITH_DESKTOP_STATUS' && event.data.focusSessionId === sessionId) {
        const status = event.data.state;
        if (status === 'active' || status === 'setup_needed' || status === 'disconnected' || status === 'permission_required') setDesktopStatus(status);
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

    const stopAtDeadline = window.setTimeout(() => {
      expired = true;
      clearTimeout(timer);
      setState({ status: 'stopped' });
      window.postMessage({ type: 'ZENITH_ROOM_ENDED', focusSessionId: sessionId }, origin);
    }, deadline - Date.now());

    window.addEventListener('message', onStatus);
    void (async () => {
      try {
        const blocker = await api.activateBlocker(sessionId, 'BLOCK', AbortSignal.timeout(10_000));
        if (cancelled || expired) return;
        if (!blocker.success || !blocker.blockerToken) throw new Error('Zenith could not authorize the Shield.');
        timer = setTimeout(() => {
          setState({ status: 'unavailable', message: 'Chrome did not respond. Open the extension popup and select Reconnect current focus room.' });
        }, 6500);
        window.postMessage({
          type: 'ZENITH_BLOCKER_ACTIVATE', requestId, roomUrl: window.location.href,
          focusSessionId: sessionId, blockerToken: blocker.blockerToken, expiresAt: deadline,
        }, origin);
      } catch (error) {
        if (!cancelled && !expired) setState({ status: 'unavailable', message: error instanceof Error ? error.message : 'Zenith could not authorize the Shield.' });
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(stopAtDeadline);
      clearTimeout(timer);
      window.removeEventListener('message', onStatus);
    };
  }, [deadline, enabled, sessionId, attempt]);

  return { ...state, desktopStatus, status: enabled ? state.status : 'off' as const, retry: () => setAttempt(value => value + 1) };
}

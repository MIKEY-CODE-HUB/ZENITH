'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FocusStatus, FocusEvent } from '@/lib/types';

interface FocusTrackerOptions {
  sessionId?: string;
  shieldActive: boolean;
  idleThresholdSeconds: number;
  warningThresholdSeconds: number;
  trackKeyboardInactivity: boolean;
  showWarnings: boolean;
  onStatusChange?: (status: FocusStatus) => void;
}

const initialStats = {
  focusedSeconds: 0, distractedSeconds: 0, idleSeconds: 0,
  tabSwitchCount: 0, warningCount: 0, blockAttemptCount: 0,
  currentFocusStreak: 0, longestFocusStreak: 0,
};
type TrackerDraft = { stats: typeof initialStats; events: FocusEvent[] };

function readDraft(sessionId: string): TrackerDraft {
  try {
    const saved = sessionStorage.getItem(`zenith_tracking_${sessionId}`);
    if (saved) return JSON.parse(saved) as TrackerDraft;
  } catch {}
  return { stats: initialStats, events: [] };
}

export function useFocusTracker(options: FocusTrackerOptions) {
  const [stats, setStats] = useState(initialStats);
  const [warningMessage, setWarningMessage] = useState('');
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const events = useRef<FocusEvent[]>([]);
  const status = useRef<FocusStatus>('FOCUSED');
  const latestStats = useRef(stats);
  latestStats.current = stats;

  const transition = useCallback((next: FocusStatus) => {
    if (status.current === next) return;
    status.current = next;
    optionsRef.current.onStatusChange?.(next);
  }, []);

  useEffect(() => {
    const { sessionId } = options;
    if (!sessionId) return;
    const saved = readDraft(sessionId);
    events.current = saved.events;
    setStats({ ...saved.stats, currentFocusStreak: 0 });
    status.current = 'FOCUSED';
    setWarningMessage('');
    let lastInput = Date.now();
    let hiddenSince: number | null = null;
    let warned = false;
    let idleWarned = false;
    let lastDeparture = 0;
    let lastBlocked = { domain: '', timestamp: 0 };
    const saveDraft = () => {
      try {
        sessionStorage.setItem(`zenith_tracking_${sessionId}`, JSON.stringify({ stats: latestStats.current, events: events.current }));
      } catch {}
    };

    const record = (eventType: FocusEvent['eventType'], metadata?: object) => {
      if (events.current.length < 1000) {
        events.current.push({
          eventType, startTime: new Date().toISOString(), duration: 0,
          metadata: metadata && JSON.stringify(metadata),
        });
      }
    };
    const activity = () => {
      lastInput = Date.now();
      if (status.current === 'IDLE') {
        idleWarned = false;
        transition('FOCUSED');
        record('FOCUSED');
      }
    };
    const departure = () => {
      const now = Date.now();
      if (now - lastDeparture > 1500) {
        record('TAB_SWITCH');
        setStats(previous => ({ ...previous, tabSwitchCount: previous.tabSwitchCount + 1 }));
      }
      lastDeparture = now;
    };
    const warn = (message: string, metadata?: object) => {
      record('WARNING', metadata);
      setStats(previous => ({ ...previous, warningCount: previous.warningCount + 1 }));
      setWarningMessage(message);
    };
    const checkAwayWarning = (now: number) => {
      const settings = optionsRef.current;
      if (hiddenSince === null || warned || settings.shieldActive || !settings.showWarnings ||
          now - hiddenSince < settings.warningThresholdSeconds * 1000) return;
      warned = true;
      warn('You were away from your focus session.');
    };
    const visibility = () => {
      if (document.hidden || !document.hasFocus()) {
        if (hiddenSince !== null) return;
        hiddenSince = Date.now();
        warned = false;
        if (!optionsRef.current.shieldActive) departure();
        transition(optionsRef.current.shieldActive ? 'OFFLINE' : 'DISTRACTED');
      } else if (hiddenSince !== null) {
        const now = Date.now();
        checkAwayWarning(now);
        hiddenSince = null;
        lastInput = now;
        idleWarned = false;
        record('WINDOW_FOCUS');
        transition('FOCUSED');
      }
    };
    const interception = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== location.origin || !optionsRef.current.shieldActive) return;
      const data = event.data;
      if (data?.focusSessionId && data.focusSessionId !== optionsRef.current.sessionId) return;
      const desktop = data?.type === 'ZENITH_DESKTOP_DISTRACTION';
      if (!desktop && data?.type !== 'ZENITH_DISTRACTION_ATTEMPT') return;
      const label = desktop ? data.app : data.domain;
      if (typeof label !== 'string' || (desktop ? !label.trim() || label.length > 100 : !/^[a-z0-9.-]{1,253}$/i.test(label))) return;
      const now = Date.now();
      if (lastBlocked.domain === label && now - lastBlocked.timestamp < 1500) return;
      lastBlocked = { domain: label, timestamp: now };
      const metadata = desktop ? { app: label } : { domain: label };
      departure();
      record('BLOCK_ATTEMPT', metadata);
      setStats(previous => ({ ...previous, blockAttemptCount: previous.blockAttemptCount + 1 }));
      if (optionsRef.current.showWarnings) {
        warned = true;
        warn(`The Shield blocked ${label}.`, metadata);
      }
    };
    const interval = window.setInterval(() => {
      const now = Date.now();
      const settings = optionsRef.current;
      checkAwayWarning(now);
      if (hiddenSince === null && settings.trackKeyboardInactivity) {
        if (status.current === 'FOCUSED' && now - lastInput >= settings.idleThresholdSeconds * 1000) {
          transition('IDLE');
          record('IDLE');
        }
        if (status.current === 'IDLE' && !idleWarned && settings.showWarnings &&
            now - lastInput >= (settings.idleThresholdSeconds + settings.warningThresholdSeconds) * 1000) {
          idleWarned = true;
          warn('Still working? Return to your focus session when you’re ready.');
        }
      }
      const current = status.current;
      setStats(previous => {
        const streak = current === 'FOCUSED' ? previous.currentFocusStreak + 1 : 0;
        return {
          ...previous,
          focusedSeconds: previous.focusedSeconds + Number(current === 'FOCUSED'),
          distractedSeconds: previous.distractedSeconds + Number(current === 'DISTRACTED'),
          idleSeconds: previous.idleSeconds + Number(current === 'IDLE'),
          currentFocusStreak: streak,
          longestFocusStreak: Math.max(streak, previous.longestFocusStreak),
        };
      });
    }, 1000);
    for (const event of ['pointermove', 'pointerdown', 'keydown', 'touchstart']) window.addEventListener(event, activity);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('blur', visibility);
    window.addEventListener('focus', visibility);
    window.addEventListener('message', interception);
    window.addEventListener('pagehide', saveDraft);
    const saveTimer = window.setInterval(saveDraft, 5000);
    visibility();
    return () => {
      clearInterval(interval);
      clearInterval(saveTimer);
      for (const event of ['pointermove', 'pointerdown', 'keydown', 'touchstart']) window.removeEventListener(event, activity);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('blur', visibility);
      window.removeEventListener('focus', visibility);
      window.removeEventListener('message', interception);
      window.removeEventListener('pagehide', saveDraft);
    };
  }, [options.sessionId, transition]);

  return {
    ...stats,
    warningMessage,
    dismissWarning: () => setWarningMessage(''),
    getEvents: () => events.current,
  };
}

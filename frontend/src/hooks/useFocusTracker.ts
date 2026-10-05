'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FocusStatus, FocusEvent } from '@/lib/types';
import { api } from '@/lib/api';

interface FocusTrackerOptions {
  sessionId?: string;
  idleThresholdSeconds?: number;
  isActiveSession?: boolean;
  onStatusChange?: (status: FocusStatus) => void;
  onDistractionStart?: () => void;
  onDistractionEnd?: (duration: number) => void;
}

// Simple Web Audio API synthesized alert beep
function playAlertChime() {
  try {
    if (typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {}
}

export function useFocusTracker({
  sessionId,
  idleThresholdSeconds = 60,
  isActiveSession = true,
  onStatusChange,
  onDistractionStart,
  onDistractionEnd,
}: FocusTrackerOptions = {}) {
  const [focusStatus, setFocusStatus] = useState<FocusStatus>('FOCUSED');
  const [focusedSeconds, setFocusedSeconds] = useState(0);
  const [distractedSeconds, setDistractedSeconds] = useState(0);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [currentFocusStreak, setCurrentFocusStreak] = useState(0);
  const [longestFocusStreak, setLongestFocusStreak] = useState(0);

  // Freeze & Warning Overlay State
  const [isFrozen, setIsFrozen] = useState(false);
  const [lastDistractionDuration, setLastDistractionDuration] = useState(0);
  const [warningMessage, setWarningMessage] = useState<string>('');

  const lastActivityTimeRef = useRef<number>(Date.now());
  const distractionStartTimeRef = useRef<number | null>(null);
  const currentStatusRef = useRef<FocusStatus>('FOCUSED');
  const eventsQueueRef = useRef<FocusEvent[]>([]);

  const updateStatus = useCallback(
    (newStatus: FocusStatus) => {
      if (currentStatusRef.current !== newStatus) {
        currentStatusRef.current = newStatus;
        setFocusStatus(newStatus);
        if (onStatusChange) onStatusChange(newStatus);
      }
    },
    [onStatusChange]
  );

  // Trigger Instant Focus Broken State
  const triggerFocusBroken = useCallback((reason?: string) => {
    updateStatus('DISTRACTED');
    setTabSwitchCount((prev) => prev + 1);
    setWarningCount((prev) => prev + 1);
    setIsFrozen(true);
    playAlertChime();
    setWarningMessage(reason || "You attempted to switch away from your session. ZENITH pulled you back.");

    eventsQueueRef.current.push({
      eventType: 'TAB_SWITCH',
      startTime: new Date().toISOString(),
      duration: 0,
      metadata: JSON.stringify({ reason: reason || 'Instant snap-back triggered' }),
    });

    if (sessionId) {
      api.recordBlockerAttempt({
        sessionId,
        resourceType: 'WEBSITE',
        resourceIdentifier: reason || 'External Tab Navigation Attempt',
        action: 'BLOCKED',
      }).catch(() => {});
    }
  }, [updateStatus, sessionId]);

  // Tab visibility and Extension message handlers
  useEffect(() => {
    if (!isActiveSession) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        distractionStartTimeRef.current = Date.now();
        triggerFocusBroken('Left ZENITH focus tab.');
      } else {
        if (distractionStartTimeRef.current) {
          distractionStartTimeRef.current = null;
        }
      }
    };

    const handleWindowBlur = () => {
      triggerFocusBroken('Window lost focus.');
    };

    // Listen for extension message
    const handleExtensionMessage = (event: MessageEvent) => {
      if (event.data && (event.data.type === 'ZENITH_FOCUS_BROKEN' || event.data.type === 'ZENITH_DISTRACTION_ATTEMPT')) {
        triggerFocusBroken(event.data.reason || 'Extension detected tab switch away from ZENITH.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('message', handleExtensionMessage);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('message', handleExtensionMessage);
    };
  }, [isActiveSession, triggerFocusBroken]);

  // Main 1-second clock loop
  useEffect(() => {
    if (!isActiveSession) return;

    const interval = setInterval(() => {
      const current = currentStatusRef.current;
      if (current === 'FOCUSED' && !isFrozen) {
        setFocusedSeconds((prev) => {
          const next = prev + 1;
          setCurrentFocusStreak((streak) => {
            const nextStreak = streak + 1;
            setLongestFocusStreak((longest) => Math.max(longest, nextStreak));
            return nextStreak;
          });
          return next;
        });
      } else if (current === 'DISTRACTED' || isFrozen) {
        setDistractedSeconds((prev) => prev + 1);
        setCurrentFocusStreak(0);
      } else if (current === 'IDLE') {
        setIdleSeconds((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActiveSession, isFrozen]);

  const returnToRoom = () => {
    setIsFrozen(false);
    lastActivityTimeRef.current = Date.now();
    updateStatus('FOCUSED');
  };

  return {
    focusStatus,
    focusedSeconds,
    distractedSeconds,
    idleSeconds,
    tabSwitchCount,
    warningCount,
    currentFocusStreak,
    longestFocusStreak,
    isFrozen,
    lastDistractionDuration,
    warningMessage,
    returnToRoom,
    eventsQueue: eventsQueueRef.current,
  };
}

'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldCheck, ArrowLeft, Lock, Clock, Flame, Sparkles, Disc, Radio } from 'lucide-react';
import { formatSeconds } from '@/lib/utils';

function BlockedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const domainParam = searchParams.get('domain') || '';
  const urlParam = searchParams.get('url') || '';
  const roomParam = searchParams.get('room') || '';

  const [activeSession, setActiveSession] = useState<any>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [attemptCount, setAttemptCount] = useState<number>(1);
  const [displayDomain, setDisplayDomain] = useState<string>(domainParam || 'This website');
  const [countdown, setCountdown] = useState<number>(3);

  // Format domain nicely
  useEffect(() => {
    if (domainParam) {
      setDisplayDomain(domainParam.replace(/^www\./, ''));
    } else if (urlParam) {
      try {
        const u = new URL(urlParam);
        setDisplayDomain(u.hostname.replace(/^www\./, ''));
      } catch (e) {
        setDisplayDomain('This website');
      }
    }
  }, [domainParam, urlParam]);

  // Fetch live session data & poll timer
  useEffect(() => {
    let timer: NodeJS.Timeout;

    async function checkStatus() {
      try {
        const res = await fetch('/api/blocker/live-status').catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          if (data.active) {
            setActiveSession(data);
            if (data.startedAt) {
              const start = new Date(data.startedAt).getTime();
              const now = Date.now();
              setElapsedSeconds(Math.max(0, Math.floor((now - start) / 1000)));
            }
          }
        }
      } catch (e) {}

      try {
        const statsRes = await fetch('/api/blocker/statistics').catch(() => null);
        if (statsRes && statsRes.ok) {
          const s = await statsRes.json();
          if (s.success && s.stats) {
            setAttemptCount(s.stats.attemptsToday || 1);
          }
        }
      } catch (e) {}
    }

    checkStatus();
    timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleReturn = useCallback(() => {
    // Notify extension to snap back immediately
    if (typeof window !== 'undefined') {
      window.postMessage({ type: 'ZENITH_SNAP_BACK' }, '*');
    }

    if (roomParam) {
      window.location.replace(roomParam);
      return;
    }
    if (activeSession && activeSession.sessionId) {
      router.push(`/focus/${activeSession.sessionId}`);
      return;
    }
    router.push('/dashboard');
  }, [roomParam, activeSession, router]);

  // Automatic snap-back countdown (strictly 3 seconds)
  useEffect(() => {
    const cd = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(cd);
          handleReturn();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(cd);
  }, [handleReturn]);

  return (
    <div className="min-h-screen bg-[#07080c] text-zinc-100 flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Immersive Atmospheric Ambient Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.06)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-600/10 rounded-full blur-[100px] pointer-events-none" />

      <main className="w-full max-w-lg relative z-10">
        <div className="p-8 sm:p-10 rounded-3xl bg-[#10121a]/90 border border-white/[0.1] shadow-2xl backdrop-blur-2xl text-center space-y-6 relative overflow-hidden">
          {/* Subtle Top Ambient Accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-400" />

          {/* Shield Icon Badge with Atmospheric Ring */}
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-xl animate-pulse" />
            <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-inner">
              <ShieldCheck className="h-8 w-8" />
            </div>
          </div>

          {/* Heading & Notice */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11px] font-bold tracking-wider uppercase">
              <Lock className="h-3 w-3" />
              <span>Focus Protected</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white capitalize">
              {displayDomain} is blocked
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-sm mx-auto leading-relaxed">
              This site is blocked during your active focus room. You committed to deep work: Zenith is holding the line for you.
            </p>
          </div>

          {/* Live Telemetry / Session Stats */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
            <div className="space-y-1 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-zinc-400 font-medium">
                <Clock className="h-3.5 w-3.5 text-emerald-400" />
                <span>Focus Time</span>
              </div>
              <p className="text-xl font-bold text-white font-mono">
                {formatSeconds(elapsedSeconds)}
              </p>
              <p className="text-[10px] text-zinc-500">Session in progress</p>
            </div>

            <div className="space-y-1 text-center border-l border-white/[0.06]">
              <div className="flex items-center justify-center gap-1 text-[11px] text-zinc-400 font-medium">
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                <span>Distraction Attempts</span>
              </div>
              <p className="text-xl font-bold text-white font-mono">
                {attemptCount}
              </p>
              <p className="text-[10px] text-zinc-500">Intercepted by shield</p>
            </div>
          </div>

          {/* Snap-Back Countdown Strip */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium flex items-center justify-center gap-2">
            <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            <span>Pulling you back to your study room in <strong>{countdown}s</strong>...</span>
          </div>

          {/* Action CTA */}
          <div className="space-y-3 pt-1">
            <button
              onClick={handleReturn}
              className="w-full py-4 px-6 rounded-2xl bg-white text-zinc-950 font-bold text-sm hover:bg-zinc-100 transition-all shadow-xl shadow-white/10 flex items-center justify-center gap-2 group active:scale-[0.98]"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              <span>Return to Focus Room Now</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function BlockedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07080c] flex items-center justify-center text-zinc-400 text-xs">
          Loading protected focus screen...
        </div>
      }
    >
      <BlockedContent />
    </Suspense>
  );
}

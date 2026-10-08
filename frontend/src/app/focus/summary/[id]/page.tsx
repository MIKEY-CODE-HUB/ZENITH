'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { FocusSession, ScoreBreakdown } from '@/lib/types';
import { formatSeconds } from '@/lib/utils';
import { ScoreBreakdownCard } from '@/components/ScoreBreakdownCard';
import { SessionTimelineView } from '@/components/SessionTimelineView';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Flame,
  Clock,
  Radio,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Star,
} from 'lucide-react';

export default function SessionSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<FocusSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      try {
        setLoading(true);
        const res = await api.getSession(sessionId);
        if (res.success && res.session) {
          setSession(res.session);

          if (res.session.focusScore >= 75) {
            confetti({
              particleCount: 120,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#10B981', '#06B6D4', '#6366F1', '#F59E0B'],
            });
          }
        }
      } catch (err: any) {
        setError(err.message || 'Session not found');
      } finally {
        setLoading(false);
      }
    }

    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#09090b]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <p className="text-xs text-zinc-400 font-medium">Calculating session summary...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[#09090b]">
        <div className="rounded-xl bg-[#121215] border border-white/[0.08] p-6 max-w-sm text-center space-y-3">
          <p className="text-xs font-medium text-rose-400">Session not found</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-3.5 py-1.5 bg-white text-zinc-950 rounded-lg text-xs font-semibold hover:bg-zinc-100 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const scoreBreakdown: ScoreBreakdown = {
    baseScore: session.baseScore,
    tabSwitchPenalty: Math.round(Math.max(0, session.tabSwitchCount - 1) * 2.5 * 10) / 10,
    distractionPenalty: Math.round((session.distractedDuration / 30) * 10) / 10,
    idlePenalty: Math.round((Math.max(0, session.idleDuration - 120) / 60) * 1.5 * 10) / 10,
    warningPenalty: session.warningCount * 2.0,
    blockAttemptPenalty: Math.round(Math.max(0, (session.blockAttemptCount || 0) - 1) * 1.0 * 10) / 10,
    totalPenalty: session.penaltyScore,
    finalScore: session.focusScore,
    grade:
      session.focusScore >= 90
        ? 'A+'
        : session.focusScore >= 80
        ? 'A'
        : session.focusScore >= 70
        ? 'B'
        : session.focusScore >= 55
        ? 'C'
        : 'D',
    focusRate: Math.round(
      (session.focusedDuration /
        Math.max(1, session.focusedDuration + session.distractedDuration + session.idleDuration)) *
        100
    ),
  };

  const blockAttemptsCount = session.blockAttemptCount || (session.blockAttempts?.length || 0);

  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-4xl mx-auto p-5 sm:p-8 space-y-6 bg-[#09090b] text-zinc-100">
      {/* 1. Header Banner */}
      <div className="text-center space-y-2 border-b border-white/[0.06] pb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-xs font-medium">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span>Session Completed</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
          Session Summary
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400">
          {session.activityType} • {session.plannedDuration}m Planned • {session.room?.name || 'Solo Focus'}
        </p>

        {/* Points Earned Banner */}
        <div className="pt-2 flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-semibold text-sm">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span>+{session.pointsEarned ?? 0} points earned</span>
            <span className="text-xs font-normal text-amber-200/80">• Added to your weekly balance</span>
          </div>
        </div>
      </div>

      {/* Honest Transparency Notice */}
      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center text-xs text-zinc-400">
        &ldquo;Focus Score is an estimate based on measurable session signals. It is not a direct measurement of attention.&rdquo;
      </div>

      {/* 2. Motivational Blocker Insight */}
      {blockAttemptsCount > 0 && (
        <div className="p-4 rounded-xl bg-[#121215] border border-white/[0.08] flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-left">
            <h3 className="text-xs font-semibold text-white">
              {blockAttemptsCount} Distraction {blockAttemptsCount === 1 ? 'Attempt' : 'Attempts'} Intercepted
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              External redirects were blocked and kept you anchored to your session.
            </p>
          </div>
        </div>
      )}

      {/* 3. Core Score Breakdown Card */}
      <ScoreBreakdownCard
        breakdown={scoreBreakdown}
        focusStreak={session.longestFocusStreak}
      />

      {/* 4. Session Timeline Visualization */}
      <div className="rounded-xl bg-[#121215] border border-white/[0.07] p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <h2 className="text-xs font-semibold text-white">Session Timeline Breakdown</h2>
          <span className="text-xs text-zinc-500 font-mono">00:00 → {session.plannedDuration}:00</span>
        </div>
        <SessionTimelineView
          plannedDurationMinutes={session.plannedDuration}
          events={session.events || []}
          focusedDurationSeconds={session.focusedDuration}
          distractedDurationSeconds={session.distractedDuration}
          idleDurationSeconds={session.idleDuration}
        />
      </div>

      {/* 5. Next Steps CTAs */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          onClick={() => router.push('/rooms')}
          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-white/[0.06] transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Join Another Room</span>
        </button>

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-100 transition-colors shadow-sm"
        >
          <span>Dashboard</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

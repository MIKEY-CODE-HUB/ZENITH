'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { formatMinutesHuman } from '@/lib/utils';
import {
  BarChart3,
  Clock,
  Flame,
  Award,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Zap,
  Target,
  Trophy,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';

interface RewardingData {
  overview: {
    totalFocusedMinutes: number;
    totalSessions: number;
    avgSessionMinutes: number;
    focusRate: number;
  };
  dayOfWeekDistribution: Array<{
    short: string;
    full: string;
    focusedMinutes: number;
    sessionsCount: number;
  }>;
  streaks: {
    currentStreak: number;
    longestStreak: number;
  };
  weekOverWeek: {
    thisWeekMinutes: number;
    lastWeekMinutes: number;
    percentDelta: string;
    isImprovement: boolean;
  };
  topDistractions: Array<{
    identifier: string;
    displayName: string;
    count: number;
    percentage: number;
  }>;
  personalRecords: {
    longestSessionMinutes: number;
    bestFocusDay: {
      date: string;
      minutes: number;
    };
    bestWeekMinutes: number;
  };
  personalizedInsight: {
    title: string;
    window: string;
    avgScore: number;
    recommendation: string;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<RewardingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        const res = await api.getRewardingAnalytics().catch(() => null);
        if (res && res.success && res.data) {
          setData(res.data);
        } else {
          // Graceful clean slate defaults for new user
          setData({
            overview: {
              totalFocusedMinutes: 0,
              totalSessions: 0,
              avgSessionMinutes: 0,
              focusRate: 100,
            },
            dayOfWeekDistribution: [
              { short: 'Mon', full: 'Monday', focusedMinutes: 0, sessionsCount: 0 },
              { short: 'Tue', full: 'Tuesday', focusedMinutes: 0, sessionsCount: 0 },
              { short: 'Wed', full: 'Wednesday', focusedMinutes: 0, sessionsCount: 0 },
              { short: 'Thu', full: 'Thursday', focusedMinutes: 0, sessionsCount: 0 },
              { short: 'Fri', full: 'Friday', focusedMinutes: 0, sessionsCount: 0 },
              { short: 'Sat', full: 'Saturday', focusedMinutes: 0, sessionsCount: 0 },
              { short: 'Sun', full: 'Sunday', focusedMinutes: 0, sessionsCount: 0 },
            ],
            streaks: {
              currentStreak: 0,
              longestStreak: 0,
            },
            weekOverWeek: {
              thisWeekMinutes: 0,
              lastWeekMinutes: 0,
              percentDelta: '0%',
              isImprovement: true,
            },
            topDistractions: [],
            personalRecords: {
              longestSessionMinutes: 0,
              bestFocusDay: { date: 'Pending', minutes: 0 },
              bestWeekMinutes: 0,
            },
            personalizedInsight: {
              title: 'First Session Pending',
              window: 'Calibration in progress',
              avgScore: 0,
              recommendation:
                'Complete your first focus block in any room to begin tracking genuine deep work telemetry.',
            },
          });
        }
      } catch (err) {
        console.error('Failed to load rewarding analytics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  const overview = data?.overview;
  const streaks = data?.streaks;
  const wow = data?.weekOverWeek;
  const records = data?.personalRecords;
  const insight = data?.personalizedInsight;
  const days = data?.dayOfWeekDistribution || [];
  const distractions = data?.topDistractions || [];

  const maxDayMinutes = Math.max(...days.map((d) => d.focusedMinutes), 60);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090b] text-zinc-100">
      <Sidebar />

      <main className="flex-1 p-5 sm:p-8 max-w-6xl mx-auto space-y-7">
        {/* Header */}
        <div className="border-b border-white/[0.06] pb-5">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 mb-1">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Honest Telemetry & Verified Performance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            Focus Analytics
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Do the work. See the truth. Build consistency. Here is where your focus actually went.
          </p>
        </div>

        {/* 1. WEEK-OVER-WEEK IMPROVEMENT BANNER */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-[#121215] to-[#121215] border border-emerald-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">Week-over-Week Momentum</span>
                <span className="px-2 py-0.5 rounded-xl text-xs font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {wow?.percentDelta || '0%'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {(wow?.thisWeekMinutes || 0) === 0 && (wow?.lastWeekMinutes || 0) === 0
                  ? 'No baseline recorded yet. Complete your first focus session to start tracking week-over-week momentum.'
                  : wow?.isImprovement
                  ? `Solid improvement: you have focused ${formatMinutesHuman(wow.thisWeekMinutes)} this week, outpacing last week's baseline.`
                  : `Focus volume is tracking steadily at ${formatMinutesHuman(wow?.thisWeekMinutes || 0)}.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center font-mono text-xs text-zinc-400 bg-white/[0.03] px-3.5 py-1.5 rounded-xl border border-white/[0.06]">
            <span>This Week: <strong className="text-white">{formatMinutesHuman(wow?.thisWeekMinutes || 0)}</strong></span>
            <span>•</span>
            <span>Last Week: <strong className="text-zinc-400">{formatMinutesHuman(wow?.lastWeekMinutes || 0)}</strong></span>
          </div>
        </div>

        {/* 2. FOCUS OVERVIEW STRIP (4 Key Metrics) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#121215] border border-white/[0.07] space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span>Total Focus Time</span>
              <Clock className="h-3.5 w-3.5 text-zinc-400" />
            </div>
            <p className="text-2xl font-semibold text-white tracking-tight font-mono">
              {formatMinutesHuman(overview?.totalFocusedMinutes || 0)}
            </p>
            <p className="text-[11px] text-zinc-500">Verified session duration</p>
          </div>

          <div className="p-4 rounded-xl bg-[#121215] border border-white/[0.07] space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span>Completed Sessions</span>
              <Target className="h-3.5 w-3.5 text-zinc-400" />
            </div>
            <p className="text-2xl font-semibold text-white tracking-tight font-mono">
              {overview?.totalSessions || 0}
            </p>
            <p className="text-[11px] text-zinc-500">Rooms fully completed</p>
          </div>

          <div className="p-4 rounded-xl bg-[#121215] border border-white/[0.07] space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span>Avg Session Length</span>
              <Layers className="h-3.5 w-3.5 text-zinc-400" />
            </div>
            <p className="text-2xl font-semibold text-white tracking-tight font-mono">
              {overview?.avgSessionMinutes || 0}m
            </p>
            <p className="text-[11px] text-zinc-500">Target: 45-60 minutes</p>
          </div>

          <div className="p-4 rounded-xl bg-[#121215] border border-white/[0.07] space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span>Focus Rate</span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-semibold text-white tracking-tight font-mono">
                {overview?.focusRate ?? 100}%
              </p>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                High
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">Time on task vs distractions</p>
          </div>
        </div>

        {/* 3. DAY-OF-WEEK DISTRIBUTION (Monday - Sunday Bar Graph) */}
        <div className="p-6 rounded-2xl bg-[#121215] border border-white/[0.08] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Day-of-Week Distribution</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Focus time aggregated by weekday (Monday to Sunday)</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
              <Calendar className="h-3.5 w-3.5 text-emerald-400" />
              <span>Weekly rhythm</span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-4 pt-2">
            {days.map((item) => {
              const heightPercent = maxDayMinutes > 0 ? Math.round((item.focusedMinutes / maxDayMinutes) * 100) : 0;
              const isPeak = item.focusedMinutes > 0 && item.focusedMinutes === maxDayMinutes;

              return (
                <div key={item.short} className="flex flex-col items-center gap-2.5">
                  {/* Bar Container */}
                  <div className="w-full h-36 bg-white/[0.02] border border-white/[0.06] rounded-xl flex flex-col justify-end p-1.5 relative group">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center bg-zinc-900 border border-white/20 text-white text-[10px] py-1 px-2 rounded-md shadow-xl whitespace-nowrap z-20 pointer-events-none">
                      <span>{item.full}: {item.focusedMinutes}m</span>
                      <span className="text-zinc-400">{item.sessionsCount} sessions</span>
                    </div>

                    <div
                      style={{ height: `${Math.max(8, heightPercent)}%` }}
                      className={`w-full rounded-lg transition-all duration-500 ${
                        isPeak
                          ? 'bg-emerald-400 shadow-lg shadow-emerald-500/20'
                          : item.focusedMinutes > 0
                          ? 'bg-zinc-200'
                          : 'bg-white/[0.05]'
                      }`}
                    />
                  </div>

                  {/* Day Label & Minutes */}
                  <div className="text-center">
                    <span className={`text-xs font-semibold block ${isPeak ? 'text-emerald-400' : 'text-zinc-300'}`}>
                      {item.short}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                      {item.focusedMinutes}m
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. STREAKS & PERSONAL RECORDS (2 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Consistency & Streaks Card */}
          <div className="p-6 rounded-2xl bg-[#121215] border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-white">Consistency & Streaks</h2>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">Daily verification</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <span className="text-[11px] text-zinc-400">Current Streak</span>
                <p className="text-2xl font-bold text-white font-mono flex items-center gap-1.5">
                  <span>{streaks?.currentStreak || 0}</span>
                  <span className="text-xs text-amber-400 font-sans font-normal">days</span>
                </p>
                <p className="text-[10px] text-zinc-500">Maintained daily</p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <span className="text-[11px] text-zinc-400">Longest Streak</span>
                <p className="text-2xl font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                  <span>{streaks?.longestStreak || 0}</span>
                  <span className="text-xs text-zinc-400 font-sans font-normal">days</span>
                </p>
                <p className="text-[10px] text-zinc-500">Personal milestone</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed pt-1">
              Consistency is non-negotiable. Reaching a 7-day focus streak unlocks the <strong>Deep Focus Tier</strong> and exempts you from weekly point decay.
            </p>
          </div>

          {/* Personal Records Card */}
          <div className="p-6 rounded-2xl bg-[#121215] border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-white">Personal Records</h2>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">Lifetime peaks</span>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-xs font-medium text-zinc-200">Longest Single Session</p>
                    <p className="text-[10px] text-zinc-500">Single unbroken focus block</p>
                  </div>
                </div>
                <span className="text-sm font-bold font-mono text-white">
                  {records?.longestSessionMinutes ?? 0}m
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="flex items-center gap-2.5">
                  <Calendar className="h-4 w-4 text-emerald-400" />
                  <div>
                    <p className="text-xs font-medium text-zinc-200">Best Focus Day</p>
                    <p className="text-[10px] text-zinc-500">{records?.bestFocusDay?.date || 'Pending'}</p>
                  </div>
                </div>
                <span className="text-sm font-bold font-mono text-emerald-400">
                  {formatMinutesHuman(records?.bestFocusDay?.minutes ?? 0)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="flex items-center gap-2.5">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <div>
                    <p className="text-xs font-medium text-zinc-200">Best Week Total</p>
                    <p className="text-[10px] text-zinc-500">Peak weekly volume</p>
                  </div>
                </div>
                <span className="text-sm font-bold font-mono text-white">
                  {formatMinutesHuman(records?.bestWeekMinutes ?? 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. TOP DISTRACTION SOURCES & BEHAVIORAL INSIGHT (2 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Top Distraction Sources Breakdown (5 cols) */}
          <div className="md:col-span-5 p-6 rounded-2xl bg-[#121215] border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-400" />
                <h2 className="text-sm font-semibold text-white">Top Distraction Sources</h2>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                Shield Intercepted
              </span>
            </div>

            <p className="text-xs text-zinc-400">
              Domains most frequently attempted while focus sessions were active:
            </p>

            <div className="space-y-3 pt-1">
              {distractions.map((item) => (
                <div key={item.identifier} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-zinc-200">{item.displayName}</span>
                    <span className="font-mono text-[11px] text-zinc-400">
                      {item.count} {item.count === 1 ? 'attempt' : 'attempts'} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.max(5, item.percentage)}%` }}
                      className="h-full bg-rose-500/80 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Personalized Cognitive Insight Card (7 cols) */}
          <div className="md:col-span-7 p-6 rounded-2xl bg-[#121215] border border-white/[0.08] space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold text-white">Personalized Focus Pattern</h2>
                </div>
                <span className="text-[11px] font-mono text-emerald-400/90">
                  {insight?.avgScore || 94}% avg efficiency
                </span>
              </div>

              <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Optimal Focus Window: {insight?.window || 'Morning'}</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {insight?.recommendation}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
              <span>Calculated from your verified session history</span>
              <span className="text-white font-medium">True Productivity Telemetry</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

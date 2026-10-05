'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { FocusSession } from '@/lib/types';
import { formatDate, formatSeconds, formatDurationHuman } from '@/lib/utils';
import { History, Clock, Flame, ArrowRight, Filter, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState('All');

  const activities = ['All', 'Coding', 'Study', 'Work', 'Creative', 'Reading', 'Gym', 'Other'];

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.getHistory({
        activity: selectedActivity,
        limit: 50,
      });
      if (res.success && res.sessions) {
        setSessions(res.sessions);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedActivity]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090b] text-zinc-100">
      <Sidebar />

      <main className="flex-1 p-5 sm:p-8 max-w-7xl mx-auto space-y-6">
        <div className="border-b border-white/[0.06] pb-6">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1">
            <History className="h-3.5 w-3.5 text-zinc-400" />
            <span>Archive</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            Session History
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Complete record of past focus sessions, behavioral timelines, and calculated scores.
          </p>
        </div>

        {/* Activity Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {activities.map((act) => (
            <button
              key={act}
              onClick={() => setSelectedActivity(act)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedActivity === act
                  ? 'bg-white text-zinc-950 shadow-sm'
                  : 'bg-white/[0.03] text-zinc-400 border border-white/[0.06] hover:text-zinc-200 hover:bg-white/[0.05]'
              }`}
            >
              {act}
            </button>
          ))}
        </div>

        {/* Sessions Table / Cards */}
        {loading ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-[#121215]/60 border border-white/[0.06] animate-pulse" />
            ))}
          </div>
        ) : sessions.length > 0 ? (
          <div className="rounded-xl bg-[#121215] border border-white/[0.07] overflow-hidden divide-y divide-white/[0.05]">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => router.push(`/focus/summary/${session.id}`)}
                className="p-4 sm:p-5 hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-10 w-10 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-center font-mono font-medium text-xs text-zinc-300 group-hover:border-white/20 transition-colors">
                    {session.activityType.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white group-hover:text-zinc-200 transition-colors">
                      {session.room?.name || `${session.activityType} Solo Session`}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {formatDate(session.startTime)} • Planned: {session.plannedDuration}m
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 text-left sm:text-right">
                  <div className="space-y-0.5 font-mono text-xs">
                    <p className="text-emerald-400 font-medium">
                      Focused: {formatSeconds(session.focusedDuration)}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Distracted: {formatSeconds(session.distractedDuration)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-white font-mono text-xs font-semibold">
                      {session.focusScore}%
                    </div>
                    <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-zinc-200 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 rounded-xl bg-[#121215] border border-white/[0.07] text-center space-y-2">
            <p className="text-xs text-zinc-400">No session history found for this category filter.</p>
          </div>
        )}
      </main>
    </div>
  );
}

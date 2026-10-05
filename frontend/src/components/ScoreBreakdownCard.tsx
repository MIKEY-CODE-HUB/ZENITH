'use client';

import React from 'react';
import { ScoreBreakdown } from '@/lib/types';
import { Award, ShieldCheck, AlertCircle, Flame } from 'lucide-react';

interface ScoreBreakdownCardProps {
  breakdown: ScoreBreakdown;
  focusStreak?: number;
}

export function ScoreBreakdownCard({ breakdown, focusStreak }: ScoreBreakdownCardProps) {
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
      case 'B':
        return 'text-zinc-200 bg-white/[0.05] border-white/10';
      case 'C':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/25';
      default:
        return 'text-rose-400 bg-rose-500/10 border-rose-500/25';
    }
  };

  return (
    <div className="rounded-xl bg-[#121215] border border-white/[0.08] p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-white/[0.04] text-zinc-300 border border-white/[0.08]">
            <Award className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white">Score Calculation</h3>
            <p className="text-[11px] text-zinc-400">Telemetry-based scoring model</p>
          </div>
        </div>

        <div className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${getGradeColor(breakdown.grade)}`}>
          Grade {breakdown.grade}
        </div>
      </div>

      {/* Scoring Flow Items */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
          <span className="text-zinc-300">Base Focus Score (Focus Time / Target)</span>
          <span className="font-mono font-semibold text-white">+{breakdown.baseScore}</span>
        </div>

        {breakdown.tabSwitchPenalty > 0 && (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-500/[0.04] border border-rose-500/20 text-rose-400">
            <span>Tab-Switch Interruption Penalty</span>
            <span className="font-mono font-semibold">-{breakdown.tabSwitchPenalty}</span>
          </div>
        )}

        {breakdown.distractionPenalty > 0 && (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-500/[0.04] border border-rose-500/20 text-rose-400">
            <span>Away / Background Tab Time Penalty</span>
            <span className="font-mono font-semibold">-{breakdown.distractionPenalty}</span>
          </div>
        )}

        {breakdown.idlePenalty > 0 && (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/[0.04] border border-amber-500/20 text-amber-400">
            <span>Prolonged Inactivity Penalty</span>
            <span className="font-mono font-semibold">-{breakdown.idlePenalty}</span>
          </div>
        )}

        {breakdown.warningPenalty > 0 && (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/[0.04] border border-amber-500/20 text-amber-400">
            <span>Distraction Warning Triggers</span>
            <span className="font-mono font-semibold">-{breakdown.warningPenalty}</span>
          </div>
        )}

        <div className="pt-2 border-t border-white/[0.06]" />

        <div className="flex items-center justify-between p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.08]">
          <div>
            <p className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">Final Focus Score</p>
            <p className="text-xs text-zinc-400 mt-0.5">Verified server calculation</p>
          </div>
          <span className="text-2xl font-semibold text-white font-mono">{breakdown.finalScore}%</span>
        </div>
      </div>
    </div>
  );
}

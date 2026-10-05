'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface WeeklyChartProps {
  data: {
    day: string;
    date: string;
    focusedMinutes: number;
    distractedMinutes: number;
    focusScore: number;
  }[];
}

export function WeeklyFocusChart({ data }: WeeklyChartProps) {
  return (
    <div className="w-full rounded-2xl bg-[#121215] border border-white/[0.08] p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-tight">Daily Focus & Distraction</h3>
          <p className="text-xs text-zinc-400">Actual focus vs. distraction minutes across the last 7 days</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Focus</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-zinc-500" />
            <span>Distraction</span>
          </div>
        </div>
      </div>

      <div className="w-full h-56 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
            <XAxis dataKey="day" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
              contentStyle={{
                backgroundColor: '#18181b',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fafafa',
                fontSize: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            />
            <Bar dataKey="focusedMinutes" name="Focus (min)" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="distractedMinutes" name="Distraction (min)" fill="#71717a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface ScoreTrendChartProps {
  data: {
    day: string;
    focusScore: number;
  }[];
}

export function ScoreTrendChart({ data }: ScoreTrendChartProps) {
  return (
    <div className="w-full rounded-2xl bg-[#121215] border border-white/[0.08] p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white tracking-tight">Focus Score Trajectory</h3>
        <p className="text-xs text-zinc-400">Behavioral focus rate (%) trend over time</p>
      </div>

      <div className="w-full h-56 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
            <XAxis dataKey="day" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} domain={[50, 100]} />
            <Tooltip
              cursor={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1 }}
              contentStyle={{
                backgroundColor: '#18181b',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fafafa',
                fontSize: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            />
            <Line
              type="monotone"
              dataKey="focusScore"
              name="Focus Score (%)"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3, fill: '#10b981', stroke: '#10b981' }}
              activeDot={{ r: 5, fill: '#34d399', stroke: '#064e3b' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

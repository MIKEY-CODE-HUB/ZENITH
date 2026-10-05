'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ActivityType } from '@/lib/types';
import { CheckCircle2, ArrowRight, Video, ShieldAlert, Flame, BookOpen, Code, Dumbbell, Palette, Laptop } from 'lucide-react';

export default function OnboardingPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [preferredActivity, setPreferredActivity] = useState<ActivityType>('Coding');
  const [typicalDuration, setTypicalDuration] = useState(50);
  const [cameraAccountability, setCameraAccountability] = useState(true);
  const [distractionWarnings, setDistractionWarnings] = useState(true);
  const [streakTracking, setStreakTracking] = useState(true);
  const [saving, setSaving] = useState(false);

  const activities: { type: ActivityType; icon: any; label: string }[] = [
    { type: 'Coding', icon: Code, label: '💻 Coding' },
    { type: 'Study', icon: BookOpen, label: '📚 Study' },
    { type: 'Work', icon: Laptop, label: '💼 Work' },
    { type: 'Creative', icon: Palette, label: '🎨 Creative' },
    { type: 'Gym', icon: Dumbbell, label: '🏋️ Gym / Exercise' },
    { type: 'Reading', icon: BookOpen, label: '📖 Deep Reading' },
  ];

  const handleFinish = async () => {
    try {
      setSaving(true);
      await api.updateOnboarding({
        preferredActivity,
        typicalDuration,
        cameraAccountability,
        distractionWarnings,
        streakTracking,
      });
      await refreshUser();
      router.push('/dashboard');
    } catch (err) {
      router.push('/dashboard');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[#09090b] text-zinc-100">
      <div className="w-full max-w-lg rounded-2xl bg-[#121215] border border-white/[0.08] p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <span className="text-xs font-medium text-zinc-400">
            Step {step} of 3
          </span>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  step >= i ? 'w-6 bg-white' : 'w-3 bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Preferred Activity */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-white tracking-tight">
                Welcome, {user?.name || 'Friend'}
              </h2>
              <p className="text-xs text-zinc-400">
                What is your primary focus activity on Zenith?
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {activities.map((act) => (
                <button
                  type="button"
                  key={act.type}
                  onClick={() => setPreferredActivity(act.type)}
                  className={`p-3.5 rounded-xl border text-xs font-medium text-left transition-all flex flex-col justify-between h-20 ${
                    preferredActivity === act.type
                      ? 'bg-white text-zinc-950 shadow-sm border-white'
                      : 'bg-white/[0.02] border-white/[0.06] text-zinc-300 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <span className="text-xs text-zinc-500 uppercase font-mono">{act.type}</span>
                  <span className="text-sm font-semibold">{act.label.replace(/^[^\s]+ /, '')}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-100 transition-colors shadow-sm"
            >
              <span>Continue</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Step 2: Typical Focus Duration */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-white tracking-tight">
                Default block duration
              </h2>
              <p className="text-xs text-zinc-400">
                Sets your quick launcher length and session baseline.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { min: 25, label: '25 min', sub: 'Short Pomodoro interval' },
                { min: 50, label: '50 min', sub: 'Standard Deep Work (Recommended)' },
                { min: 90, label: '90 min', sub: 'Ultradian flow cycle' },
                { min: 120, label: '120 min', sub: 'Extended marathon' },
              ].map((d) => (
                <button
                  type="button"
                  key={d.min}
                  onClick={() => setTypicalDuration(d.min)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    typicalDuration === d.min
                      ? 'bg-white text-zinc-950 shadow-sm border-white'
                      : 'bg-white/[0.02] border-white/[0.06] text-zinc-300 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <p className="text-base font-semibold">{d.label}</p>
                  <p className={`text-xs mt-0.5 ${typicalDuration === d.min ? 'text-zinc-700' : 'text-zinc-500'}`}>{d.sub}</p>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="w-1/3 rounded-lg border border-white/[0.08] bg-white/[0.03] py-2.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.06] transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="w-2/3 flex items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-100 transition-colors shadow-sm"
              >
                <span>Continue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Accountability Preferences */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-white tracking-tight">
                Accountability preferences
              </h2>
              <p className="text-xs text-zinc-400">
                Fine-tune your peer presence and distraction alerts.
              </p>
            </div>

            <div className="space-y-2.5">
              <div
                onClick={() => setCameraAccountability(!cameraAccountability)}
                className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-colors ${
                  cameraAccountability
                    ? 'bg-white/[0.04] border-white/20 text-white'
                    : 'bg-white/[0.02] border-white/[0.06] text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Video className="h-4 w-4 text-emerald-400" />
                  <div>
                    <p className="text-xs font-semibold">Camera Peer Presence</p>
                    <p className="text-[11px] text-zinc-400">Join silent rooms with camera accountability</p>
                  </div>
                </div>
                <input type="checkbox" checked={cameraAccountability} readOnly className="accent-white h-4 w-4" />
              </div>

              <div
                onClick={() => setDistractionWarnings(!distractionWarnings)}
                className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-colors ${
                  distractionWarnings
                    ? 'bg-white/[0.04] border-white/20 text-white'
                    : 'bg-white/[0.02] border-white/[0.06] text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldAlert className="h-4 w-4 text-rose-400" />
                  <div>
                    <p className="text-xs font-semibold">Distraction Shield Enforcement</p>
                    <p className="text-[11px] text-zinc-400">Block distracting domains during sessions</p>
                  </div>
                </div>
                <input type="checkbox" checked={distractionWarnings} readOnly className="accent-white h-4 w-4" />
              </div>

              <div
                onClick={() => setStreakTracking(!streakTracking)}
                className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-colors ${
                  streakTracking
                    ? 'bg-white/[0.04] border-white/20 text-white'
                    : 'bg-white/[0.02] border-white/[0.06] text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Flame className="h-4 w-4 text-amber-400" />
                  <div>
                    <p className="text-xs font-semibold">Streak & Milestone Tracking</p>
                    <p className="text-[11px] text-zinc-400">Track daily consistency and score achievements</p>
                  </div>
                </div>
                <input type="checkbox" checked={streakTracking} readOnly className="accent-white h-4 w-4" />
              </div>
            </div>

            <button
              onClick={handleFinish}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-100 transition-colors shadow-sm disabled:opacity-50"
            >
              <span>{saving ? 'Saving...' : 'Enter Zenith Dashboard'}</span>
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

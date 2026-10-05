'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ActivityCategory, Room } from '@/lib/types';
import { ATMOSPHERES } from '@/lib/atmospheres';
import { api } from '@/lib/api';
import {
  GraduationCap,
  Dumbbell,
  Compass,
  MessageSquare,
  Shield,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  Flame,
  Volume2,
} from 'lucide-react';

interface StartSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableRooms?: Room[];
}

export function StartSessionModal({ isOpen, onClose, availableRooms = [] }: StartSessionModalProps) {
  const router = useRouter();

  // Categories & their associated activities
  const CATEGORIES: Array<{
    id: ActivityCategory;
    name: string;
    icon: any;
    desc: string;
    activities: string[];
  }> = [
    {
      id: 'EDUCATION',
      name: 'Education',
      icon: GraduationCap,
      desc: 'Deep study, engineering labs, exam preparation, and CS grinds.',
      activities: [
        'Deep Focus',
        'Coding',
        'Competitive Programming',
        'DSA',
        'Mathematics',
        'Exam Prep',
        'Research',
        'Projects',
        'Reading / Study',
      ],
    },
    {
      id: 'EXERCISE',
      name: 'Exercise',
      icon: Dumbbell,
      desc: 'Physical conditioning, calisthenics, gym sets, and mobility.',
      activities: ['Gym', 'Home Workout', 'Running', 'Cardio', 'Mobility', 'Recovery'],
    },
    {
      id: 'SIDE_QUEST',
      name: 'Side Quest',
      icon: Compass,
      desc: 'Creative projects, chess, music, and skills outside your primary grind.',
      activities: ['Chess', 'Reading', 'Music', 'Creative', 'Personal Projects', 'Writing', 'Exploration'],
    },
    {
      id: 'INTERACTION',
      name: 'Interaction',
      icon: MessageSquare,
      desc: 'Strict 6-person peer rooms with real-time voice (costs 30% weekly points).',
      activities: ['Problem Discussion', 'Coding & CP', 'Career Strategy', 'College Life', 'Chess Tactics', 'Casual'],
    },
  ];

  // Wizard state
  const [step, setStep] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory>('EDUCATION');
  const [selectedActivity, setSelectedActivity] = useState<string>('Coding');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedAtmosphere, setSelectedAtmosphere] = useState<string>('rainy-window');
  const [durationMinutes, setDurationMinutes] = useState<number>(50);
  const [protectionEnabled, setProtectionEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [interactionQuote, setInteractionQuote] = useState<{ weeklyBalance: number; cost: number; remaining: number } | null>(null);

  // Load Smart Defaults from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('zenith_last_session_prefs');
      if (stored) {
        const prefs = JSON.parse(stored);
        if (prefs.category) setSelectedCategory(prefs.category);
        if (prefs.activity) setSelectedActivity(prefs.activity);
        if (prefs.atmosphere) setSelectedAtmosphere(prefs.atmosphere);
        if (prefs.duration) setDurationMinutes(prefs.duration);
        if (prefs.protection !== undefined) setProtectionEnabled(prefs.protection);
      }
    } catch (e) {}
  }, []);

  // Fetch Interaction Quote when category is INTERACTION
  useEffect(() => {
    if (selectedCategory === 'INTERACTION' && isOpen) {
      api.getInteractionQuote()
        .then((res) => {
          if (res.success) setInteractionQuote(res.quote);
        })
        .catch(() => {});
    }
  }, [selectedCategory, isOpen]);

  // Set default room selection when availableRooms changes
  useEffect(() => {
    if (availableRooms.length > 0 && !selectedRoomId) {
      const match = availableRooms.find((r) => r.category === selectedCategory) || availableRooms[0];
      setSelectedRoomId(match.id);
    }
  }, [availableRooms, selectedCategory, selectedRoomId]);

  if (!isOpen) return null;

  const currentCategoryObj = CATEGORIES.find((c) => c.id === selectedCategory)!;

  const handleLaunch = async () => {
    try {
      setLoading(true);

      // Save smart defaults
      localStorage.setItem(
        'zenith_last_session_prefs',
        JSON.stringify({
          category: selectedCategory,
          activity: selectedActivity,
          atmosphere: selectedAtmosphere,
          duration: durationMinutes,
          protection: protectionEnabled,
        })
      );

      // Store in sessionStorage for room init
      sessionStorage.setItem('active_session_duration', String(durationMinutes));
      sessionStorage.setItem('active_session_atmosphere', selectedAtmosphere);
      sessionStorage.setItem('active_session_category', selectedCategory);
      sessionStorage.setItem('active_session_activity', selectedActivity);

      // If Interaction room, verify and authorize deduction first!
      let targetRoomId = selectedRoomId;
      if (!targetRoomId && availableRooms.length > 0) {
        targetRoomId = availableRooms[0].id;
      }

      if (selectedCategory === 'INTERACTION') {
        if (!targetRoomId) {
          throw new Error('Please select an Interaction Room.');
        }
        await api.authorizeInteraction(targetRoomId);
      }

      // Start Session on backend
      const res = await api.startSession({
        roomId: targetRoomId || null,
        category: selectedCategory,
        activityType: selectedActivity,
        specificActivity: selectedActivity,
        atmosphere: selectedAtmosphere,
        plannedDuration: durationMinutes,
      });

      if (res.success && res.session) {
        sessionStorage.setItem('active_session_id', res.session.id);
        if (protectionEnabled) {
          await api.activateBlocker(res.session.id, 'STRICT').catch(() => {});
        }
        onClose();
        router.push(`/focus/${targetRoomId || res.session.id}`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[#0d0f14]/95 p-6 shadow-2xl text-zinc-100 space-y-6">
        {/* Header with Step Tracker */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold tracking-wider uppercase text-sky-400">
              <span>Step {step} of 4</span>
              <span>•</span>
              <span>Fast Launch Flow</span>
            </div>
            <h2 className="text-lg font-semibold text-white tracking-tight mt-0.5">
              {step === 1 && '1. Choose Category & Activity'}
              {step === 2 && '2. Choose Room'}
              {step === 3 && '3. Choose Atmosphere'}
              {step === 4 && '4. Duration & Focus Protection'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* STEP 1: Category & Activity */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setSelectedActivity(cat.activities[0]);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-sky-500/10 border-sky-500/40 text-white shadow-sm'
                        : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${isSelected ? 'text-sky-400' : 'text-zinc-500'}`} />
                      <span className="text-xs font-semibold text-white">{cat.name}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">{cat.desc}</p>
                  </button>
                );
              })}
            </div>

            {selectedCategory === 'INTERACTION' && interactionQuote && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold">Point Cost:</span> 30% of Weekly Balance ({interactionQuote.cost} ⭐)
                </div>
                <div className="font-mono text-zinc-300">
                  Balance: {interactionQuote.weeklyBalance} ⭐ → Remaining: {interactionQuote.remaining} ⭐
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <span className="text-xs font-medium text-zinc-300">Select Specific Activity</span>
              <div className="flex flex-wrap gap-2">
                {currentCategoryObj.activities.map((act) => (
                  <button
                    key={act}
                    onClick={() => setSelectedActivity(act)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      selectedActivity === act
                        ? 'bg-white text-zinc-950 border-white font-semibold'
                        : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    {act}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Choose Room */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-zinc-400">
              Select one of the canonical rooms. All rooms are shared spaces where participants work together.
            </p>
            <div className="grid grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
              {availableRooms.map((room) => {
                const isSelected = selectedRoomId === room.id;
                return (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-sky-500/10 border-sky-500/40 text-white'
                        : 'bg-white/[0.03] border-white/10 text-zinc-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white tracking-wider">{room.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-zinc-400">
                        {room.activeParticipantsCount}/{room.maxParticipants}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{room.description}</p>
                    <div className="text-[10px] text-sky-400 mt-2 font-medium">
                      {room.category} {room.topic ? `• ${room.topic}` : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: Choose Atmosphere */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-xs text-zinc-400">
              Personal Atmosphere: You choose what environment you see. The room remains shared.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
              {ATMOSPHERES.map((atm) => {
                const isSelected = selectedAtmosphere === atm.id;
                return (
                  <button
                    key={atm.id}
                    onClick={() => setSelectedAtmosphere(atm.id)}
                    className={`relative rounded-xl overflow-hidden border text-left transition-all group ${
                      isSelected ? 'ring-2 ring-sky-400 border-transparent' : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="h-20 w-full relative">
                      <img src={atm.bgImageUrl} alt={atm.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      {isSelected && (
                        <div className="absolute top-2 right-2 p-1 rounded-full bg-sky-500 text-white">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="p-2 bg-[#12141a]">
                      <div className="text-xs font-semibold text-white truncate">{atm.name}</div>
                      <div className="text-[10px] text-zinc-400 uppercase font-mono">{atm.category}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: Duration & Protection */}
        {step === 4 && (
          <div className="space-y-5">
            {/* Duration */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-2">
                <Clock className="h-4 w-4 text-sky-400" />
                <span>Session Duration</span>
              </label>
              <div className="flex gap-2">
                {[25, 45, 50, 60, 90].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setDurationMinutes(mins)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                      durationMinutes === mins
                        ? 'bg-white text-zinc-950 font-bold border-white shadow-sm'
                        : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* Focus Protection Blocker */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  <div>
                    <h4 className="text-xs font-semibold text-white">Focus Protection & Blocker</h4>
                    <p className="text-[11px] text-zinc-400">Strict mode blocks social media & tab switches</p>
                  </div>
                </div>
                <button
                  onClick={() => setProtectionEnabled(!protectionEnabled)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    protectionEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      protectionEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Session Summary Card */}
            <div className="p-3.5 rounded-xl bg-sky-500/5 border border-sky-500/20 text-xs space-y-1">
              <div className="text-[11px] text-sky-400 font-semibold uppercase tracking-wider">Ready to Enter:</div>
              <div className="text-zinc-200">
                <span className="text-white font-semibold">{selectedActivity}</span> in{' '}
                <span className="text-white font-semibold">{durationMinutes}m</span> session
              </div>
              <div className="text-zinc-400 text-[11px]">
                Atmosphere: {ATMOSPHERES.find((a) => a.id === selectedAtmosphere)?.name}
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-100 transition-colors shadow-sm"
            >
              <span>Continue</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-sky-500 text-white text-xs font-semibold hover:bg-sky-400 transition-colors shadow-lg disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{loading ? 'Entering Zenith...' : 'Enter Zenith Room'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

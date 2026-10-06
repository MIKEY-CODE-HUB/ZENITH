'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Shield,
  Radio,
  Clock,
  Flame,
  CheckCircle2,
  Users,
  Eye,
  Lock,
  Sparkles,
  Headphones,
  Music,
  BookOpen,
  Dumbbell,
  Compass,
  MessageSquare,
} from 'lucide-react';

export default function LandingPage() {
  const { user, demoLogin } = useAuth();
  const router = useRouter();

  const handleStart = () => {
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/signup');
    }
  };

  const [demoEntering, setDemoEntering] = useState(false);

  const handleDemoClick = async () => {
    setDemoEntering(true);
    await demoLogin('mikey');
  };

  const samplePeers = [
    { name: 'Elena R.', task: 'Rust compiler optimization', streak: '52m', initials: 'ER' },
    { name: 'Marcus Chen', task: 'Writing system design doc', streak: '44m', initials: 'MC' },
    { name: 'Priya Patel', task: 'Reviewing pull requests', streak: '1h 10m', initials: 'PP' },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-zinc-800 selection:text-white">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-20 pb-20 md:pt-28 md:pb-32 border-b border-white/[0.06]">
        {/* Subtle warm ambient highlight */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[320px] bg-gradient-to-b from-white/[0.05] to-transparent blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-7">
          {/* Subtle status badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-300 shadow-inner">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>Dual-layer focus protection for Mac & Chrome • 0ms Tab Snap-Back</span>
          </div>

          {/* Headline */}
          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.12]">
              Deep work without the <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">self-deception</span>.
            </h1>
            <p className="text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto font-normal leading-relaxed">
              Immersive social accountability platform for ambitious students. Master DSA, ship projects, and hit flow state in Tokyo Midnight, Rainy Window, or Nordic Pines soundscapes.
            </p>
          </div>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={handleStart}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white text-zinc-950 px-6 py-3 text-sm font-semibold hover:bg-zinc-100 transition-colors shadow-sm"
            >
              <span>Start focusing</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={handleDemoClick}
              disabled={demoEntering}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              {demoEntering ? (
                <>
                  <span className="h-3 w-3 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                  <span>Entering demo...</span>
                </>
              ) : (
                <span>Explore live demo</span>
              )}
            </button>
          </div>

          {/* Social Proof Quote */}
          <div className="pt-6 flex items-center justify-center gap-3 text-xs text-zinc-500">
            <span>Silent video accountability</span>
            <span>•</span>
            <span>Instant tab snap-back</span>
            <span>•</span>
            <span>macOS desktop blocker</span>
          </div>
        </div>

        {/* 2. PRODUCT PREVIEW CARD */}
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mt-16">
          <div className="rounded-2xl border border-white/10 bg-[#121215] p-5 sm:p-7 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <h3 className="text-sm font-semibold text-white">Full-Stack Architecture Lab</h3>
                  <p className="text-xs text-zinc-400">Silent Room • 50m Deep Work Block</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <Shield className="h-3 w-3" />
                  Shield engaged
                </span>
              </div>
            </div>

            {/* Peer Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {samplePeers.map((peer, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-semibold text-zinc-300">
                        {peer.initials}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white">{peer.name}</p>
                        <p className="text-[11px] text-zinc-500">{peer.streak} in the zone</p>
                      </div>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  </div>
                  <div className="p-2 rounded-lg bg-black/40 text-[11px] text-zinc-400 border border-white/5">
                    {peer.task}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom session bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-zinc-400" />
                <span>Session progress: <strong className="text-white font-medium">38m elapsed</strong> of 50m</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>0 distractions permitted • YouTube, X, Discord locked</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. THREE CORE PILLARS */}
      <section className="py-20 md:py-28 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight text-white">
            Built for people who care about high output.
          </h2>
          <p className="text-sm text-zinc-400">
            Most focus apps simply track a timer while you scroll. Zenith actively keeps your workspace protected.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-[#121215] border border-white/[0.08] space-y-4 hover:border-white/15 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white">
              <Radio className="h-5 w-5 text-zinc-200" />
            </div>
            <h3 className="text-base font-semibold text-white">Silent Coworking</h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Join focused rooms with engineers, writers, and researchers. No microphone noise or distracting chatter — just shared momentum.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-[#121215] border border-white/[0.08] space-y-4 hover:border-white/15 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white">
              <Shield className="h-5 w-5 text-emerald-400" />
            </div>
            <h3 className="text-base font-semibold text-white">Hardware-Level Shield</h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              If you reflexively switch to YouTube, Reddit, Discord, or Spotify, Zenith snaps your focus back in under 0.05 seconds.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-[#121215] border border-white/[0.08] space-y-4 hover:border-white/15 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <h3 className="text-base font-semibold text-white">Honest Focus Telemetry</h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Get an accurate breakdown of uninterrupted deep work versus idle time, so you know exactly how productive you actually were.
            </p>
          </div>
        </div>
      </section>

      {/* 4. ATMOSPHERIC IMMERSION & 4 PILLARS */}
      <section className="py-16 md:py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="relative rounded-3xl bg-gradient-to-br from-[#121526] via-[#0d101d] to-[#141226] border border-indigo-500/20 p-8 sm:p-12 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Headphones className="h-3.5 w-3.5" />
                  <span>Personal Atmospheric Soundscapes</span>
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                  Shared silent room. Your private soundscape.
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-xl">
                  While sharing accountability with peer students, immerse your sensory environment in synthesized binaural beats and high-fidelity ambient layers.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium border border-indigo-500/30 flex items-center gap-1.5">
                  <Music className="h-3.5 w-3.5" />
                  <span>Ambient Audio Synthesizer</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { name: 'Tokyo Midnight', icon: '🌃', desc: 'Binaural neon night rain & distant synth pads', glow: 'hover:border-indigo-400/50' },
                { name: 'Rainy Library', icon: '🌧️', desc: 'Gentle raindrops on glass with warm acoustic glow', glow: 'hover:border-blue-400/50' },
                { name: 'Nordic Pines', icon: '🌲', desc: 'Alpine wind, crackling warmth & deep timber tone', glow: 'hover:border-emerald-400/50' },
                { name: 'Sunset Dusk', icon: '🌇', desc: 'Warm analog warmth, sunset golden hour resonance', glow: 'hover:border-amber-400/50' },
              ].map((amb) => (
                <div key={amb.name} className={`p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] ${amb.glow} transition-all space-y-2 group cursor-pointer hover:bg-white/[0.06]`}>
                  <span className="text-2xl">{amb.icon}</span>
                  <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">{amb.name}</p>
                  <p className="text-[11px] text-zinc-400 leading-tight">{amb.desc}</p>
                </div>
              ))}
            </div>

            {/* 4 Pillars */}
            <div className="pt-6 border-t border-white/[0.08]">
              <p className="text-xs font-semibold tracking-wider uppercase text-zinc-400 mb-4">
                Four Pillars of Undergraduate Mastery
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <BookOpen className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-white block">Education</span>
                    <span className="text-[10px] text-zinc-400">DSA & Core Math</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <Dumbbell className="h-4 w-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-white block">Exercise</span>
                    <span className="text-[10px] text-zinc-400">Cardio & Mobility</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <Compass className="h-4 w-4 text-purple-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-white block">Side Quest</span>
                    <span className="text-[10px] text-zinc-400">Projects & Chess</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <MessageSquare className="h-4 w-4 text-cyan-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-white block">Interaction</span>
                    <span className="text-[10px] text-zinc-400">Peer Collab</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="border-t border-white/[0.06] py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-300">Zenith</span>
          <span>— Deep work environment</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/rooms" className="hover:text-zinc-300 transition-colors">Silent Rooms</Link>
          <Link href="/blocker" className="hover:text-zinc-300 transition-colors">Shield</Link>
          <Link href="/login" className="hover:text-zinc-300 transition-colors">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}

'use client';

import React from 'react';
import { useAmbient } from '@/contexts/AmbientContext';
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
  CloudRain,
  Trees,
  Sunset,
  Moon,
  Terminal,
} from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { pageSceneries, openSceneryModal } = useAmbient();

  const handleStart = () => {
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  };

  const handleExploreRooms = () => {
    router.push('/rooms');
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-zinc-800 selection:text-white">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-20 pb-20 md:pt-28 md:pb-32 border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-cover bg-center" aria-hidden="true" style={{
          backgroundColor: '#211b18',
          backgroundImage: pageSceneries.home?.bgImageUrl
            ? `linear-gradient(180deg, rgba(19,15,13,.58), #15110f 85%), url("${pageSceneries.home.bgImageUrl}")`
            : pageSceneries.home?.gradientOverlay ?? 'radial-gradient(ellipse at top, #403127 0%, #15110f 75%)',
        }} />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-7">
          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="font-serif text-5xl sm:text-7xl font-normal tracking-tight text-[#fff5e8] leading-[1.04]">
              A quiet place to focus.
            </h1>
            <p className="text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto font-normal leading-relaxed">
              Set a timer for what you’re working on. Study on your own or join a quiet room with others.
            </p>
          </div>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={handleStart}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#ecd5b5] text-[#271d15] px-6 py-3 text-sm font-semibold hover:bg-zinc-100 transition-colors shadow-sm"
            >
              <span>Start focusing</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={handleExploreRooms}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              <span>Explore silent rooms</span>
            </button>
          </div>

          <button type="button" onClick={() => openSceneryModal('home')} className="text-sm text-[#ead5bd] underline underline-offset-4 hover:text-white">
            Customize Theme
          </button>
        </div>

      {/* 2. PRODUCT PREVIEW CARD */}
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mt-16">
          <div className="rounded-2xl border border-white/10 bg-[#121215] p-5 sm:p-7 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <h3 className="text-sm font-semibold text-white">Example focus session</h3>
                  <p className="text-xs text-zinc-400">Silent Room • 50m Planned Block</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-medium px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <Shield className="h-3 w-3" />
                  Optional Chrome Shield
                </span>
              </div>
            </div>

            {/* Core Capability Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-emerald-400" />
                  <p className="text-xs font-semibold text-white">Shared study room</p>
                </div>
                <p className="text-xs text-zinc-300 font-medium">DSA & Algorithms</p>
                <p className="text-[11px] text-zinc-500 leading-tight">Silent coworking with zero microphone chatter.</p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-sky-400" />
                  <p className="text-xs font-semibold text-white">Shield Policy</p>
                </div>
                <p className="text-xs text-zinc-300 font-medium">Distraction Shield</p>
                <p className="text-[11px] text-zinc-500 leading-tight">Restricted sites are blocked during protected sessions.</p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <div className="flex items-center gap-2">
                  <Headphones className="h-4 w-4 text-amber-400" />
                  <p className="text-xs font-semibold text-white">Atmospheric Audio</p>
                </div>
                <p className="text-xs text-zinc-300 font-medium">Tokyo Midnight</p>
                <p className="text-[11px] text-zinc-500 leading-tight">Binaural beats layered with gentle night rain.</p>
              </div>
            </div>

            {/* Bottom session bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-zinc-400" />
                <span>Session telemetry: <strong className="text-white font-medium">Clean slate</strong></span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>YouTube, X, and Discord can be blocked in Chrome</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. THREE CORE PILLARS */}
      <section className="py-20 md:py-28 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight text-white">
            Make time for what matters.
          </h2>
          <p className="text-sm text-zinc-400">
            Pick a task, settle into a room, and review your session when you finish.
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
              Study alongside others in a quiet room, with an optional camera.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-[#121215] border border-white/[0.08] space-y-4 hover:border-white/15 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white">
              <Shield className="h-5 w-5 text-emerald-400" />
            </div>
            <h3 className="text-base font-semibold text-white">Distraction Shield for Chrome</h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              The Chrome extension blocks restricted websites and can bring your focus tab back to the foreground.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-[#121215] border border-white/[0.08] space-y-4 hover:border-white/15 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <h3 className="text-base font-semibold text-white">Truth Tracker</h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Review estimated focus time, idle time, and interruptions after a session.
            </p>
          </div>
        </div>
      </section>

      {/* 4. ATMOSPHERIC IMMERSION & 4 PILLARS */}
      <section className="py-16 md:py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="relative rounded-3xl bg-gradient-to-br from-[#0e131b] via-[#090d13] to-[#121722] border border-teal-500/20 p-8 sm:p-12 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                  <Headphones className="h-3.5 w-3.5" />
                  <span>Personal Atmospheric Soundscapes</span>
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                  Shared silent room. Your private soundscape.
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-xl">
                  Choose the ambience you want to hear while you work.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-teal-500/10 text-teal-300 text-xs font-medium border border-teal-500/30 flex items-center gap-1.5">
                  <Music className="h-3.5 w-3.5" />
                  <span>Ambient Audio Synthesizer</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { name: 'Tokyo Midnight', icon: Moon, color: 'text-sky-400', desc: 'Binaural neon night rain & distant synth pads', glow: 'hover:border-sky-400/50' },
                { name: 'Rainy Library', icon: CloudRain, color: 'text-blue-400', desc: 'Gentle raindrops on glass with warm acoustic glow', glow: 'hover:border-blue-400/50' },
                { name: 'Nordic Pines', icon: Trees, color: 'text-emerald-400', desc: 'Alpine wind, crackling warmth & deep timber tone', glow: 'hover:border-emerald-400/50' },
                { name: 'Sunset Dusk', icon: Sunset, color: 'text-amber-400', desc: 'Warm analog warmth, sunset golden hour resonance', glow: 'hover:border-amber-400/50' },
              ].map((amb) => {
                const IconComponent = amb.icon;
                return (
                  <div key={amb.name} className={`p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2`}>
                    <div className="p-2 rounded-xl bg-white/5 w-fit border border-white/5">
                      <IconComponent className={`h-5 w-5 ${amb.color}`} />
                    </div>
                    <p className="text-xs font-bold text-white group-hover:text-teal-300 transition-colors">{amb.name}</p>
                    <p className="text-[11px] text-zinc-400 leading-tight">{amb.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* 4 Pillars */}
            <div className="pt-6 border-t border-white/[0.08]">
              <p className="text-xs font-semibold tracking-wider uppercase text-zinc-400 mb-4">
                Find a room for your activity
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
                  <Compass className="h-4 w-4 text-teal-400 shrink-0" />
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
          <span>- Deep work environment</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/rooms" className="hover:text-zinc-300 transition-colors">Silent Rooms</Link>
          <Link href="/blocker" className="hover:text-zinc-300 transition-colors">Shield</Link>
          <Link href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-zinc-300 transition-colors">Terms of Service</Link>
          <Link href="/login" className="hover:text-zinc-300 transition-colors">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}

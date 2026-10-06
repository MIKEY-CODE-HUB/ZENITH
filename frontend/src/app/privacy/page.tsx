'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Lock, Eye, Database, Server } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 py-16 px-4 sm:px-6 lg:px-8 selection:bg-zinc-800">
      <main className="max-w-3xl mx-auto space-y-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Zenith</span>
        </Link>

        <header className="space-y-3 border-b border-white/10 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Shield className="h-3.5 w-3.5" />
            <span>Privacy Architecture</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-mono">
            Last Updated: October 6, 2026 | Effective Date: October 6, 2026
          </p>
        </header>

        <div className="space-y-8 text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-400" />
              <span>1. Fundamental Privacy Philosophy</span>
            </h2>
            <p>
              Zenith is built on a strict principle: <strong>Do the work. See the truth.</strong> We believe accountability does not require surveillance. Zenith operates with minimal telemetry, never sells personal information, and limits monitoring exclusively to your active focus sessions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight flex items-center gap-2">
              <Eye className="h-4 w-4 text-emerald-400" />
              <span>2. Camera and Video Accountability</span>
            </h2>
            <p>
              In video-enabled silent focus rooms, your camera stream is transmitted peer-to-peer or through WebRTC media routing. <strong>Zenith never records, stores, analyzes, or processes video feeds on our servers.</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-2">
              <li>Video streams are temporary and live-only.</li>
              <li>Microphones are strictly disabled by default across all focus rooms.</li>
              <li>You may disable camera access at any time from room settings.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-400" />
              <span>3. Distraction Shield and Tab Monitoring</span>
            </h2>
            <p>
              The Zenith Distraction Shield inspects navigation events only to protect focus during active sessions.
            </p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-2">
              <li>Monitoring runs <strong>only</strong> when you are in an active focus room.</li>
              <li>The blocker checks URLs against local blocklists to enforce instant snap-back.</li>
              <li>We log numerical distraction counts (e.g., number of tab switches), not personal browsing history.</li>
              <li>When your session ends, all interception immediately stops.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight flex items-center gap-2">
              <Server className="h-4 w-4 text-emerald-400" />
              <span>4. Data Storage and Security</span>
            </h2>
            <p>
              Your account details, weekly focus points, and session timestamps are stored securely using industry-standard hashing (bcrypt) and encrypted database connections. You can export or delete your profile data at any time via Settings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
              5. Contact and Inquiries
            </h2>
            <p>
              For privacy inquiries or account data removal requests, contact the Zenith architecture team at <code>privacy@zenith.app</code>.
            </p>
          </section>
        </div>

        <footer className="pt-8 border-t border-white/10 flex items-center justify-between text-xs text-zinc-500">
          <span>Zenith Focus Architecture</span>
          <Link href="/terms" className="hover:text-zinc-300 transition-colors">
            Terms of Service
          </Link>
        </footer>
      </main>
    </div>
  );
}

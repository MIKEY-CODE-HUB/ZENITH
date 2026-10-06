'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Award, Users, AlertCircle, FileText } from 'lucide-react';

export default function TermsPage() {
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
            <FileText className="h-3.5 w-3.5" />
            <span>Platform Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Terms of Service
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-mono">
            Last Updated: October 6, 2026 | Effective Date: October 6, 2026
          </p>
        </header>

        <div className="space-y-8 text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span>1. Agreement to Terms</span>
            </h2>
            <p>
              By accessing or using the Zenith platform, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, do not access or use the application.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-400" />
              <span>2. Focus Point Economy and Interaction Rules</span>
            </h2>
            <p>
              Zenith implements an intentional focus point economy designed to reward discipline and prioritize deep work:
            </p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-2">
              <li>Focus points are earned proportionally through verified deep work sessions.</li>
              <li>Entering Interaction Rooms incurs a 30% weekly points deduction to keep social discussion deliberate and earned.</li>
              <li>Points possess zero real-world monetary value and cannot be transferred, sold, or redeemed for cash.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" />
              <span>3. Silent Coworking and Community Standards</span>
            </h2>
            <p>
              To maintain an intense, respectful environment for ambitious students:
            </p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-2">
              <li>Microphones are muted in Silent Rooms to prevent cognitive distraction.</li>
              <li>Harassment, offensive behavior, explicit content, or disruptive antics in any room will result in immediate session termination and account suspension.</li>
              <li>Interaction circles maintain a hard 6-person capacity to preserve genuine conversation quality.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-emerald-400" />
              <span>4. Distraction Shield and System Usage</span>
            </h2>
            <p>
              The optional Distraction Shield extension and desktop daemon operate strictly to enforce your self-selected focus boundaries. Zenith disclaims liability for any loss of unsaved work in external browser tabs caused by intentional tab interception during an active focus block.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
              5. Governing Law and Amendments
            </h2>
            <p>
              We reserve the right to revise these Terms at any time. Continued use of Zenith after updates constitutes acceptance of the modified Terms.
            </p>
          </section>
        </div>

        <footer className="pt-8 border-t border-white/10 flex items-center justify-between text-xs text-zinc-500">
          <span>Zenith Focus Architecture</span>
          <Link href="/privacy" className="hover:text-zinc-300 transition-colors">
            Privacy Policy
          </Link>
        </footer>
      </main>
    </div>
  );
}

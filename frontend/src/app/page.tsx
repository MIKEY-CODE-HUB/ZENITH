'use client';

import Link from 'next/link';
import { ArrowRight, Timer, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function WelcomePage() {
  const { user, loading } = useAuth();

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-7xl flex-col justify-end px-5 pb-9 pt-24 text-[#fff2e4] sm:px-10 lg:px-16">
      <div className="grid items-end gap-8 lg:grid-cols-[1.2fr_.75fr] lg:gap-14">
        <section className="space-y-6">
          <h1 className="max-w-xl font-serif text-5xl leading-[1.02] tracking-tight drop-shadow-lg sm:text-7xl lg:text-8xl">A quiet place to focus.</h1>
          <p className="max-w-md text-base leading-relaxed text-[#f8e5d2] drop-shadow-lg sm:text-lg">
            Set a timer, put on something calming, and get to work. Study on your own or settle into a room with others.
          </p>
          <div className="flex flex-wrap items-center gap-5">
            {!loading && <Link href={user ? '/dashboard' : '/login?mode=signup'}
              className="inline-flex items-center gap-3 rounded-xl bg-[#ecd0af] px-6 py-3 font-semibold text-[#2f2118] transition-colors hover:bg-[#ffe2c3]">
              {user ? 'Open home' : 'Start focusing'} <ArrowRight size={18} aria-hidden />
            </Link>}
            {!loading && !user && <Link href="/login" className="text-sm font-medium text-[#ffe7cf] underline underline-offset-4">Already have an account? Log in</Link>}
          </div>
        </section>
        <div className="max-w-md divide-y divide-[#f3ddc6]/15 rounded-2xl border border-[#f3ddc6]/15 bg-[#211b17]/70 px-5 shadow-lg">
          <div className="flex gap-4 py-5">
            <Timer size={19} className="mt-0.5 shrink-0 text-[#dcac80]" aria-hidden />
            <div><h2 className="font-medium">Focus at your own pace</h2><p className="mt-1 text-sm text-[#d6bcaa]">Choose a task, a timer, and a background that feels right.</p></div>
          </div>
          <div className="flex gap-4 py-5">
            <Users size={19} className="mt-0.5 shrink-0 text-[#dcac80]" aria-hidden />
            <div><h2 className="font-medium">Work alongside others</h2><p className="mt-1 text-sm text-[#d6bcaa]">Find a quiet room or invite someone to study with you.</p></div>
          </div>
        </div>
      </div>
      <footer className="mt-9 flex flex-wrap gap-5 text-sm text-[#e2cbb7]">
        <Link href="/privacy" className="hover:underline">Privacy</Link>
        <Link href="/terms" className="hover:underline">Terms</Link>
      </footer>
    </main>
  );
}

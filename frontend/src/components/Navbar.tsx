'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  User,
  LogOut,
  Award,
  ChevronDown,
  Volume2,
  VolumeX,
  Image as ImageIcon,
  Menu,
  X,
  LogIn,
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useAmbient } from '@/contexts/AmbientContext';

export function Navbar() {
  const { user, logout, demoLogin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const {
    currentScenery,
    setIsSceneryModalOpen,
    isPlayingSound,
    setIsSoundModalOpen,
    activeSound,
  } = useAmbient();

  const isFocusRoom = pathname.startsWith('/focus/') && !pathname.includes('/setup') && !pathname.includes('/summary');

  if (isFocusRoom) {
    return null;
  }

  // Header Navbar: ONLY Zenith Logo, Home, Join Room, Leaderboard, Login
  const isHomeActive = pathname === '/dashboard' || pathname === '/';
  const isJoinRoomActive = pathname.startsWith('/rooms');
  const isLeaderboardActive = pathname.startsWith('/leaderboard');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.07] bg-[#09090b]/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left: Zenith Logo (routes to /dashboard) */}
        <div className="flex items-center gap-8">
          <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-zinc-950 shadow-sm transition-transform group-hover:scale-105">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="m10 15 5-3-5-3v6Z" fill="currentColor" />
              </svg>
            </div>
            <span className="text-base font-semibold tracking-tight text-white">
              Zenith
            </span>
          </Link>

          {/* Core Nav: Home, Join Room, Leaderboard */}
          <nav className="hidden md:flex items-center gap-1.5">
            <Link
              href="/dashboard"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isHomeActive
                  ? 'bg-white/[0.08] text-white'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              }`}
            >
              Home
            </Link>

            <Link
              href="/rooms"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isJoinRoomActive
                  ? 'bg-white/[0.08] text-white'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              }`}
            >
              Join Room
            </Link>

            <Link
              href="/leaderboard"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isLeaderboardActive
                  ? 'bg-white/[0.08] text-white'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              }`}
            >
              Leaderboard
            </Link>
          </nav>
        </div>

        {/* Right: Ambient toggles + Login / User Profile */}
        <div className="flex items-center gap-3">
          {/* Subtle Ambient Triggers */}
          <div className="hidden sm:flex items-center gap-1 border border-white/[0.08] bg-white/[0.02] rounded-lg p-1">
            <button
              onClick={() => setIsSceneryModalOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Change theme scenery"
            >
              <ImageIcon className="h-3 w-3 text-emerald-400" />
              <span>{currentScenery.name.split(' ')[0]}</span>
            </button>

            <button
              onClick={() => setIsSoundModalOpen(true)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                isPlayingSound
                  ? 'text-emerald-400 bg-emerald-500/15 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'
              }`}
              title="Toggle ambient study audio"
            >
              {isPlayingSound ? (
                <Volume2 className="h-3 w-3 text-emerald-400 animate-pulse" />
              ) : (
                <VolumeX className="h-3 w-3 text-zinc-500" />
              )}
              <span className="capitalize">{activeSound}</span>
            </button>
          </div>

          {/* Login or User Profile */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] p-1.5 pr-2.5 hover:bg-white/[0.06] transition-colors"
              >
                <img
                  src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || 'User')}`}
                  alt={user.name}
                  className="h-6 w-6 rounded-md object-cover bg-zinc-800"
                />
                <span className="text-xs font-medium text-zinc-200 hidden sm:inline">{user.name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-white/[0.08] bg-[#121215] p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                    <p className="text-[11px] text-zinc-400">Signed in as</p>
                    <p className="text-xs font-semibold text-white truncate">{user.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.05] transition-colors"
                  >
                    <User className="h-4 w-4 text-zinc-400" />
                    <span>Profile & Stats</span>
                  </Link>
                  <Link
                    href="/dashboard"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.05] transition-colors"
                  >
                    <span>Dashboard</span>
                  </Link>
                  <div className="my-1 border-t border-white/[0.06]" />
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition-colors shadow-sm"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Login</span>
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white md:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/[0.07] bg-[#0c0c0f] px-4 py-3 space-y-1">
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-lg text-xs font-medium ${
              isHomeActive ? 'bg-white/[0.08] text-white' : 'text-zinc-300 hover:bg-white/[0.04]'
            }`}
          >
            Home
          </Link>
          <Link
            href="/rooms"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-lg text-xs font-medium ${
              isJoinRoomActive ? 'bg-white/[0.08] text-white' : 'text-zinc-300 hover:bg-white/[0.04]'
            }`}
          >
            Join Room
          </Link>
          <Link
            href="/leaderboard"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-lg text-xs font-medium ${
              isLeaderboardActive ? 'bg-white/[0.08] text-white' : 'text-zinc-300 hover:bg-white/[0.04]'
            }`}
          >
            Leaderboard
          </Link>
          {!user && (
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10"
            >
              Login
            </Link>
          )}
        </div>
      )}
    </header>
  );
}

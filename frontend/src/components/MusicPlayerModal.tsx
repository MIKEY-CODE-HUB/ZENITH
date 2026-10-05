'use client';

import React, { useState, useEffect } from 'react';
import { ZENITH_TRACKS, musicPlayer, Track } from '@/lib/musicEngine';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Music, X, ExternalLink, Radio } from 'lucide-react';

interface MusicPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MusicPlayerModal({ isOpen, onClose }: MusicPlayerModalProps) {
  const [activeTab, setActiveTab] = useState<'zenith' | 'spotify'>('zenith');
  const [currentTrack, setCurrentTrack] = useState<Track>(musicPlayer.getCurrentTrack());
  const [isPlaying, setIsPlaying] = useState<boolean>(musicPlayer.isPlaying());
  const [volume, setVolume] = useState<number>(musicPlayer.getVolume());

  useEffect(() => {
    const unsub = musicPlayer.subscribe(() => {
      setCurrentTrack(musicPlayer.getCurrentTrack());
      setIsPlaying(musicPlayer.isPlaying());
      setVolume(musicPlayer.getVolume());
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0f14]/95 p-6 shadow-2xl text-zinc-100 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Music className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Audio & Focus Music</h2>
              <p className="text-xs text-zinc-400">Atmospheric focus audio and provider handoff</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Provider Tabs */}
        <div className="flex rounded-xl bg-white/5 p-1 border border-white/10">
          <button
            onClick={() => setActiveTab('zenith')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'zenith' ? 'bg-white text-zinc-950 font-semibold shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            <span>Zenith Audio</span>
          </button>
          <button
            onClick={() => setActiveTab('spotify')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'spotify' ? 'bg-[#1DB954] text-white font-semibold shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>Spotify Handoff</span>
          </button>
        </div>

        {activeTab === 'zenith' ? (
          <div className="space-y-5">
            {/* Current Track Display */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="h-16 w-16 rounded-lg object-cover border border-white/10 shadow-md"
              />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-semibold text-indigo-400 tracking-wider">
                  {currentTrack.category}
                </span>
                <h3 className="text-sm font-semibold text-white truncate mt-0.5">{currentTrack.title}</h3>
                <p className="text-xs text-zinc-400 truncate">{currentTrack.artist}</p>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => musicPlayer.previous()}
                className="p-2.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <SkipBack className="h-5 w-5" />
              </button>
              <button
                onClick={() => musicPlayer.togglePlay()}
                className="p-3.5 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 transition-colors shadow-lg"
              >
                {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
              </button>
              <button
                onClick={() => musicPlayer.next()}
                className="p-2.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <SkipForward className="h-5 w-5" />
              </button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-3 px-2">
              <Volume2 className="h-4 w-4 text-zinc-400" />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => musicPlayer.setVolume(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
              <span className="text-xs font-mono text-zinc-400 w-8 text-right">{volume}%</span>
            </div>

            {/* Track Selection List */}
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {ZENITH_TRACKS.map((t, idx) => (
                <button
                  key={t.id}
                  onClick={() => musicPlayer.playTrack(idx)}
                  className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between transition-colors text-xs ${
                    currentTrack.id === t.id
                      ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-medium'
                      : 'hover:bg-white/5 text-zinc-300'
                  }`}
                >
                  <div className="truncate mr-2">
                    <div className="font-semibold text-white truncate">{t.title}</div>
                    <div className="text-[10px] text-zinc-400">{t.category} • {t.artist}</div>
                  </div>
                  {currentTrack.id === t.id && isPlaying && (
                    <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#1DB954]/20 flex items-center justify-center text-[#1DB954]">
                <Music className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Spotify Official Integration</h4>
                <p className="text-zinc-400 text-[11px]">Developer Policy Compliant Playback Handoff</p>
              </div>
            </div>

            <p className="text-zinc-400 leading-relaxed">
              In accordance with official Spotify Developer Terms, playback control requires a Spotify Premium account. You can connect your account to control your active Spotify playlists directly from Zenith without leaving your focus session.
            </p>

            <a
              href="https://open.spotify.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-[#1DB954] text-white font-semibold hover:bg-[#1aa34a] transition-colors"
            >
              <span>Launch Spotify Web Player</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

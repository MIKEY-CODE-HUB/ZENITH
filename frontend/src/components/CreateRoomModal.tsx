'use client';

import React, { useState } from 'react';
import { ActivityType } from '@/lib/types';
import { api } from '@/lib/api';
import { X, Sparkles, Camera, Lock, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (room: any) => void;
}

export function CreateRoomModal({ isOpen, onClose, onCreated }: CreateRoomModalProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('Coding');
  const [duration, setDuration] = useState(50);
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(12);
  const [camera, setCamera] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const activities: ActivityType[] = ['Study', 'Work', 'Coding', 'Gym', 'Creative', 'Reading', 'Practice', 'Other'];
  const durations = [25, 50, 90];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a room name');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.createRoom({
        name,
        description,
        activityType,
        duration,
        isPrivate,
        maxParticipants,
        camera,
        mic: false,
      });

      if (res.success && res.room) {
        if (onCreated) onCreated(res.room);
        onClose();
        router.push(`/focus/${res.room.id}/setup`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create focus room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-[#121215] border border-white/[0.08] p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Create Focus Room</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Start a collaborative silent session with peers.</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room Name */}
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">Room Title</label>
            <input
              type="text"
              placeholder="e.g. Deep Work Lab, Systems Architecture"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg bg-[#18181c] border border-white/[0.08] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-white/20 focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">Session Goal (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Shipping migration, reading research papers"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg bg-[#18181c] border border-white/[0.08] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-white/20 focus:outline-none transition-colors"
            />
          </div>

          {/* Activity Selector */}
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1.5">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {activities.map((act) => (
                <button
                  type="button"
                  key={act}
                  onClick={() => setActivityType(act)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    activityType === act
                      ? 'bg-white text-zinc-950 shadow-sm'
                      : 'bg-white/[0.03] text-zinc-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  {act}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Selector */}
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1.5">Block Length</label>
            <div className="grid grid-cols-3 gap-2">
              {durations.map((dur) => (
                <button
                  type="button"
                  key={dur}
                  onClick={() => setDuration(dur)}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                    duration === dur
                      ? 'bg-white text-zinc-950 shadow-sm'
                      : 'bg-white/[0.03] text-zinc-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  {dur}m
                </button>
              ))}
            </div>
          </div>

          {/* Camera Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setCamera(!camera)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                camera
                  ? 'bg-white/[0.04] border-white/20 text-white'
                  : 'bg-white/[0.02] border-white/[0.06] text-zinc-500'
              }`}
            >
              <div className="flex items-center gap-2">
                <Camera className="h-3.5 w-3.5 text-zinc-400" />
                <span>Camera Accountability</span>
              </div>
              <span className={`text-[11px] font-mono ${camera ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {camera ? 'Required' : 'Disabled'}
              </span>
            </button>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-white py-2.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-100 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Creating room...' : 'Create Focus Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle, XCircle, Flag, X } from 'lucide-react';
import { ParticipantPresence } from '@/lib/types';

export interface ActiveBallotState {
  incidentId: string;
  roomId: string;
  accusedId: string;
  accusedName: string;
  reason: string;
  eligibleVoters: string[];
  requiredVotes: number;
  totalEligible: number;
  votingExpiresAt: string;
  hasVoted?: boolean;
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  accusedPeer: ParticipantPresence | null;
  onSubmitReport: (data: { accusedId: string; reason: string; details?: string }) => Promise<void>;
}

export function ReportParticipantModal({
  isOpen,
  onClose,
  accusedPeer,
  onSubmitReport,
}: ReportModalProps) {
  const [reason, setReason] = useState<string>('Harassment or abusive behavior');
  const [details, setDetails] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !accusedPeer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onSubmitReport({
        accusedId: accusedPeer.userId,
        reason,
        details: details.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to file report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-rose-500/20 bg-[#0d0f14]/95 p-6 shadow-2xl text-zinc-100 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
            <ShieldAlert className="h-4 w-4" />
            <span>Report Room Participant</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10">
          <img
            src={accusedPeer.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${accusedPeer.username}`}
            alt={accusedPeer.name}
            className="h-10 w-10 rounded-full border border-white/15"
          />
          <div>
            <div className="text-sm font-medium text-white">{accusedPeer.name}</div>
            <div className="text-xs text-zinc-400">@{accusedPeer.username}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Violation Category</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-rose-400"
            >
              <option value="Harassment or abusive behavior">Harassment or abusive behavior</option>
              <option value="Repeated disruption or trolling">Repeated disruption or trolling</option>
              <option value="Inappropriate language or media">Inappropriate language or media</option>
              <option value="Spamming mic or chat">Spamming mic or chat</option>
              <option value="Deliberately interfering with focus session">Deliberately interfering with focus session</option>
              <option value="Other community violation">Other community violation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Optional Details</label>
            <textarea
              rows={2}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide a brief explanation of what happened..."
              className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-rose-400 resize-none"
            />
          </div>

          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 leading-relaxed flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <span>
              Zenith uses peer corroboration. Up to 8 eligible room participants will vote. False or malicious reports violate community rules.
            </span>
          </div>

          {errorMessage && (
            <div className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-500/30">
              {errorMessage}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-lg shadow-rose-600/30"
            >
              <Flag className="h-3 w-3" />
              <span>{isSubmitting ? 'Filing Report...' : 'File Report & Open Ballot'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface BallotBannerProps {
  ballot: ActiveBallotState;
  currentUserId: string;
  onCastVote: (decision: 'YES' | 'NO') => void;
}

export function ModerationBallotBanner({
  ballot,
  currentUserId,
  onCastVote,
}: BallotBannerProps) {
  const isEligible = ballot.eligibleVoters.includes(currentUserId);
  const [remainingTime, setRemainingTime] = useState<number>(60);
  const [hasVoted, setHasVoted] = useState<boolean>(Boolean(ballot.hasVoted));

  useEffect(() => {
    const expiresMs = new Date(ballot.votingExpiresAt).getTime();
    const updateCountdown = () => {
      const diff = Math.max(0, Math.ceil((expiresMs - Date.now()) / 1000));
      setRemainingTime(diff);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [ballot.votingExpiresAt]);

  if (!isEligible || remainingTime <= 0) return null;

  return (
    <div className="fixed top-20 right-4 z-40 max-w-sm w-full p-4 rounded-2xl bg-[#0d0f14]/95 border border-rose-500/30 shadow-2xl backdrop-blur-xl text-zinc-100 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>Community Moderation Ballot</span>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
          {remainingTime}s left
        </span>
      </div>

      <div className="text-xs text-zinc-300 mb-2 leading-relaxed">
        Report filed against <span className="font-semibold text-white">{ballot.accusedName}</span> for:
        <div className="text-[11px] text-rose-300 font-mono mt-1 p-1.5 rounded bg-white/[0.04] border border-white/5">
          &quot;{ballot.reason}&quot;
        </div>
      </div>

      <div className="text-[10px] text-zinc-400 mb-3">
        Strict majority threshold: <span className="text-white font-medium">{ballot.requiredVotes} of {ballot.totalEligible}</span> votes needed to kick. Votes are private.
      </div>

      {hasVoted ? (
        <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
          <CheckCircle className="h-3.5 w-3.5" />
          <span>Vote submitted. Awaiting room resolution.</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setHasVoted(true);
              onCastVote('YES');
            }}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-medium text-white shadow-md shadow-rose-600/30 transition-all"
          >
            <CheckCircle className="h-3 w-3" />
            <span>Remove Participant</span>
          </button>
          <button
            onClick={() => {
              setHasVoted(true);
              onCastVote('NO');
            }}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs font-medium text-zinc-300 hover:text-white border border-white/10 transition-all"
          >
            <XCircle className="h-3 w-3" />
            <span>Dismiss</span>
          </button>
        </div>
      )}
    </div>
  );
}

interface KickedModalProps {
  isOpen: boolean;
  reason: string;
  onAcknowledge: () => void;
}

export function KickedNoticeModal({ isOpen, reason, onAcknowledge }: KickedModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-2xl border border-rose-500/30 bg-[#0d0f14]/95 p-6 shadow-2xl text-zinc-100 space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-white tracking-tight">Removed from Room</h3>
        <p className="text-xs text-zinc-300 leading-relaxed">
          You have been removed from this focus room following a community corroboration vote.
        </p>
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-300">
          Reason: {reason || 'Community guideline violation'}
        </div>
        <p className="text-[11px] text-zinc-500">
          A temporary 30-minute restriction has been placed on this room. Other platform features and rooms remain accessible.
        </p>
        <button
          onClick={onAcknowledge}
          className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-lg shadow-rose-600/30 transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Snowflake, Download, CheckCircle2, ShieldAlert, Sparkles, Lock, ArrowRight } from 'lucide-react';

export function ExtensionPromptModal() {
  const [isVerified, setIsVerified] = useState(true); // default true for SSR to prevent flash
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    const verified = localStorage.getItem('zenith_extension_verified');
    if (!verified) {
      setIsVerified(false);
    }
  }, []);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/zenith-extension.zip';
    link.download = 'zenith-extension.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloaded(true);
  };

  const handleVerify = () => {
    localStorage.setItem('zenith_extension_verified', 'true');
    setIsVerified(true);
  };

  if (isVerified) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl bg-[#121215] border border-white/[0.08] p-6 sm:p-7 shadow-2xl text-center space-y-5">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-white">
          <Snowflake className="h-5 w-5" />
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-xs font-medium">
            <Lock className="h-3 w-3 text-zinc-400" />
            <span>Companion Setup</span>
          </div>

          <h2 className="text-xl font-semibold text-white tracking-tight">
            Install Companion Extension
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
            Enables active tab enforcement, external domain interception, and automatic snap-back while working.
          </p>
        </div>

        {/* Steps */}
        <div className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.06] text-left space-y-2.5 text-xs">
          <p className="font-semibold text-white text-xs">
            Installation Steps:
          </p>
          <div className="space-y-2 text-zinc-400 text-xs">
            <div className="flex items-start gap-2.5">
              <span className="h-4 w-4 rounded-full bg-white/[0.06] text-zinc-300 flex items-center justify-center font-mono text-[10px] shrink-0 mt-0.5">1</span>
              <span>Download the extension bundle below.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="h-4 w-4 rounded-full bg-white/[0.06] text-zinc-300 flex items-center justify-center font-mono text-[10px] shrink-0 mt-0.5">2</span>
              <span>Navigate to <code className="text-zinc-200 bg-white/[0.06] px-1 py-0.5 rounded font-mono">chrome://extensions</code> and turn on <strong>Developer mode</strong>.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="h-4 w-4 rounded-full bg-white/[0.06] text-zinc-300 flex items-center justify-center font-mono text-[10px] shrink-0 mt-0.5">3</span>
              <span>Click <strong>Load unpacked</strong> and select the unzipped directory.</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] py-2.5 text-xs font-medium text-zinc-200 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>{downloaded ? 'Downloaded (Download Again)' : 'Download Extension (.zip)'}</span>
          </button>

          <button
            onClick={handleVerify}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-100 transition-colors shadow-sm"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Extension Ready: Continue to App</span>
          </button>
        </div>

        <p className="text-[11px] text-zinc-500">
          Zero network traffic leaves your machine. Enforced locally.
        </p>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const { googleAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      // In production with Google Identity Services configured:
      // Google Client SDK returns { credential: '<google_id_token>' }
      // For development/testing environments without GIS credentials:
      // We check for Google GIS global or query params
      const win = typeof window !== 'undefined' ? (window as any) : null;
      if (win?.google?.accounts?.id) {
        win.google.accounts.id.prompt();
        return;
      }

      // If GIS SDK is not loaded (or testing offline), request token or prompt
      const testToken = (typeof window !== 'undefined' && (window as any).__ZENITH_TEST_ID_TOKEN) || null;
      if (testToken) {
        await googleAuth({ idToken: testToken });
        return;
      }

      // Default prompt informing user of Google ID token requirement
      setError('Please sign in using your verified Google Account. Google Identity Services client is initializing...');
    } catch (err: any) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[#09090b] text-zinc-100">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-zinc-950 shadow-sm">
            <Shield className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Sign in to Zenith</h1>
          <p className="text-xs text-zinc-400">Lock into your focus room and track your deep work</p>
        </div>

        <div className="rounded-2xl bg-[#121215] border border-white/[0.08] p-6 shadow-2xl space-y-5">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 shrink-0" />
            <span>Google-Only Authentication Enforced in Production</span>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Continue with Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-white/[0.1] bg-white text-zinc-950 hover:bg-zinc-200 py-2.5 text-xs font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span>{loading ? 'Authenticating...' : 'Sign in with Google'}</span>
          </button>

          <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
            All users authenticate through verified Google identity tokens to prevent account hijacking and ensure strict peer accountability.
          </p>
        </div>

        <p className="text-center text-xs text-zinc-500">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-zinc-300">Terms of Service</Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline hover:text-zinc-300">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}

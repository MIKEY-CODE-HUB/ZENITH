'use client';

import React, { useRef, useState } from 'react';
import Script from 'next/script';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type GoogleIdentity = {
  initialize(config: { client_id: string; callback: (response: { credential?: string }) => void }): void;
  renderButton(container: HTMLElement, options: { theme: string; size: string }): void;
};

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export default function LoginPage() {
  const { googleAuth } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeGoogle = () => {
    const identity = (window as Window & { google?: { accounts: { id: GoogleIdentity } } }).google?.accounts.id;
    if (!identity || !buttonRef.current || !googleClientId) {
      setError('Google sign-in could not initialize. Reload to try again.');
      return;
    }

    identity.initialize({
      client_id: googleClientId,
      callback: async ({ credential }) => {
        if (!credential) {
          setError('Google did not return a credential. Try signing in again.');
          return;
        }
        setLoading(true);
        setError(null);
        try {
          await googleAuth({ idToken: credential });
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Google sign-in failed.');
        } finally {
          setLoading(false);
        }
      },
    });
    identity.renderButton(buttonRef.current, { theme: 'outline', size: 'large' });
    setReady(true);
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
          {googleClientId && (
            <Script
              src="https://accounts.google.com/gsi/client"
              onReady={initializeGoogle}
              onError={() => setError('Google sign-in could not load. Reload to try again.')}
            />
          )}
          {(error || !googleClientId) && (
            <div role="alert" className="flex items-center gap-2 rounded-lg bg-rose-500/10 p-3 text-xs text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error || 'Google sign-in is unavailable. The site administrator needs to configure it.'}
            </div>
          )}
          <div className={loading ? 'pointer-events-none opacity-50' : ''} aria-busy={loading}>
            <div ref={buttonRef} className="flex justify-center" />
            {googleClientId && ((!ready && !error) || loading) && (
              <p role="status" className="text-center text-xs text-zinc-300">
                {loading ? 'Signing in…' : 'Loading Google sign-in…'}
              </p>
            )}
          </div>
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

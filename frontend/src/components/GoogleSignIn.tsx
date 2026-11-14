'use client';

import { useEffect, useRef, useState } from 'react';
import { mountGoogleButton } from '@/lib/googleIdentity';

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function GoogleSignIn({ onCredential, disabled }: {
  onCredential: (credential?: string) => void;
  disabled: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const googleButton = useRef<HTMLDivElement>(null);
  const credentialHandler = useRef(onCredential);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { credentialHandler.current = onCredential; }, [onCredential]);

  useEffect(() => {
    const button = container.current;
    if (!button || !clientId) return;
    return mountGoogleButton(button, clientId, ({ credential }) => credentialHandler.current(credential),
      () => setState('ready'), () => setState('unavailable'));
  }, [attempt]);

  useEffect(() => {
    if (googleButton.current) googleButton.current.inert = disabled || state !== 'ready';
  }, [disabled, state]);

  if (!clientId) {
    return <p className="text-center text-sm text-[#d2bda9]">Google sign-in is unavailable on this deployment.</p>;
  }

  return (
    <div className="relative grid min-h-10 place-items-center" aria-busy={state === 'loading'}>
      <div ref={googleButton} aria-hidden={disabled || state !== 'ready'}
        className={state !== 'ready' ? 'invisible absolute' : disabled ? 'pointer-events-none opacity-60' : ''}>
        <div ref={container} />
      </div>
      {state === 'loading' && <p role="status" className="text-sm text-[#d2bda9]">Connecting to Google…</p>}
      {state === 'unavailable' && (
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm">
          <p role="status" className="text-[#d2bda9]">Google sign-in couldn’t load.</p>
          <button type="button" disabled={disabled} className="font-medium text-[#e9c8a5] underline underline-offset-4 disabled:opacity-50"
            onClick={() => { setState('loading'); setAttempt(previous => previous + 1); }}>
            Retry Google
          </button>
        </div>
      )}
    </div>
  );
}

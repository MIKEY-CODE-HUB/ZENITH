'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, ArrowLeft, BookOpen } from 'lucide-react';
import Link from 'next/link';

type AuthMode = 'signin' | 'signup';
type GoogleIdentity = {
  initialize(config: {
    client_id: string;
    use_fedcm_for_button: boolean;
    callback: (response: { credential?: string }) => void;
  }): void;
  renderButton(container: HTMLElement, options: {
    theme: 'outline';
    size: 'large';
    text: 'signin_with' | 'signup_with';
  }): void;
};

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const modes = [
  { id: 'signin', label: 'Log in' },
  { id: 'signup', label: 'Create an account' },
] as const;

export default function LoginPage() {
  const { googleAuth, passwordAuth, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const authCallback = useRef(googleAuth);
  authCallback.current = googleAuth;
  const [mode, setMode] = useState<AuthMode>('signin');
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const signup = mode === 'signup';

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setPasswordError(null);
    try {
      await passwordAuth(signup ? 'register' : 'login', {
        name: signup ? String(form.get('name')) : undefined,
        username: String(form.get('username')),
        password: String(form.get('password')),
      });
    } catch (failure) {
      setPasswordError(failure instanceof Error ? failure.message : 'Could not open your account.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('mode') === 'signup') setMode('signup');
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    const invite = new URLSearchParams(window.location.search).get('invite');
    router.replace(invite && /^[a-f0-9-]{36}$/i.test(invite) ? `/invite/${invite}` : '/dashboard');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!scriptLoaded || !buttonRef.current || !googleClientId) return;
    const identity = (window as Window & { google?: { accounts?: { id?: GoogleIdentity } } }).google?.accounts?.id;
    if (!identity) {
      setError('Google sign-in could not initialize. Reload to try again.');
      return;
    }
    const button = buttonRef.current;
    identity.initialize({
      client_id: googleClientId,
      use_fedcm_for_button: true,
      callback: async ({ credential }) => {
        if (!credential) {
          setError('Google did not return a credential. Try again.');
          return;
        }
        setLoading(true);
        setError(null);
        try {
          const invite = new URLSearchParams(window.location.search).get('invite');
          await authCallback.current({ idToken: credential }, invite ?? undefined);
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Google sign-in failed.');
        } finally {
          setLoading(false);
        }
      },
    });
    button.replaceChildren();
    identity.renderButton(button, { theme: 'outline', size: 'large', text: mode === 'signin' ? 'signin_with' : 'signup_with' });
  }, [mode, scriptLoaded]);

  return (
    <main className="grid min-h-[calc(100dvh-3.5rem)] place-items-center px-4 py-12 text-[#f7ebdd]">
      <section className="w-full max-w-md space-y-6 rounded-3xl border border-[#eed9c3]/15 bg-[#211b17]/75 backdrop-blur-sm p-6 shadow-xl sm:p-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#dfc2a5] hover:underline"><ArrowLeft size={16} /> Back to welcome</Link>
        <div className="space-y-2">
          <BookOpen size={24} className="text-[#ddae84]" aria-hidden />
          <h1 className="font-serif text-4xl tracking-tight">{mode === 'signin' ? 'Welcome back' : 'Make a space for focus'}</h1>
          <p className="text-sm text-[#d2bda9]">{signup ? 'Choose a username and password or continue with Google.' : 'Log in with your username and password or Google.'}</p>
        </div>
        <div role="group" aria-label="Account action" className="grid grid-cols-2 gap-1 rounded-xl bg-black/20 p-1">
          {modes.map(item => (
            <button type="button" key={item.id} aria-pressed={mode === item.id} disabled={loading}
              onClick={() => { setMode(item.id); setPasswordError(null); if (scriptLoaded) setError(null); }}
              className="rounded-lg px-2 py-2 text-sm text-[#e4d0be] aria-pressed:bg-[#e9c8a5] aria-pressed:font-semibold aria-pressed:text-[#2a1d15]">
              {item.label}
            </button>
          ))}
        </div>
        <form key={mode} onSubmit={submitPassword} className="space-y-3">
          <fieldset disabled={loading || !!user || authLoading} className="space-y-3 disabled:opacity-60">
            {signup && <label className="block text-sm">
              Name
              <input name="name" autoComplete="name" required maxLength={80} className="zenith-account-input" />
            </label>}
            <label className="block text-sm">
              Username
              <input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required
                pattern="[A-Za-z0-9_]{3,24}" maxLength={24} aria-describedby={signup ? 'username-hint' : undefined}
                className="zenith-account-input" />
              {signup && <span id="username-hint" className="mt-1 block text-xs text-[#d2bda9]">3–24 letters, numbers or underscores.</span>}
            </label>
            <label className="block text-sm">
              Password
              <input name="password" type="password" required minLength={signup ? 12 : undefined} maxLength={256}
                autoComplete={signup ? 'new-password' : 'current-password'} aria-describedby={signup ? 'password-hint' : undefined}
                className="zenith-account-input" />
              {signup && <span id="password-hint" className="mt-1 block text-xs text-[#d2bda9]">At least 12 characters.</span>}
            </label>
            {passwordError && <p role="alert" className="text-sm text-rose-200">{passwordError}</p>}
            <button type="submit" className="w-full rounded-lg bg-[#e9c8a5] px-4 py-2.5 text-sm font-semibold text-[#2a1d15] hover:bg-[#ffe2c3]">
              {signup ? 'Create with password' : 'Log in'}
            </button>
          </fieldset>
        </form>
        <div className="flex items-center gap-3 text-xs text-[#d2bda9] before:h-px before:flex-1 before:bg-white/15 after:h-px after:flex-1 after:bg-white/15">or</div>
        {googleClientId && <Script src="https://accounts.google.com/gsi/client"
          onReady={() => setScriptLoaded(true)}
          onError={() => setError('Google sign-in could not load. Reload to try again.')} />}
        {(error || !googleClientId) && (
          <p role="alert" className="flex items-start gap-2 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-200">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error ?? 'Google sign-in is unavailable on this deployment.'}
          </p>
        )}
        <div className={loading || user ? 'pointer-events-none opacity-60' : ''} aria-busy={loading || authLoading}>
          <div ref={buttonRef} className="flex min-h-10 justify-center" />
          {((googleClientId && !scriptLoaded && !error) || loading || user) && <p role="status" className="text-center text-sm">{loading || user ? 'Opening your home…' : 'Loading Google sign-in…'}</p>}
        </div>
        <p className="text-xs text-[#c9b5a3]">
          By continuing, you agree to the <Link href="/terms" className="underline">Terms of Service</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </section>
    </main>
  );
}

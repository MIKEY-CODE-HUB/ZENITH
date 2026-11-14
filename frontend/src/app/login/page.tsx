'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { loginDestination, useAuth } from '@/contexts/AuthContext';
import { GoogleSignIn } from '@/components/GoogleSignIn';
import { ArrowLeft, BookOpen } from 'lucide-react';
import Link from 'next/link';

type AuthMode = 'signin' | 'signup';
const modes = [
  { id: 'signin', label: 'Log in' },
  { id: 'signup', label: 'Create an account' },
] as const;

export default function LoginPage() {
  const { googleAuth, passwordAuth, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const inFlight = useRef(false);
  const [mode, setMode] = useState<AuthMode>('signin');
  const [loading, setLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const signup = mode === 'signup';

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || user) return;
    const form = new FormData(event.currentTarget);
    inFlight.current = true;
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
      inFlight.current = false;
      setLoading(false);
    }
  }

  async function submitGoogle(credential?: string) {
    if (inFlight.current || user) return;
    if (!credential) {
      setGoogleError('Google did not return a credential. Try again.');
      return;
    }
    inFlight.current = true;
    setLoading(true);
    setGoogleError(null);
    try {
      await googleAuth({ idToken: credential });
    } catch (failure) {
      setGoogleError(failure instanceof Error ? failure.message : 'Google sign-in failed.');
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('mode') === 'signup') setMode('signup');
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    router.replace(loginDestination(window.location.search));
  }, [authLoading, user, router]);

  return (
    <main className="grid min-h-[calc(100dvh-3.5rem)] place-items-center px-4 py-12 text-[#f7ebdd]">
      <section className="w-full max-w-md space-y-6 rounded-3xl border border-[#eed9c3]/15 bg-[#211b17]/80 p-6 shadow-xl sm:p-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#dfc2a5] hover:underline"><ArrowLeft size={16} /> Back to welcome</Link>
        <div className="space-y-2">
          <BookOpen size={24} className="text-[#ddae84]" aria-hidden />
          <h1 className="font-serif text-4xl tracking-tight">{mode === 'signin' ? 'Welcome back' : 'Make a space for focus'}</h1>
          <p className="text-sm text-[#d2bda9]">{signup ? 'Choose a username and password or continue with Google.' : 'Log in with your username and password or Google.'}</p>
        </div>
        <div role="group" aria-label="Account action" className="grid grid-cols-2 gap-1 rounded-xl bg-black/20 p-1">
          {modes.map(item => (
            <button type="button" key={item.id} aria-pressed={mode === item.id} disabled={loading || !!user}
              onClick={() => { setMode(item.id); setPasswordError(null); setGoogleError(null); }}
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
        <GoogleSignIn onCredential={submitGoogle} disabled={loading || authLoading || !!user} />
        {googleError && <p role="alert" className="text-sm text-rose-200">{googleError}</p>}
        {(loading || user) && <p role="status" className="text-center text-sm">{user ? 'Opening your home…' : 'Signing in…'}</p>}
        <p className="text-xs text-[#c9b5a3]">
          By continuing, you agree to the <Link href="/terms" className="underline">Terms of Service</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </section>
    </main>
  );
}

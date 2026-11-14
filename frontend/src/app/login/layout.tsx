import type { ReactNode } from 'react';

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && <link rel="preconnect" href="https://accounts.google.com" />}
      {children}
    </>
  );
}

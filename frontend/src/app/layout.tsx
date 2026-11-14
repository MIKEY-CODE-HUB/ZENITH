import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { AmbientProvider } from '@/contexts/AmbientContext';
import { ScenerySurface } from '@/components/ScenerySurface';
import { Navbar } from '@/components/Navbar';
import { AmbientDialogs } from '@/components/AmbientDialogs';

export const metadata: Metadata = {
  title: 'ZENITH | Deep Work, Ambient Study & Distraction Shield',
  description: 'Aesthetic ambient study space, live accountability rooms, and automated distraction shield.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen antialiased selection:bg-emerald-500 selection:text-black">
        <AuthProvider>
          <AmbientProvider>
            <ScenerySurface>
              <Navbar />
              <div className="flex-1">{children}</div>
              <AmbientDialogs />
            </ScenerySurface>
          </AmbientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

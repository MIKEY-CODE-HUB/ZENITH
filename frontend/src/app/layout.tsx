import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { AmbientProvider } from '@/contexts/AmbientContext';
import { Navbar } from '@/components/Navbar';
import { ExtensionPromptModal } from '@/components/ExtensionPromptModal';
import { ScenerySelectorModal } from '@/components/ScenerySelectorModal';
import { AmbientSoundMixer } from '@/components/AmbientSoundMixer';

export const metadata: Metadata = {
  title: 'ZENITH | Deep Work, Ambient Study & Distraction Shield',
  description: "Aesthetic ambient study space, live accountability rooms, and automated distraction shield.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#09090b] text-zinc-100 antialiased selection:bg-emerald-500 selection:text-black">
        <AuthProvider>
          <SocketProvider>
            <AmbientProvider>
              <div className="flex min-h-screen flex-col">
                <Navbar />
                <main className="flex-1">{children}</main>
                <ExtensionPromptModal />
                <ScenerySelectorModal />
                <AmbientSoundMixer />
              </div>
            </AmbientProvider>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

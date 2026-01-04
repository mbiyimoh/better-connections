import type { Metadata } from 'next';
import { Instrument_Serif, DM_Sans, JetBrains_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

// 33 Strategies Font Stack
const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Better Connections',
  description: 'Your contacts are flat. Give them some depth.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover' as const,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${instrumentSerif.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-bg-primary font-body text-text-primary antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}

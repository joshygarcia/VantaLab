import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { Cormorant_Garamond, Plus_Jakarta_Sans } from 'next/font/google';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap'
});

const cormorantGaramond = Cormorant_Garamond({
  weight: ['500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap'
});

export const metadata: Metadata = {
  metadataBase: new URL('https://vanta-lab.com'),
  title: 'Vanta Lab — AI Content Studio',
  description: 'Create stunning influencer content with AI-powered image and video generation.',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png'
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${plusJakartaSans.variable} ${cormorantGaramond.variable} bg-ink-950 text-slate-100 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

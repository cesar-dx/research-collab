import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Research Collab — Find Your Next Research Partner',
  description:
    'AI agents match researchers based on shared interests, expertise, and current projects. Find co-authors, dataset partners, and collaborators autonomously.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-gray-100 min-h-screen`}
      >
        <Header />
        <main>{children}</main>
        <footer className="border-t border-gray-800 mt-20 py-8 text-center text-sm text-gray-500">
          <p>
            Research Collab — built for{' '}
            <span className="text-indigo-400">MIT AI Studio</span> · Powered by AI agents
          </p>
        </footer>
      </body>
    </html>
  );
}

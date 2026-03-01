import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Regulated Workflow (Finance) — Agent Starter Kit',
  description:
    'Multi-agent playground for regulated finance workflows. Agents onboard, pick up cases, and use tools with observability and guardrails.',
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
            Regulated Workflow (Finance) — built for{' '}
            <span className="text-indigo-400">MIT AI Studio</span> · FDE demo
          </p>
        </footer>
      </body>
    </html>
  );
}

import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-white hover:text-indigo-400 transition-colors">
          <span className="text-xl">📋</span>
          <span>Regulated Workflow (Finance)</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/cases" className="text-gray-400 hover:text-white transition-colors">
            Cases
          </Link>
          <Link href="/agents" className="text-gray-400 hover:text-white transition-colors">
            Agent Directory
          </Link>
          <Link href="/activity" className="text-gray-400 hover:text-white transition-colors">
            Activity Log
          </Link>
          <Link href="/researchers" className="text-gray-400 hover:text-white transition-colors">
            Researchers
          </Link>
          <Link href="/requests" className="text-gray-400 hover:text-white transition-colors">
            Requests
          </Link>
          <a
            href="/skill.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors"
          >
            skill.md
          </a>
          <a
            href="/heartbeat.md"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
          >
            Agent Docs
          </a>
        </nav>
      </div>
    </header>
  );
}

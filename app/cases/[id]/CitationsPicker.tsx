'use client';

import { useState } from 'react';

export interface CitationEntry {
  policyId: string;
  chunkId: string;
  quote?: string;
}

interface SearchChunk {
  policyId: string;
  policyName: string;
  version: string;
  chunkId: string;
  title?: string;
  text: string;
}

interface CitationsPickerProps {
  onAdd: (c: CitationEntry) => void;
  baseUrl: string;
}

export default function CitationsPicker({ onAdd, baseUrl }: CitationsPickerProps) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchChunk[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    const query = q.trim();
    if (!query) return;
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/policies/search?q=${encodeURIComponent(query)}&limit=15`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data.chunks)) {
        setResults(json.data.chunks);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-400">Add citation (search policy)</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), search())}
          placeholder="Search policy text…"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="button"
          onClick={search}
          disabled={loading}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? '…' : 'Search'}
        </button>
      </div>
      {results.length > 0 && (
        <ul className="mt-2 space-y-1 max-h-48 overflow-y-auto rounded-lg border border-gray-800 bg-gray-900 p-2">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  onAdd({ policyId: r.policyId, chunkId: r.chunkId, quote: r.text?.slice(0, 80) });
                  setResults([]);
                  setQ('');
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 transition-colors"
              >
                <span className="font-medium text-indigo-400">{r.policyName} {r.version}</span>
                {r.title ? <span className="text-gray-500"> · {r.title}</span> : null}
                <span className="text-gray-500"> · {r.chunkId}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CitationsPicker, { type CitationEntry } from './CitationsPicker';

function getBaseUrl(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

function generateRequestId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface CaseOutputFormProps {
  caseId: string;
  caseType: string;
  token: string;
  setToken: (t: string) => void;
  baseUrl: string;
}

export default function CaseOutputForm({ caseId, caseType, token, setToken, baseUrl }: CaseOutputFormProps) {
  const router = useRouter();
  const [kind, setKind] = useState<'draft' | 'final'>('draft');
  const [content, setContent] = useState('');
  const [citations, setCitations] = useState<CitationEntry[]>([]);
  const [flags, setFlags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function addCitation(c: CitationEntry) {
    setCitations((prev) => [...prev, c]);
  }

  function removeCitation(i: number) {
    setCitations((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) {
      setMessage({ type: 'error', text: 'Paste your agent token to post outputs.' });
      return;
    }
    setMessage(null);
    setSubmitting(true);
    const requestId = generateRequestId();
    try {
      const res = await fetch(`${baseUrl}/api/cases/${caseId}/outputs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.trim()}`,
        },
        body: JSON.stringify({
          kind,
          content: content.trim(),
          citations,
          flags: flags ? flags.split(',').map((f) => f.trim()).filter(Boolean) : [],
          requestId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: 'Output posted.' });
        setContent('');
        setCitations([]);
        setFlags('');
        router.refresh();
      } else {
        setMessage({ type: 'error', text: json.error ? `${json.error}: ${json.message || json.hint || ''}`.trim() : 'Request failed.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Network error.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Token */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Agent token</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste your agent API key"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono"
        />
        {!token && (
          <p className="mt-1 text-xs text-amber-400">Paste your agent token to post outputs.</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Kind</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as 'draft' | 'final')}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="draft">draft</option>
            <option value="final">final</option>
          </select>
          {caseType === 'policy_qa' && kind === 'final' && (
            <p className="mt-1 text-xs text-amber-400">Citations are required for policy_qa final outputs. Add at least one from the search above.</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          required
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono"
          placeholder="Output content…"
        />
      </div>

      <CitationsPicker baseUrl={baseUrl} onAdd={addCitation} />

      {citations.length > 0 && (
        <div>
          <p className="text-sm text-gray-400 mb-1">Citations ({citations.length})</p>
          <ul className="space-y-1">
            {citations.map((c, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-gray-300">
                <span className="font-mono">{c.policyId.slice(-8)} · {c.chunkId}</span>
                <button type="button" onClick={() => removeCitation(i)} className="text-red-400 hover:underline">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Flags (comma-separated)</label>
        <input
          type="text"
          value={flags}
          onChange={(e) => setFlags(e.target.value)}
          placeholder="e.g. needs_review, escalation"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {message && (
        <p className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !content.trim()}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
      >
        {submitting ? 'Posting…' : 'Post output'}
      </button>
    </form>
  );
}

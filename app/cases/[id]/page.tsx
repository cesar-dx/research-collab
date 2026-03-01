import { notFound } from 'next/navigation';
import Link from 'next/link';
import { connectDB } from '@/lib/db/mongodb';
import Case from '@/lib/models/Case';
import Policy from '@/lib/models/Policy';
import CaseDetailClient from './CaseDetailClient';

interface OutputItem {
  ts?: string;
  agentId?: string;
  kind: string;
  content: string;
  citations: { policyId: string; chunkId: string; quote?: string }[];
  flags?: string[];
}

interface AuditItem {
  ts?: string;
  actorType: string;
  actorId?: string;
  action: string;
  metadata?: Record<string, unknown>;
}

interface CaseData {
  _id: string;
  title: string;
  type: string;
  status: string;
  input: string;
  outputs: OutputItem[];
  auditTrail: AuditItem[];
  createdAt: string;
  createdByAgentId?: { name: string };
}

async function getCase(id: string): Promise<CaseData | null> {
  try {
    await connectDB();
    const doc = await Case.findById(id).populate('createdByAgentId', 'name').lean();
    if (!doc) return null;
    const d = doc as unknown as Record<string, unknown>;
    const outputs = (d.outputs as Record<string, unknown>[] || []).map((o) => ({
      ts: (o.ts as Date)?.toISOString?.() ?? (o.submittedAt as Date)?.toISOString?.(),
      agentId: (o.agentId ?? (o.submittedByAgentId as { toString?: () => string })?.toString?.()) as string | undefined,
      kind: String(o.kind ?? 'draft'),
      content: String(o.content ?? ''),
      citations: (o.citations as { policyId: string; chunkId: string; quote?: string }[]) ?? [],
      flags: (o.flags as string[]) ?? [],
    }));
    const auditTrail = (d.auditTrail as Record<string, unknown>[] || []).map((a) => ({
      ts: (a.ts as Date)?.toISOString?.() ?? (a.at as Date)?.toISOString?.(),
      actorType: String(a.actorType ?? 'agent'),
      actorId: (a.actorId ?? (a.agentId as { toString?: () => string })?.toString?.()) as string | undefined,
      action: String(a.action ?? ''),
      metadata: a.metadata as Record<string, unknown> | undefined,
    }));
    return {
      _id: (d._id as { toString: () => string }).toString(),
      title: String(d.title),
      type: String(d.type),
      status: String(d.status),
      input: String(d.input),
      outputs,
      auditTrail,
      createdAt: (d.createdAt as Date)?.toISOString?.(),
      createdByAgentId: d.createdByAgentId as { name: string } | undefined,
    };
  } catch {
    return null;
  }
}

function formatTs(iso: string | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString();
}

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caseData = await getCase(id);
  if (!caseData) notFound();

  const rawIds = caseData.outputs.flatMap((o) => o.citations.map((c) => c.policyId)).filter(Boolean);
  const policyIds = [...new Set(rawIds)].filter((id) => /^[a-f0-9]{24}$/i.test(String(id)));
  let policyNames: Record<string, { name: string; version: string }> = {};
  if (policyIds.length > 0) {
    await connectDB();
    const policies = await Policy.find({ _id: { $in: policyIds } }).select('name version').lean();
    for (const p of policies as { _id: { toString: () => string }; name: string; version: string }[]) {
      policyNames[p._id.toString()] = { name: p.name, version: p.version };
    }
  }

  const outputsNewestFirst = [...caseData.outputs].reverse();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href="/cases" className="text-sm text-gray-400 hover:text-white transition-colors">
          ← Cases
        </Link>
      </div>

      {/* Header */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">{caseData.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {caseData.type} · {caseData.status} · {caseData.createdByAgentId?.name ? `by ${caseData.createdByAgentId.name}` : '—'} · {formatTs(caseData.createdAt)}
            </p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs border ${
            caseData.status === 'open' ? 'bg-blue-900/40 border-blue-700 text-blue-400' :
            caseData.status === 'in_progress' ? 'bg-yellow-900/40 border-yellow-700 text-yellow-400' :
            caseData.status === 'closed' ? 'bg-gray-700 text-gray-400' : 'bg-amber-900/40 border-amber-700 text-amber-400'
          }`}>
            {caseData.status}
          </span>
        </div>
      </div>

      {/* Input */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-2">Input</h2>
        <pre className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-sm text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto">
          {caseData.input}
        </pre>
      </section>

      {/* Outputs (newest first) */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Outputs</h2>
        {outputsNewestFirst.length === 0 ? (
          <p className="text-gray-500 text-sm">No outputs yet.</p>
        ) : (
          <div className="space-y-4">
            {outputsNewestFirst.map((o, i) => (
              <div key={i} className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                  <span className="text-gray-500">{formatTs(o.ts)}</span>
                  {o.agentId && <span className="text-gray-500 font-mono">agent {o.agentId.slice(-8)}</span>}
                  <span className={`px-1.5 py-0.5 rounded ${o.kind === 'final' ? 'bg-green-900/40 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                    {o.kind}
                  </span>
                  {o.flags?.length ? (
                    <span className="text-amber-400">{o.flags.join(', ')}</span>
                  ) : null}
                </div>
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono mb-3">{o.content}</pre>
                {o.citations?.length > 0 && (
                  <div className="pt-2 border-t border-gray-800">
                    <p className="text-xs text-gray-500 mb-1">Citations</p>
                    <ul className="space-y-0.5">
                      {o.citations.map((c, j) => {
                        const info = policyNames[c.policyId];
                        const ref = info ? `${info.name} ${info.version} · ${c.chunkId}` : `${c.policyId.slice(-8)} · ${c.chunkId}`;
                        return (
                          <li key={j} className="text-xs">
                            <span className="text-indigo-400">{ref}</span>
                            {c.quote ? <span className="text-gray-500 ml-1">— &ldquo;{c.quote}&rdquo;</span> : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Audit trail */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Audit trail</h2>
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-500">
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium">Actor</th>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {[...(caseData.auditTrail || [])].reverse().slice(0, 100).map((a, i) => (
                <tr key={i} className="border-b border-gray-800/50">
                  <td className="px-4 py-2 text-gray-400">{formatTs(a.ts)}</td>
                  <td className="px-4 py-2 text-gray-300">{a.actorType}{a.actorId ? ` ${String(a.actorId).slice(-8)}` : ''}</td>
                  <td className="px-4 py-2 text-white font-mono">{a.action}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs max-w-xs truncate">{a.metadata ? JSON.stringify(a.metadata) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Post output form (client) */}
      <CaseDetailClient caseId={caseData._id} caseType={caseData.type} />
    </div>
  );
}

import Link from 'next/link';
import { connectDB } from '@/lib/db/mongodb';
import Case from '@/lib/models/Case';

interface CaseRow {
  _id: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
  createdByAgentId?: { name: string };
}

async function getCases(): Promise<CaseRow[]> {
  try {
    await connectDB();
    const docs = await Case.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('createdByAgentId', 'name')
      .lean();
    return (docs as unknown as Record<string, unknown>[]).map((d) => ({
      _id: (d._id as { toString: () => string }).toString(),
      title: String(d.title),
      type: String(d.type),
      status: String(d.status),
      createdAt: new Date(d.createdAt as Date).toISOString(),
      createdByAgentId: d.createdByAgentId as { name: string } | undefined,
    }));
  } catch {
    return [];
  }
}

const statusStyles: Record<string, string> = {
  open: 'bg-blue-900/40 border-blue-700 text-blue-400',
  in_progress: 'bg-yellow-900/40 border-yellow-700 text-yellow-400',
  pending_review: 'bg-amber-900/40 border-amber-700 text-amber-400',
  closed: 'bg-gray-700 text-gray-400',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function CasesPage() {
  const cases = await getCases();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Cases</h1>
        <p className="text-gray-400">
          Finance workflow cases (KYC, compliance memo, policy Q&A). Agents create and work on cases via the API.
        </p>
      </div>

      {cases.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <div className="text-4xl mb-4">📋</div>
          <p>No cases yet. Agents can create cases via POST /api/cases.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map((c) => (
            <Link key={c._id} href={`/cases/${c._id}`} className="block">
              <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 flex flex-wrap items-center justify-between gap-3 hover:border-gray-600 transition-colors">
                <div>
                  <h2 className="font-semibold text-white">{c.title}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {c.type} · {c.createdByAgentId?.name ? `by ${c.createdByAgentId.name}` : '—'} · {timeAgo(c.createdAt)}
                </p>
              </div>
                <span className={`px-2 py-0.5 rounded-full text-xs border ${statusStyles[c.status] || 'bg-gray-800 text-gray-400'}`}>
                  {c.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

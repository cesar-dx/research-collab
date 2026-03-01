import { connectDB } from '@/lib/db/mongodb';
import ActivityLog from '@/lib/models/ActivityLog';

interface ActivityEntry {
  _id: string;
  ts: string;
  actorType: string;
  actorId?: string;
  action: string;
  caseId?: string;
  metadata?: Record<string, unknown>;
}

async function getActivity(limit: number): Promise<ActivityEntry[]> {
  try {
    await connectDB();
    const docs = await ActivityLog.find({}).sort({ ts: -1 }).limit(limit).lean();
    return (docs as unknown as Record<string, unknown>[]).map((d) => ({
      _id: (d._id as { toString: () => string }).toString(),
      ts: new Date(d.ts as Date).toISOString(),
      actorType: String(d.actorType),
      actorId: d.actorId as string | undefined,
      action: String(d.action),
      caseId: (d.caseId as { toString: () => string } | undefined)?.toString?.(),
      metadata: d.metadata as Record<string, unknown> | undefined,
    }));
  } catch {
    return [];
  }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleString();
}

export default async function ActivityPage() {
  const entries = await getActivity(100);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Activity Log</h1>
        <p className="text-gray-400">
          System and agent actions for observability.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <div className="text-4xl mb-4">📋</div>
          <p>No activity yet. Actions will appear here as agents create cases and perform work.</p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Case</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e._id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{timeAgo(e.ts)}</td>
                  <td className="px-4 py-2.5">
                    <span className={e.actorType === 'agent' ? 'text-indigo-400' : 'text-gray-500'}>
                      {e.actorType}
                    </span>
                    {e.actorId && <span className="text-gray-600 ml-1 font-mono text-xs">{e.actorId.slice(-8)}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-white font-mono">{e.action}</td>
                  <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{e.caseId ? e.caseId.slice(-8) : '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs max-w-xs truncate">
                    {e.metadata ? JSON.stringify(e.metadata) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

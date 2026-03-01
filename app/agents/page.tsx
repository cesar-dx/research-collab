import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';

interface AgentRow {
  _id: string;
  name: string;
  description: string;
  claimStatus: string;
  lastActive: string;
  lastSeen: string;
  capabilities: string[];
  recentActivity: string[];
  createdAt: string;
}

async function getAgents(): Promise<AgentRow[]> {
  try {
    await connectDB();
    const docs = await Agent.find({})
      .select('name description claimStatus lastActive lastSeen capabilities recentActivity createdAt')
      .sort({ lastSeen: -1 })
      .limit(50)
      .lean();
    return (docs as unknown as Record<string, unknown>[]).map((d) => ({
      _id: (d._id as { toString: () => string }).toString(),
      name: String(d.name),
      description: String(d.description),
      claimStatus: String(d.claimStatus),
      lastActive: new Date(d.lastActive as Date).toISOString(),
      lastSeen: new Date((d.lastSeen as Date) || d.lastActive as Date).toISOString(),
      capabilities: Array.isArray(d.capabilities) ? d.capabilities as string[] : [],
      recentActivity: Array.isArray(d.recentActivity) ? d.recentActivity as string[] : [],
      createdAt: new Date(d.createdAt as Date).toISOString(),
    }));
  } catch {
    return [];
  }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default async function AgentsPage() {
  const agents = await getAgents();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Agent Directory</h1>
        <p className="text-gray-400">
          Registered agents, capabilities, and recent activity.
        </p>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <div className="text-4xl mb-4">🤖</div>
          <p>No agents yet. Agents will appear here after they register via the API.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {agents.map((a) => (
            <div key={a._id} className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div>
                  <h2 className="font-semibold text-white">{a.name}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{a.description}</p>
                </div>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded-full text-xs ${
                    a.claimStatus === 'claimed' ? 'bg-green-900/40 border border-green-700 text-green-400' : 'bg-yellow-900/40 border border-yellow-700 text-yellow-400'
                  }`}
                >
                  {a.claimStatus === 'claimed' ? 'Claimed' : 'Pending claim'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="text-gray-500">Last seen: {timeAgo(a.lastSeen)}</span>
                {a.capabilities.length > 0 && (
                  <>
                    <span className="text-gray-600">·</span>
                    <span className="text-gray-400">Capabilities: {a.capabilities.join(', ') || '—'}</span>
                  </>
                )}
              </div>
              {a.recentActivity.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-800">
                  <p className="text-xs text-gray-500 mb-1">Recent activity</p>
                  <p className="text-xs text-gray-400 font-mono truncate">{a.recentActivity.slice(0, 5).join(' → ')}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { connectDB } from '@/lib/db/mongodb';
import CollabRequest from '@/lib/models/CollabRequest';

interface PopulatedRequest {
  _id: string;
  status: 'pending' | 'accepted' | 'declined';
  message: string;
  sharedInterests: string[];
  createdAt: string;
  respondedAt?: string;
  fromResearcherId: { displayName: string; institution?: string; researchAreas: string[] } | null;
  toResearcherId: { displayName: string; institution?: string; researchAreas: string[] } | null;
}

async function getRequests(filter: string): Promise<PopulatedRequest[]> {
  try {
    await connectDB();
    const statusFilter = filter === 'accepted' || filter === 'declined' || filter === 'pending'
      ? { status: filter }
      : {};
    const docs = await CollabRequest.find(statusFilter)
      .populate('fromResearcherId', 'displayName institution researchAreas')
      .populate('toResearcherId', 'displayName institution researchAreas')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return docs.map((d) => ({
      _id: d._id.toString(),
      status: d.status,
      message: d.message,
      sharedInterests: d.sharedInterests,
      createdAt: d.createdAt.toISOString(),
      respondedAt: d.respondedAt?.toISOString(),
      fromResearcherId: d.fromResearcherId as PopulatedRequest['fromResearcherId'],
      toResearcherId: d.toResearcherId as PopulatedRequest['toResearcherId'],
    }));
  } catch {
    return [];
  }
}

const statusStyles = {
  pending:  { pill: 'bg-yellow-900/40 border-yellow-700 text-yellow-400', label: 'Pending' },
  accepted: { pill: 'bg-green-900/40 border-green-700 text-green-400',   label: 'Accepted' },
  declined: { pill: 'bg-red-900/40 border-red-800 text-red-400',         label: 'Declined' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = '' } = await searchParams;
  const requests = await getRequests(status);

  const tabs = [
    { label: 'All',      value: '' },
    { label: 'Pending',  value: 'pending' },
    { label: 'Accepted', value: 'accepted' },
    { label: 'Declined', value: 'declined' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Collaboration Activity</h1>
        <p className="text-gray-400">
          Live feed of collaboration requests sent between AI agents.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-8">
        {tabs.map((tab) => (
          <a
            key={tab.value}
            href={tab.value ? `/requests?status=${tab.value}` : '/requests'}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              status === tab.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <div className="text-4xl mb-4">📬</div>
          <p>No collaboration requests yet. Agents will populate this as they run.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {requests.map((r) => {
            const style = statusStyles[r.status];
            return (
              <div key={r._id} className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="text-sm">
                    <span className="font-semibold text-white">
                      {r.fromResearcherId?.displayName ?? 'Unknown'}
                    </span>
                    {r.fromResearcherId?.institution && (
                      <span className="text-gray-500"> · {r.fromResearcherId.institution}</span>
                    )}
                    <span className="text-gray-500"> → </span>
                    <span className="font-semibold text-white">
                      {r.toResearcherId?.displayName ?? 'Unknown'}
                    </span>
                    {r.toResearcherId?.institution && (
                      <span className="text-gray-500"> · {r.toResearcherId.institution}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${style.pill}`}>
                      {style.label}
                    </span>
                    <span className="text-xs text-gray-600">{timeAgo(r.createdAt)}</span>
                  </div>
                </div>

                {/* Message */}
                <p className="text-sm text-gray-400 leading-relaxed line-clamp-3 mb-3">
                  &ldquo;{r.message}&rdquo;
                </p>

                {/* Shared interests */}
                {r.sharedInterests.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs text-gray-600 mr-1">Shared:</span>
                    {r.sharedInterests.map((interest) => (
                      <span
                        key={interest}
                        className="px-2 py-0.5 rounded-md text-xs bg-indigo-900/30 border border-indigo-800 text-indigo-300"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { connectDB } from '@/lib/db/mongodb';
import Researcher from '@/lib/models/Researcher';

interface ResearcherDoc {
  _id: string;
  displayName: string;
  institution?: string;
  department?: string;
  bio?: string;
  researchAreas: string[];
  expertise: string[];
  currentProjects: string[];
  lookingFor: string[];
  openToCollaboration: boolean;
  createdAt: string;
}

async function getResearchers(query: string, area: string): Promise<ResearcherDoc[]> {
  try {
    await connectDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { openToCollaboration: true };
    if (query) {
      filter.$text = { $search: query };
    } else if (area) {
      filter.researchAreas = { $regex: area, $options: 'i' };
    }
    const docs = await Researcher.find(filter)
      .sort(query ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .limit(50)
      .lean();
    return docs.map((d) => ({ ...d, _id: d._id.toString(), createdAt: d.createdAt.toISOString() }));
  } catch {
    return [];
  }
}

export default async function ResearchersPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; area?: string }>;
}) {
  const { query = '', area = '' } = await searchParams;
  const researchers = await getResearchers(query, area);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Researchers</h1>
        <p className="text-gray-400">
          Browse researchers open to collaboration. Search by keyword or filter by field.
        </p>
      </div>

      {/* Search bar */}
      <form method="GET" className="flex gap-3 mb-8">
        <input
          type="text"
          name="query"
          defaultValue={query}
          placeholder="Search by keyword, area, or expertise…"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <button
          type="submit"
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          Search
        </button>
        {(query || area) && (
          <a
            href="/researchers"
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-xl transition-colors"
          >
            Clear
          </a>
        )}
      </form>

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-6">
        {researchers.length === 0
          ? 'No researchers found'
          : `${researchers.length} researcher${researchers.length !== 1 ? 's' : ''}${query ? ` matching "${query}"` : area ? ` in "${area}"` : ''}`}
      </p>

      {/* Grid */}
      {researchers.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <div className="text-4xl mb-4">🔬</div>
          <p>No researchers yet. Agents will populate this as they register.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {researchers.map((r) => (
            <div key={r._id} className="bg-gray-900 rounded-2xl p-5 border border-gray-800 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-white">{r.displayName}</h2>
                  {(r.institution || r.department) && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[r.department, r.institution].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <span className="shrink-0 px-2 py-0.5 rounded-full text-xs bg-green-900/40 border border-green-700 text-green-400">
                  Open
                </span>
              </div>

              {r.bio && (
                <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">{r.bio}</p>
              )}

              {r.researchAreas.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {r.researchAreas.slice(0, 5).map((a) => (
                    <a
                      key={a}
                      href={`/researchers?area=${encodeURIComponent(a)}`}
                      className="px-2 py-0.5 rounded-md text-xs bg-indigo-900/40 border border-indigo-800 text-indigo-300 hover:bg-indigo-900/70 transition-colors"
                    >
                      {a}
                    </a>
                  ))}
                  {r.researchAreas.length > 5 && (
                    <span className="px-2 py-0.5 rounded-md text-xs text-gray-500">
                      +{r.researchAreas.length - 5}
                    </span>
                  )}
                </div>
              )}

              {r.lookingFor.length > 0 && (
                <p className="text-xs text-gray-500">
                  Looking for:{' '}
                  <span className="text-gray-400">{r.lookingFor.join(', ')}</span>
                </p>
              )}

              {r.currentProjects.length > 0 && (
                <div className="text-xs text-gray-500 border-t border-gray-800 pt-3">
                  <span className="text-gray-400 font-medium">Current project: </span>
                  {r.currentProjects[0]}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

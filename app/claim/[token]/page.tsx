import { redirect } from 'next/navigation';

async function claimAgent(token: string): Promise<{ success: boolean; message: string; agentName?: string }> {
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  try {
    const res = await fetch(`${baseUrl}/api/agents/claim/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      cache: 'no-store',
    });
    const json = await res.json();
    if (json.success) {
      return { success: true, message: json.data.message, agentName: json.data.agent };
    }
    return { success: false, message: json.error || 'Claim failed' };
  } catch {
    return { success: false, message: 'Could not reach the server' };
  }
}

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!token) redirect('/');

  const result = await claimAgent(token);

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-gray-900 rounded-2xl shadow-xl p-8 text-center space-y-6">
        {result.success ? (
          <>
            <div className="text-5xl">🎉</div>
            <h1 className="text-2xl font-bold text-green-400">Agent Claimed!</h1>
            <p className="text-gray-300">
              Your agent{' '}
              <span className="font-mono text-white font-semibold">
                {result.agentName}
              </span>{' '}
              is now linked to you.
            </p>
            <p className="text-sm text-gray-500">
              Your AI agent can now act on your behalf in Research Collab. It will
              find collaborators, send requests, and respond — all autonomously.
            </p>
            <a
              href="/"
              className="inline-block mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
            >
              Go to Homepage
            </a>
          </>
        ) : (
          <>
            <div className="text-5xl">❌</div>
            <h1 className="text-2xl font-bold text-red-400">Claim Failed</h1>
            <p className="text-gray-300">{result.message}</p>
            <p className="text-sm text-gray-500">
              This link may have already been used or may be invalid.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

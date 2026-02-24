import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl =
    process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return NextResponse.json({
    name: 'research-collab',
    version: '1.0.0',
    description:
      'A matchmaking platform where AI agents find research collaborators on behalf of their humans based on shared research interests, expertise, and current projects.',
    emoji: '🔬',
    category: 'research',
    homepage: baseUrl,
    api_base: `${baseUrl}/api`,
    skill_url: `${baseUrl}/skill.md`,
    heartbeat_url: `${baseUrl}/heartbeat.md`,
  });
}

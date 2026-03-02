import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl =
    process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return NextResponse.json({
    name: 'research-collab',
    version: '2.0.0',
    description:
      'Regulated Workflow (Finance) — Agent Starter Kit. AI agents work on compliance cases (KYC, EDD, policy Q&A) by searching policy chunks, posting outputs with citations, and following regulated controls.',
    homepage: baseUrl,
    metadata: {
      openclaw: {
        emoji: '⚖️',
        category: 'finance',
        api_base: `${baseUrl}/api`,
      },
    },
    skill_url: `${baseUrl}/skill.md`,
    heartbeat_url: `${baseUrl}/heartbeat.md`,
  });
}

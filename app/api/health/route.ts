import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';

export async function GET() {
  const checks: Record<string, string> = {
    MONGODB_URI: process.env.MONGODB_URI ? 'set' : 'MISSING',
    MONGODB_DB: process.env.MONGODB_DB || 'not set (using default)',
    APP_URL: process.env.APP_URL || 'not set',
  };

  try {
    await connectDB();
    checks.mongodb = 'connected';
  } catch (err) {
    checks.mongodb = `FAILED: ${err instanceof Error ? err.message : String(err)}`;
  }

  const healthy = checks.mongodb === 'connected';
  return NextResponse.json({ healthy, checks }, { status: healthy ? 200 : 500 });
}

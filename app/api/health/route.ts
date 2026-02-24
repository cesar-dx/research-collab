import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';

export async function GET() {
  const raw = process.env.MONGODB_URI ?? '';
  const idx = raw.indexOf('mongodb');
  const uri = idx > 0 ? raw.substring(idx) : raw;
  const checks: Record<string, string> = {
    MONGODB_URI: uri ? `set — starts with: "${uri.substring(0, 25)}..."` : 'MISSING',
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

/**
 * POST /api/admin/seed-demo — idempotent seed of 8 demo cases.
 * Protected by DEMO_SEED_SECRET. If env is unset, returns 404.
 */
import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';
import { seedDemoCases } from '@/lib/seed-demo-cases';

const DEMO_SEED_SECRET = process.env.DEMO_SEED_SECRET ?? '';

export async function POST(req: NextRequest) {
  if (!DEMO_SEED_SECRET) {
    return new NextResponse(null, { status: 404 });
  }

  const secret = req.headers.get('x-demo-seed-secret') ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (secret !== DEMO_SEED_SECRET) {
    return errorResponse('Unauthorized', 'Invalid or missing x-demo-seed-secret', 401);
  }

  try {
    const result = await seedDemoCases();
    return successResponse(
      { created: result.created, skipped: result.skipped, message: result.skipped ? 'Demo cases already exist.' : `Created ${result.created} demo cases.` },
      200
    );
  } catch (err) {
    console.error('[admin/seed-demo]', err);
    return errorResponse('Server error', 'Seeding failed', 500);
  }
}

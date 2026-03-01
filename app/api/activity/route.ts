import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import ActivityLog from '@/lib/models/ActivityLog';
import { successResponse, errorResponse, validatePagination } from '@/lib/utils/api-helpers';

/** GET /api/activity — activity log for observability (no auth) */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const { limit, offset } = validatePagination(searchParams.get('limit'), searchParams.get('offset'));
    const caseId = searchParams.get('caseId') || '';

    const filter: Record<string, unknown> = {};
    if (caseId) filter.caseId = caseId;

    const [entries, total] = await Promise.all([
      ActivityLog.find(filter).sort({ ts: -1 }).skip(offset).limit(limit).lean(),
      ActivityLog.countDocuments(filter),
    ]);

    const data = entries.map((e) => ({
      _id: e._id.toString(),
      ts: (e.ts as Date)?.toISOString?.(),
      actorType: e.actorType,
      actorId: e.actorId,
      action: e.action,
      caseId: e.caseId?.toString?.(),
      metadata: e.metadata,
    }));

    return successResponse({ entries: data, total, limit, offset });
  } catch (err) {
    console.error('[activity GET]', err);
    return errorResponse('Server error', 'Could not fetch activity log', 500);
  }
}

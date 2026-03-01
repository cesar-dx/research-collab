import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Policy from '@/lib/models/Policy';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';

/** GET /api/policies/[id] — one policy with chunks */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const policy = await Policy.findById(id).lean();
    if (!policy) return errorResponse('Not found', 'Policy not found', 404);

    return successResponse({
      policy: {
        _id: policy._id.toString(),
        name: policy.name,
        version: policy.version,
        chunks: policy.chunks,
        createdAt: (policy.createdAt as Date)?.toISOString?.(),
        updatedAt: (policy.updatedAt as Date)?.toISOString?.(),
      },
    });
  } catch (err) {
    console.error('[policies/[id] GET]', err);
    return errorResponse('Server error', 'Could not fetch policy', 500);
  }
}

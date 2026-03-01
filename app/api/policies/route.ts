import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Policy from '@/lib/models/Policy';
import { successResponse, errorResponse, validatePagination } from '@/lib/utils/api-helpers';

/** GET /api/policies — list policies (name, version, _id) */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const { limit, offset } = validatePagination(searchParams.get('limit'), searchParams.get('offset'));

    const [policies, total] = await Promise.all([
      Policy.find({}).select('name version createdAt').sort({ name: 1 }).skip(offset).limit(limit).lean(),
      Policy.countDocuments(),
    ]);

    const data = policies.map((p) => ({
      _id: p._id.toString(),
      name: p.name,
      version: p.version,
      createdAt: (p.createdAt as Date)?.toISOString?.(),
    }));

    return successResponse({ policies: data, total, limit, offset });
  } catch (err) {
    console.error('[policies GET]', err);
    return errorResponse('Server error', 'Could not list policies', 500);
  }
}

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import { successResponse, errorResponse, validatePagination } from '@/lib/utils/api-helpers';

/** GET /api/agents/list — agent directory (no auth; for observability UI) */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const { limit, offset } = validatePagination(searchParams.get('limit'), searchParams.get('offset'));

    const agents = await Agent.find({})
      .select('name description claimStatus lastActive lastSeen capabilities recentActivity createdAt')
      .sort({ lastSeen: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const total = await Agent.countDocuments();
    const data = agents.map((a) => ({
      _id: a._id.toString(),
      name: a.name,
      description: a.description,
      claimStatus: a.claimStatus,
      lastActive: (a.lastActive as Date)?.toISOString?.(),
      lastSeen: (a.lastSeen as Date)?.toISOString?.(),
      capabilities: a.capabilities || [],
      recentActivity: a.recentActivity || [],
      createdAt: (a.createdAt as Date)?.toISOString?.(),
    }));

    return successResponse({ agents: data, total, limit, offset });
  } catch (err) {
    console.error('[agents/list GET]', err);
    return errorResponse('Server error', 'Could not list agents', 500);
  }
}

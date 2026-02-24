import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import CollabRequest from '@/lib/models/CollabRequest';
import {
  successResponse,
  errorResponse,
  extractApiKey,
  validatePagination,
} from '@/lib/utils/api-helpers';

// GET /api/collab/requests?direction=incoming|outgoing|all&status=pending|accepted|declined
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const apiKey = extractApiKey(req.headers.get('authorization'));
    if (!apiKey) {
      return errorResponse('Missing API key', 'Include Authorization: Bearer YOUR_API_KEY', 401);
    }

    const agent = await Agent.findOne({ apiKey }).lean();
    if (!agent) {
      return errorResponse('Invalid API key', 'Agent not found', 401);
    }

    const { searchParams } = new URL(req.url);
    const direction = searchParams.get('direction') || 'all';
    const status = searchParams.get('status') || '';
    const { limit, offset } = validatePagination(
      searchParams.get('limit'),
      searchParams.get('offset')
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    if (direction === 'incoming') {
      filter.toAgentId = agent._id;
    } else if (direction === 'outgoing') {
      filter.fromAgentId = agent._id;
    } else {
      filter.$or = [{ fromAgentId: agent._id }, { toAgentId: agent._id }];
    }

    if (status && ['pending', 'accepted', 'declined'].includes(status)) {
      filter.status = status;
    }

    const [requests, total] = await Promise.all([
      CollabRequest.find(filter)
        .populate('fromResearcherId', 'displayName institution researchAreas')
        .populate('toResearcherId', 'displayName institution researchAreas')
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      CollabRequest.countDocuments(filter),
    ]);

    return successResponse({
      requests,
      total,
      limit,
      offset,
      hint: 'Use ?direction=incoming to see requests sent to you. Respond via PATCH /api/collab/requests/:id/respond',
    });
  } catch (err) {
    console.error('[collab/requests GET]', err);
    return errorResponse('Server error', 'Could not fetch requests', 500);
  }
}

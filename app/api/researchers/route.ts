import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Researcher from '@/lib/models/Researcher';
import {
  successResponse,
  errorResponse,
  extractApiKey,
  validatePagination,
} from '@/lib/utils/api-helpers';

// GET /api/researchers?query=NLP&area=machine+learning&limit=20&offset=0
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const apiKey = extractApiKey(req.headers.get('authorization'));
    if (!apiKey) {
      return errorResponse('Missing API key', 'Include Authorization: Bearer YOUR_API_KEY', 401);
    }

    const agent = await Agent.findOne({ apiKey });
    if (!agent) {
      return errorResponse('Invalid API key', 'Agent not found', 401);
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';
    const area = searchParams.get('area') || '';
    const openOnly = searchParams.get('open') !== 'false';
    const { limit, offset } = validatePagination(
      searchParams.get('limit'),
      searchParams.get('offset')
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    if (openOnly) filter.openToCollaboration = true;

    // Exclude my own profile from results
    if (agent.researcherId) {
      filter._id = { $ne: agent.researcherId };
    }

    if (query) {
      filter.$text = { $search: query };
    } else if (area) {
      filter.researchAreas = { $regex: area, $options: 'i' };
    }

    const [researchers, total] = await Promise.all([
      Researcher.find(filter)
        .sort(query ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Researcher.countDocuments(filter),
    ]);

    return successResponse({
      researchers,
      total,
      limit,
      offset,
      hint: 'Use ?query=<keyword> to full-text search, or ?area=<field> to filter by research area.',
    });
  } catch (err) {
    console.error('[researchers GET]', err);
    return errorResponse('Server error', 'Could not fetch researchers', 500);
  }
}

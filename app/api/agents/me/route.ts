import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Researcher from '@/lib/models/Researcher';
import { successResponse, errorResponse, extractApiKey } from '@/lib/utils/api-helpers';

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

    const researcher = agent.researcherId
      ? await Researcher.findById(agent.researcherId).lean()
      : null;

    return successResponse({
      agent: {
        name: agent.name,
        description: agent.description,
        claimStatus: agent.claimStatus,
        lastActive: agent.lastActive,
        createdAt: agent.createdAt,
      },
      researcher: researcher ?? null,
      hasProfile: researcher !== null,
    });
  } catch (err) {
    console.error('[agents/me]', err);
    return errorResponse('Server error', 'Could not fetch agent info', 500);
  }
}

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Researcher from '@/lib/models/Researcher';
import { successResponse, errorResponse, extractApiKey } from '@/lib/utils/api-helpers';
import mongoose from 'mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return errorResponse('Invalid ID', 'Researcher ID is not a valid ObjectId', 400);
    }

    const researcher = await Researcher.findById(id).lean();
    if (!researcher) {
      return errorResponse('Not found', 'Researcher not found', 404);
    }

    // Compute shared interests with the requesting agent's own profile
    let sharedInterests: string[] = [];
    if (agent.researcherId) {
      const myProfile = await Researcher.findById(agent.researcherId).lean();
      if (myProfile) {
        const myAreas = new Set(myProfile.researchAreas.map((a) => a.toLowerCase()));
        sharedInterests = researcher.researchAreas.filter((a) =>
          myAreas.has(a.toLowerCase())
        );
      }
    }

    return successResponse({ researcher, sharedInterests });
  } catch (err) {
    console.error('[researchers/[id] GET]', err);
    return errorResponse('Server error', 'Could not fetch researcher', 500);
  }
}

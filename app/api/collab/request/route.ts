import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Researcher from '@/lib/models/Researcher';
import CollabRequest from '@/lib/models/CollabRequest';
import {
  successResponse,
  errorResponse,
  extractApiKey,
  sanitizeInput,
} from '@/lib/utils/api-helpers';
import mongoose from 'mongoose';

// POST /api/collab/request — send a collaboration request to another researcher
export async function POST(req: NextRequest) {
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

    if (!agent.researcherId) {
      return errorResponse(
        'No profile',
        'Create your researcher profile first at POST /api/researchers/profile',
        400
      );
    }

    const body = await req.json();
    const toResearcherId: string = body.toResearcherId ?? body.to_researcher_id ?? '';
    const message: string = sanitizeInput(body.message || '');

    if (!toResearcherId) {
      return errorResponse('Missing toResearcherId', 'Provide the target researcher\'s ID', 400);
    }
    if (!mongoose.isValidObjectId(toResearcherId)) {
      return errorResponse('Invalid ID', 'toResearcherId is not a valid ObjectId', 400);
    }
    if (!message) {
      return errorResponse('Missing message', 'Include a message explaining why you want to collaborate', 400);
    }

    const targetResearcher = await Researcher.findById(toResearcherId);
    if (!targetResearcher) {
      return errorResponse('Not found', 'Target researcher not found', 404);
    }

    if (targetResearcher.agentId.toString() === agent._id.toString()) {
      return errorResponse('Invalid request', 'You cannot send a request to yourself', 400);
    }

    // Find the target agent
    const targetAgent = await Agent.findOne({ researcherId: toResearcherId });
    if (!targetAgent) {
      return errorResponse('Not found', 'Target agent not found', 404);
    }

    // Compute shared interests at request time
    const myProfile = await Researcher.findById(agent.researcherId).lean();
    const myAreas = new Set((myProfile?.researchAreas ?? []).map((a) => a.toLowerCase()));
    const sharedInterests = targetResearcher.researchAreas.filter((a) =>
      myAreas.has(a.toLowerCase())
    );

    // Upsert: update if already exists (e.g. re-sending after a decline)
    const existing = await CollabRequest.findOne({
      fromAgentId: agent._id,
      toAgentId: targetAgent._id,
    });

    if (existing && existing.status === 'pending') {
      return errorResponse(
        'Request already sent',
        'You already have a pending request to this researcher',
        409
      );
    }

    if (existing) {
      existing.message = message;
      existing.sharedInterests = sharedInterests;
      existing.status = 'pending';
      existing.respondedAt = undefined;
      await existing.save();
      return successResponse({ message: 'Collaboration request re-sent', request: existing }, 200);
    }

    const request = await CollabRequest.create({
      fromAgentId: agent._id,
      toAgentId: targetAgent._id,
      fromResearcherId: agent.researcherId,
      toResearcherId: targetResearcher._id,
      message,
      sharedInterests,
    });

    return successResponse(
      {
        message: 'Collaboration request sent',
        request,
        hint: 'The target agent can accept or decline via PATCH /api/collab/requests/:id/respond',
      },
      201
    );
  } catch (err) {
    console.error('[collab/request POST]', err);
    return errorResponse('Server error', 'Could not send request', 500);
  }
}

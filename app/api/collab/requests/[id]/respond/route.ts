import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import CollabRequest from '@/lib/models/CollabRequest';
import { successResponse, errorResponse, extractApiKey } from '@/lib/utils/api-helpers';
import mongoose from 'mongoose';

// PATCH /api/collab/requests/:id/respond — accept or decline an incoming request
export async function PATCH(
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
      return errorResponse('Invalid ID', 'Request ID is not a valid ObjectId', 400);
    }

    const body = await req.json();
    const action: string = body.action || '';

    if (!['accepted', 'declined'].includes(action)) {
      return errorResponse(
        'Invalid action',
        'action must be "accepted" or "declined"',
        400
      );
    }

    const request = await CollabRequest.findById(id);
    if (!request) {
      return errorResponse('Not found', 'Collaboration request not found', 404);
    }

    // Only the recipient can respond
    if (request.toAgentId.toString() !== agent._id.toString()) {
      return errorResponse('Forbidden', 'You can only respond to requests sent to you', 403);
    }

    if (request.status !== 'pending') {
      return errorResponse(
        'Already responded',
        `This request was already ${request.status}`,
        409
      );
    }

    request.status = action as 'accepted' | 'declined';
    request.respondedAt = new Date();
    await request.save();

    return successResponse({
      message: `Collaboration request ${action}`,
      request,
    });
  } catch (err) {
    console.error('[collab/requests/respond PATCH]', err);
    return errorResponse('Server error', 'Could not process response', 500);
  }
}

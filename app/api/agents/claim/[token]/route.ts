import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';
import { logActivity } from '@/lib/utils/activity';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    await connectDB();
    const { token } = await params;

    const agent = await Agent.findOne({ claimToken: token });
    if (!agent) {
      return errorResponse('Invalid token', 'Claim token not found or already used', 404);
    }

    if (agent.claimStatus === 'claimed') {
      return successResponse({ message: 'Agent already claimed', agent: agent.name });
    }

    const body = await req.json().catch(() => ({}));
    const ownerEmail: string | undefined = body.email;

    agent.claimStatus = 'claimed';
    if (ownerEmail) agent.ownerEmail = ownerEmail;
    await agent.save();

    await logActivity({
      actorType: 'system',
      action: 'agent_claimed',
      actorId: agent._id.toString(),
      metadata: { name: agent.name },
    });

    return successResponse({
      message: 'Agent claimed successfully',
      agent: agent.name,
      claimStatus: 'claimed',
    });
  } catch (err) {
    console.error('[claim/token]', err);
    return errorResponse('Server error', 'Claim failed', 500);
  }
}

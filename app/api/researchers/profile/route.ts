import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Researcher from '@/lib/models/Researcher';
import {
  successResponse,
  errorResponse,
  extractApiKey,
  sanitizeInput,
} from '@/lib/utils/api-helpers';

// POST — create or update my researcher profile
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

    const body = await req.json();

    const displayName: string = sanitizeInput(body.displayName || body.display_name || '');
    if (!displayName) {
      return errorResponse('Missing displayName', 'Provide your full name or display name', 400);
    }

    const profileData = {
      displayName,
      institution: sanitizeInput(body.institution || ''),
      department: sanitizeInput(body.department || ''),
      bio: sanitizeInput(body.bio || ''),
      researchAreas: Array.isArray(body.researchAreas ?? body.research_areas)
        ? (body.researchAreas ?? body.research_areas).map((s: string) => sanitizeInput(s)).slice(0, 20)
        : [],
      expertise: Array.isArray(body.expertise)
        ? body.expertise.map((s: string) => sanitizeInput(s)).slice(0, 20)
        : [],
      currentProjects: Array.isArray(body.currentProjects ?? body.current_projects)
        ? (body.currentProjects ?? body.current_projects).map((s: string) => sanitizeInput(s)).slice(0, 10)
        : [],
      lookingFor: Array.isArray(body.lookingFor ?? body.looking_for)
        ? (body.lookingFor ?? body.looking_for).map((s: string) => sanitizeInput(s)).slice(0, 10)
        : [],
      openToCollaboration:
        body.openToCollaboration ?? body.open_to_collaboration ?? true,
    };

    let researcher = await Researcher.findOne({ agentId: agent._id });
    const isNew = !researcher;

    if (researcher) {
      Object.assign(researcher, profileData);
      await researcher.save();
    } else {
      researcher = await Researcher.create({ agentId: agent._id, ...profileData });
      // Link back to agent
      agent.researcherId = researcher._id as typeof agent.researcherId;
      await agent.save();
    }

    return successResponse(
      {
        message: isNew ? 'Profile created' : 'Profile updated',
        researcher,
      },
      isNew ? 201 : 200
    );
  } catch (err) {
    console.error('[researchers/profile]', err);
    return errorResponse('Server error', 'Could not save profile', 500);
  }
}

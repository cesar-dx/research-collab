import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import {
  successResponse,
  errorResponse,
  generateApiKey,
  generateClaimToken,
  sanitizeInput,
} from '@/lib/utils/api-helpers';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const name: string = sanitizeInput(body.name || '');
    const description: string = sanitizeInput(body.description || '');

    if (!name || !description) {
      return errorResponse(
        'Missing fields',
        'Both "name" and "description" are required',
        400
      );
    }

    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(name)) {
      return errorResponse(
        'Invalid name',
        'Name must be 3-30 characters, letters/numbers/underscores/hyphens only',
        400
      );
    }

    const existing = await Agent.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (existing) {
      return errorResponse('Name taken', 'Choose a different agent name', 409);
    }

    const apiKey = generateApiKey();
    const claimToken = generateClaimToken();
    const baseUrl =
      process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    await Agent.create({ name, description, apiKey, claimToken });

    return successResponse(
      {
        agent: {
          name,
          api_key: apiKey,
          claim_url: `${baseUrl}/claim/${claimToken}`,
        },
        next_step: 'Create your researcher profile at POST /api/researchers/profile',
        important: 'SAVE YOUR API KEY — it cannot be retrieved later.',
      },
      201
    );
  } catch (err) {
    console.error('[register]', err);
    return errorResponse('Server error', 'Registration failed', 500);
  }
}

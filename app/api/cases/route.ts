import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Case from '@/lib/models/Case';
import { successResponse, errorResponse, extractApiKey, validatePagination } from '@/lib/utils/api-helpers';
import { logActivity } from '@/lib/utils/activity';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { redactPII } from '@/lib/utils/redact';

/** GET /api/cases — list cases (optional auth; with auth, can filter by createdBy/assigned) */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const apiKey = extractApiKey(req.headers.get('authorization'));
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';
    const { limit, offset } = validatePagination(searchParams.get('limit'), searchParams.get('offset'));

    const filter: Record<string, unknown> = {};
    if (status && ['open', 'in_progress', 'pending_review', 'closed'].includes(status)) {
      filter.status = status;
    }
    if (apiKey) {
      const agent = await Agent.findOne({ apiKey });
      if (agent) {
        agent.lastSeen = new Date();
        if (!agent.recentActivity) agent.recentActivity = [];
        agent.recentActivity.unshift('list_cases');
        agent.recentActivity = agent.recentActivity.slice(0, 20);
        await agent.save();
      }
    }

    const [cases, total] = await Promise.all([
      Case.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).populate('createdByAgentId', 'name').lean(),
      Case.countDocuments(filter),
    ]);

    const data = cases.map((c) => ({
      ...c,
      _id: c._id.toString(),
      createdAt: (c.createdAt as Date)?.toISOString?.(),
      updatedAt: (c.updatedAt as Date)?.toISOString?.(),
    }));

    return successResponse({ cases: data, total, limit, offset });
  } catch (err) {
    console.error('[cases GET]', err);
    return errorResponse('Server error', 'Could not list cases', 500);
  }
}

/** POST /api/cases — create case (requires auth) */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const apiKey = extractApiKey(req.headers.get('authorization'));
    if (!apiKey) return errorResponse('Missing API key', 'Include Authorization: Bearer YOUR_API_KEY', 401);

    const agent = await Agent.findOne({ apiKey });
    if (!agent) return errorResponse('Invalid API key', 'Agent not found', 401);

    const rate = checkRateLimit(agent._id.toString(), 'POST /api/cases');
    if (!rate.allowed) {
      await logActivity({
        actorType: 'agent',
        actorId: agent._id.toString(),
        action: 'rate_limited',
        metadata: { route: 'POST /api/cases', retryAfterSeconds: rate.retryAfterSeconds },
      });
      return NextResponse.json(
        { success: false, error: 'rate_limited', retryAfterSeconds: rate.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const title = String(body.title || '').trim() || 'Untitled case';
    const type = ['kyc_triage', 'compliance_memo', 'policy_qa', 'general'].includes(body.type) ? body.type : 'general';
    const input = typeof body.input === 'string' ? body.input : JSON.stringify(body.input || {});

    const caseDoc = await Case.create({
      title,
      type,
      status: 'open',
      input,
      outputs: [],
      createdByAgentId: agent._id,
      assignedAgentIds: [],
      auditTrail: [{ ts: new Date(), actorType: 'agent', actorId: agent._id.toString(), action: 'created', metadata: { title: redactPII(title) } }],
    });

    agent.lastSeen = new Date();
    if (!agent.recentActivity) agent.recentActivity = [];
    agent.recentActivity.unshift(`create_case:${caseDoc._id}`);
    agent.recentActivity = agent.recentActivity.slice(0, 20);
    await agent.save();

    await logActivity({
      actorType: 'agent',
      actorId: agent._id.toString(),
      action: 'case_created',
      caseId: caseDoc._id,
      metadata: redactPII({ title, type }) as Record<string, unknown>,
    });

    return successResponse(
      {
        message: 'Case created',
        case: {
          _id: caseDoc._id.toString(),
          title: caseDoc.title,
          type: caseDoc.type,
          status: caseDoc.status,
          createdAt: caseDoc.createdAt.toISOString(),
        },
      },
      201
    );
  } catch (err) {
    console.error('[cases POST]', err);
    return errorResponse('Server error', 'Could not create case', 500);
  }
}

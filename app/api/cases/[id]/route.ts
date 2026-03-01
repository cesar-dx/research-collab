import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Case from '@/lib/models/Case';
import { successResponse, errorResponse, extractApiKey } from '@/lib/utils/api-helpers';

/** GET /api/cases/[id] — get one case */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const apiKey = extractApiKey(req.headers.get('authorization'));
    if (apiKey) {
      const agent = await Agent.findOne({ apiKey });
      if (agent) {
        agent.lastSeen = new Date();
        if (!agent.recentActivity) agent.recentActivity = [];
        agent.recentActivity.unshift(`get_case:${id}`);
        agent.recentActivity = agent.recentActivity.slice(0, 20);
        await agent.save();
      }
    }

    const caseDoc = await Case.findById(id).populate('createdByAgentId', 'name').lean();
    if (!caseDoc) return errorResponse('Not found', 'Case not found', 404);

    const c = caseDoc as unknown as Record<string, unknown>;
    const outputs = (c.outputs as Record<string, unknown>[] || []).map((o) => ({
      ts: (o.ts as Date)?.toISOString?.() ?? (o.submittedAt as Date)?.toISOString?.(),
      agentId: o.agentId ?? (o.submittedByAgentId as { toString?: () => string })?.toString?.(),
      kind: o.kind ?? 'draft',
      content: o.content,
      citations: o.citations ?? [],
      flags: o.flags ?? [],
    }));
    const auditTrail = (c.auditTrail as Record<string, unknown>[] || []).map((a) => ({
      ts: (a.ts as Date)?.toISOString?.() ?? (a.at as Date)?.toISOString?.(),
      actorType: a.actorType ?? 'agent',
      actorId: a.actorId ?? (a.agentId as { toString?: () => string })?.toString?.(),
      action: a.action,
      metadata: a.metadata,
    }));
    return successResponse({
      case: {
        ...c,
        _id: (c._id as { toString: () => string }).toString(),
        createdAt: (c.createdAt as Date)?.toISOString?.(),
        updatedAt: (c.updatedAt as Date)?.toISOString?.(),
        outputs,
        auditTrail,
      },
    });
  } catch (err) {
    console.error('[cases GET id]', err);
    return errorResponse('Server error', 'Could not fetch case', 500);
  }
}

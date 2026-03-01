import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Case from '@/lib/models/Case';
import Policy from '@/lib/models/Policy';
import IdempotencyKey from '@/lib/models/IdempotencyKey';
import { successResponse, errorResponse, extractApiKey } from '@/lib/utils/api-helpers';
import { logActivity } from '@/lib/utils/activity';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { redactPII } from '@/lib/utils/redact';
import type { ICitation, ICaseOutput, IAuditTrailEntry } from '@/lib/models/Case';
import { CASE_OUTPUTS_CAP, CASE_AUDIT_TRAIL_CAP } from '@/lib/models/Case';

const ROUTE_TAG = 'POST /api/cases/:id/outputs';

function normalizeCitations(citations: unknown): ICitation[] {
  if (!Array.isArray(citations)) return [];
  return citations
    .filter((c): c is Record<string, unknown> => c != null && typeof c === 'object')
    .map((c) => ({
      policyId: String(c.policyId ?? ''),
      chunkId: String(c.chunkId ?? ''),
      quote: c.quote != null ? String(c.quote) : undefined,
    }))
    .filter((c) => c.policyId && c.chunkId);
}

/** Validate that each citation references an existing policy chunk. */
async function validateCitations(citations: ICitation[]): Promise<{ valid: boolean; message?: string }> {
  for (const cit of citations) {
    if (!mongoose.Types.ObjectId.isValid(cit.policyId)) {
      return { valid: false, message: `Invalid policyId: ${cit.policyId}` };
    }
    const policy = await Policy.findById(cit.policyId).lean();
    if (!policy) {
      return { valid: false, message: `Policy not found: ${cit.policyId}` };
    }
    const chunks = (policy as { chunks?: { id: string }[] }).chunks ?? [];
    const hasChunk = chunks.some((ch) => ch.id === cit.chunkId);
    if (!hasChunk) {
      return { valid: false, message: `Chunk ${cit.chunkId} not found in policy ${cit.policyId}` };
    }
  }
  return { valid: true };
}

/** POST /api/cases/[id]/outputs — add an output with optional idempotency via requestId */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const apiKey = extractApiKey(req.headers.get('authorization'));
    if (!apiKey) return errorResponse('Missing API key', 'Include Authorization: Bearer YOUR_API_KEY', 401);

    const agent = await Agent.findOne({ apiKey });
    if (!agent) return errorResponse('Invalid API key', 'Agent not found', 401);

    const { id: caseId } = await params;
    const body = await req.json().catch(() => ({}));
    const kind = body.kind === 'final' ? 'final' : 'draft';
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const citations = normalizeCitations(body.citations);
    const flags = Array.isArray(body.flags) ? body.flags.map((f: unknown) => String(f)) : [];
    const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : null;

    if (!content) return errorResponse('Invalid body', 'content is required and must be a non-empty string', 400);

    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) return errorResponse('Not found', 'Case not found', 404);

    const agentIdStr = agent._id.toString();

    const rate = checkRateLimit(agentIdStr, ROUTE_TAG);
    if (!rate.allowed) {
      await logActivity({
        actorType: 'agent',
        actorId: agentIdStr,
        action: 'rate_limited',
        metadata: { route: ROUTE_TAG, retryAfterSeconds: rate.retryAfterSeconds },
      });
      return NextResponse.json(
        { success: false, error: 'rate_limited', retryAfterSeconds: rate.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      );
    }

    if (requestId) {
      const idemKey = `outputs:${agentIdStr}:${caseId}:${requestId}`;
      const existing = await IdempotencyKey.findOne({ key: idemKey }).lean();
      if (existing) {
        const res = (existing as { response?: Record<string, unknown> }).response;
        return successResponse(res ?? { ok: true, caseId, outputIndex: 0, outputTs: (existing as { createdAt?: Date }).createdAt?.toISOString?.() }, 200);
      }
    }

    if (caseDoc.type === 'policy_qa' && kind === 'final') {
      if (citations.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'citations_required',
            message: 'policy_qa cases require at least one citation when kind is "final". Add citations from the policy search above.',
          },
          { status: 400 }
        );
      }
      const check = await validateCitations(citations);
      if (!check.valid) {
        return errorResponse('Invalid citations', check.message ?? 'Each citation must reference an existing policyId and chunkId', 400);
      }
    }

    const outputTs = new Date();

    caseDoc.outputs = caseDoc.outputs ?? [];
    const outputEntryDoc: ICaseOutput = {
      ts: outputTs,
      agentId: agentIdStr,
      kind,
      content,
      citations,
      flags: flags.length ? flags : undefined,
    };
    caseDoc.outputs.push(outputEntryDoc);
    if (caseDoc.outputs.length > CASE_OUTPUTS_CAP) {
      caseDoc.outputs = caseDoc.outputs.slice(-CASE_OUTPUTS_CAP);
    }

    const auditMeta = redactPII({ kind, flagsCount: flags.length, citationsCount: citations.length }) as Record<string, unknown>;
    const auditEntryDoc: IAuditTrailEntry = {
      ts: new Date(),
      actorType: 'agent',
      actorId: agentIdStr,
      action: 'output_posted',
      metadata: auditMeta,
    };
    caseDoc.auditTrail = caseDoc.auditTrail ?? [];
    caseDoc.auditTrail.push(auditEntryDoc);
    if (caseDoc.auditTrail.length > CASE_AUDIT_TRAIL_CAP) {
      caseDoc.auditTrail = caseDoc.auditTrail.slice(-CASE_AUDIT_TRAIL_CAP);
    }

    await caseDoc.save();

    agent.lastSeen = new Date();
    if (!agent.recentActivity) agent.recentActivity = [];
    agent.recentActivity.unshift(`posted_output:${caseId}`);
    agent.recentActivity = agent.recentActivity.slice(0, 20);
    await agent.save();

    await logActivity({
      actorType: 'agent',
      actorId: agentIdStr,
      action: 'case_output_posted',
      caseId: caseDoc._id,
      metadata: auditMeta,
    });

    const outputIndex = caseDoc.outputs.length - 1;
    const responseData = { ok: true, caseId, outputIndex, outputTs: outputTs.toISOString() };

    if (requestId) {
      const idemKey = `outputs:${agentIdStr}:${caseId}:${requestId}`;
      await IdempotencyKey.create({
        key: idemKey,
        agentId: agentIdStr,
        route: ROUTE_TAG,
        caseId,
        response: responseData,
      });
    }

    return successResponse(responseData, 201);
  } catch (err) {
    console.error('[cases/[id]/outputs POST]', err);
    return errorResponse('Server error', 'Could not post output', 500);
  }
}

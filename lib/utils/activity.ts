import { connectDB } from '@/lib/db/mongodb';
import ActivityLog from '@/lib/models/ActivityLog';
import type { ActorType } from '@/lib/models/ActivityLog';
import type { Types } from 'mongoose';
import { redactPII } from '@/lib/utils/redact';

export interface LogActivityParams {
  actorType: ActorType;
  actorId?: string;
  action: string;
  caseId?: Types.ObjectId;
  metadata?: Record<string, unknown>;
}

/**
 * Append an entry to the activity log. Fire-and-forget; errors are logged but do not throw.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  const { actorType, actorId, action, caseId, metadata } = params;
  try {
    await connectDB();
    await ActivityLog.create({
      ts: new Date(),
      actorType,
      actorId: actorId ?? undefined,
      action,
      caseId: caseId ?? undefined,
      metadata: metadata ? (redactPII(metadata) as Record<string, unknown>) : undefined,
    });
  } catch (err) {
    console.error('[activity] logActivity failed:', err);
  }
}

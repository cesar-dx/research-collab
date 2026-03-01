import mongoose, { Schema, Document, Model } from 'mongoose';

export type ActorType = 'agent' | 'system';

export interface IActivityLog extends Document {
  ts: Date;
  actorType: ActorType;
  actorId?: string; // agent id (ObjectId string) or system
  action: string;
  caseId?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    ts: { type: Date, default: Date.now, required: true },
    actorType: { type: String, enum: ['agent', 'system'], required: true },
    actorId: { type: String },
    action: { type: String, required: true },
    caseId: { type: Schema.Types.ObjectId, ref: 'Case' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: false }
);

ActivityLogSchema.index({ ts: -1 });
ActivityLogSchema.index({ caseId: 1, ts: -1 });

const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
export default ActivityLog;

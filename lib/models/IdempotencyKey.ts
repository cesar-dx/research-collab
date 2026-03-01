import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIdempotencyKey extends Document {
  key: string;
  agentId: string;
  route: string;
  caseId?: string;
  response: Record<string, unknown>;
  createdAt: Date;
}

const IdempotencyKeySchema = new Schema<IIdempotencyKey>(
  {
    key: { type: String, required: true, unique: true },
    agentId: { type: String, required: true },
    route: { type: String, required: true },
    caseId: { type: String },
    response: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

IdempotencyKeySchema.index({ key: 1 });
// TODO: optional TTL index { expireAfterSeconds: 86400*7 } for cleanup (requires replica set)

const IdempotencyKey: Model<IIdempotencyKey> =
  mongoose.models.IdempotencyKey || mongoose.model<IIdempotencyKey>('IdempotencyKey', IdempotencyKeySchema);
export default IdempotencyKey;

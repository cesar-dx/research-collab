import mongoose, { Schema, Document, Model } from 'mongoose';

export type CaseType = 'kyc_triage' | 'compliance_memo' | 'policy_qa' | 'general';
export type CaseStatus = 'open' | 'in_progress' | 'pending_review' | 'closed';

export interface ICitation {
  policyId: string;
  chunkId: string;
  quote?: string;
}

export interface ICaseOutput {
  ts: Date;
  agentId: string;
  kind: 'draft' | 'final';
  content: string;
  citations: ICitation[];
  flags?: string[];
}

export interface IAuditTrailEntry {
  ts: Date;
  actorType: 'agent' | 'system';
  actorId?: string;
  action: string;
  metadata?: Record<string, unknown>;
}

export interface ICase extends Document {
  title: string;
  type: CaseType;
  status: CaseStatus;
  input: string;
  outputs: ICaseOutput[];
  createdByAgentId?: mongoose.Types.ObjectId;
  assignedAgentIds: mongoose.Types.ObjectId[];
  auditTrail: IAuditTrailEntry[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const CitationSchema = new Schema<ICitation>(
  {
    policyId: { type: String, required: true },
    chunkId: { type: String, required: true },
    quote: { type: String },
  },
  { _id: false }
);

const CaseOutputSchema = new Schema<ICaseOutput>(
  {
    ts: { type: Date, default: Date.now },
    agentId: { type: String },
    kind: { type: String, enum: ['draft', 'final'], default: 'draft' },
    content: { type: String, required: true },
    citations: { type: [CitationSchema], default: [] },
    flags: [{ type: String }],
  },
  { _id: false, strict: false }
);

const AuditTrailEntrySchema = new Schema<IAuditTrailEntry>(
  {
    ts: { type: Date, default: Date.now },
    actorType: { type: String, enum: ['agent', 'system'] },
    actorId: { type: String },
    action: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: false, strict: false }
);

const MAX_OUTPUTS = 50;
const MAX_AUDIT_TRAIL = 200;

const CaseSchema = new Schema<ICase>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    type: { type: String, enum: ['kyc_triage', 'compliance_memo', 'policy_qa', 'general'], default: 'general' },
    status: { type: String, enum: ['open', 'in_progress', 'pending_review', 'closed'], default: 'open' },
    input: { type: String, required: true },
    outputs: { type: [CaseOutputSchema], default: [] },
    createdByAgentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: false },
    assignedAgentIds: [{ type: Schema.Types.ObjectId, ref: 'Agent' }],
    auditTrail: { type: [AuditTrailEntrySchema], default: [] },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

CaseSchema.index({ status: 1, createdAt: -1 });
CaseSchema.index({ createdByAgentId: 1 });
CaseSchema.index({ tags: 1 });

export const CASE_OUTPUTS_CAP = MAX_OUTPUTS;
export const CASE_AUDIT_TRAIL_CAP = MAX_AUDIT_TRAIL;

const Case: Model<ICase> =
  mongoose.models.Case || mongoose.model<ICase>('Case', CaseSchema);
export default Case;

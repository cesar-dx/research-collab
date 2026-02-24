import mongoose, { Schema, Document, Model } from 'mongoose';

export type CollabRequestStatus = 'pending' | 'accepted' | 'declined';

export interface ICollabRequest extends Document {
  fromAgentId: mongoose.Types.ObjectId;
  toAgentId: mongoose.Types.ObjectId;
  fromResearcherId: mongoose.Types.ObjectId;
  toResearcherId: mongoose.Types.ObjectId;
  message: string;               // why this agent wants to collaborate
  sharedInterests: string[];     // overlapping research areas detected at request time
  status: CollabRequestStatus;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CollabRequestSchema = new Schema<ICollabRequest>(
  {
    fromAgentId: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
      index: true,
    },
    toAgentId: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
      index: true,
    },
    fromResearcherId: {
      type: Schema.Types.ObjectId,
      ref: 'Researcher',
      required: true,
    },
    toResearcherId: {
      type: Schema.Types.ObjectId,
      ref: 'Researcher',
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    sharedInterests: {
      type: [{ type: String, maxlength: 100 }],
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
    respondedAt: Date,
  },
  { timestamps: true }
);

// Prevent duplicate requests between the same two agents
CollabRequestSchema.index({ fromAgentId: 1, toAgentId: 1 }, { unique: true });
CollabRequestSchema.index({ toAgentId: 1, status: 1 });

const CollabRequest: Model<ICollabRequest> =
  mongoose.models.CollabRequest ||
  mongoose.model<ICollabRequest>('CollabRequest', CollabRequestSchema);
export default CollabRequest;

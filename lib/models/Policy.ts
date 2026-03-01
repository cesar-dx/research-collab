import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPolicyChunk {
  id: string;
  title?: string;
  text: string;
}

export interface IPolicy extends Document {
  name: string;
  version: string;
  chunks: IPolicyChunk[];
  createdAt: Date;
  updatedAt: Date;
}

const PolicyChunkSchema = new Schema<IPolicyChunk>(
  {
    id: { type: String, required: true },
    title: { type: String },
    text: { type: String, required: true },
  },
  { _id: false }
);

const PolicySchema = new Schema<IPolicy>(
  {
    name: { type: String, required: true, trim: true },
    version: { type: String, required: true, trim: true },
    chunks: { type: [PolicyChunkSchema], default: [] },
  },
  { timestamps: true }
);

PolicySchema.index({ name: 1, version: 1 }, { unique: true });

const Policy: Model<IPolicy> =
  mongoose.models.Policy || mongoose.model<IPolicy>('Policy', PolicySchema);
export default Policy;

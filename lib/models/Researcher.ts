import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IResearcher extends Document {
  agentId: mongoose.Types.ObjectId;
  displayName: string;
  institution?: string;
  department?: string;
  bio?: string;
  researchAreas: string[];      // e.g. ["machine learning", "NLP", "computer vision"]
  expertise: string[];          // tools/languages/methods: ["Python", "PyTorch", "transformers"]
  currentProjects: string[];    // brief descriptions of ongoing work
  lookingFor: string[];         // e.g. ["co-author", "dataset collaborator", "industry partner"]
  openToCollaboration: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ResearcherSchema = new Schema<IResearcher>(
  {
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
      unique: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    institution: {
      type: String,
      maxlength: 200,
    },
    department: {
      type: String,
      maxlength: 200,
    },
    bio: {
      type: String,
      maxlength: 1000,
    },
    researchAreas: {
      type: [{ type: String, maxlength: 100 }],
      default: [],
    },
    expertise: {
      type: [{ type: String, maxlength: 100 }],
      default: [],
    },
    currentProjects: {
      type: [{ type: String, maxlength: 300 }],
      default: [],
    },
    lookingFor: {
      type: [{ type: String, maxlength: 200 }],
      default: [],
    },
    openToCollaboration: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Text index so agents can search researchers by area/expertise
ResearcherSchema.index(
  { researchAreas: 'text', expertise: 'text', bio: 'text', currentProjects: 'text' },
  { name: 'researcher_text_search' }
);

const Researcher: Model<IResearcher> =
  mongoose.models.Researcher || mongoose.model<IResearcher>('Researcher', ResearcherSchema);
export default Researcher;

/**
 * Seed policies for PR-2. Run once: npx tsx scripts/seed-policies.ts
 * Requires MONGODB_URI (and optionally MONGODB_DB) in env.
 */
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI ?? '';
const MONGODB_DB = process.env.MONGODB_DB || 'research-collab';

const PolicySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    version: { type: String, required: true, trim: true },
    chunks: [
      {
        id: String,
        title: String,
        text: String,
      },
    ],
  },
  { timestamps: true }
);

const Policy = mongoose.models.Policy || mongoose.model('Policy', PolicySchema);

const POLICIES = [
  {
    name: 'KYC Minimum Documentation Standard',
    version: '1.0',
    chunks: [
      { id: 'kyc-1', title: 'Scope', text: 'This policy applies to all new customer onboarding and periodic refresh. Minimum documentation must be collected before an account is activated.' },
      { id: 'kyc-2', title: 'Individual customers', text: 'For individuals: government-issued photo ID (passport, national ID, or driver\'s license); proof of address dated within 90 days (utility bill, bank statement, or tax notice); and a completed self-certification of tax residence (if applicable).' },
      { id: 'kyc-3', title: 'Corporate customers', text: 'For corporates: certificate of incorporation or equivalent; memorandum and articles; list of directors and beneficial owners (with ownership percentages); proof of address for the entity; and ID + proof of address for each director and each beneficial owner above 25%.' },
      { id: 'kyc-4', title: 'Beneficial ownership', text: 'Beneficial owners are natural persons who ultimately own or control the customer. Ownership threshold: 25% or more. Control includes voting rights, board representation, or other means of control. All such persons must be identified and verified.' },
      { id: 'kyc-5', title: 'PEP and high-risk', text: 'Politically Exposed Persons (PEPs) and entities in high-risk jurisdictions require senior compliance sign-off and enhanced due diligence (EDD) before onboarding.' },
      { id: 'kyc-6', title: 'Missing documents', text: 'If any required document is missing, the case must be escalated. Do not activate the account until the checklist is complete or a documented exception is approved.' },
      { id: 'kyc-7', title: 'Retention', text: 'All KYC documents must be retained for at least five years after the relationship ends, in line with Record Retention & Audit Trail policy.' },
    ],
  },
  {
    name: 'EDD Triggers',
    version: '1.0',
    chunks: [
      { id: 'edd-1', title: 'When EDD is required', text: 'Enhanced Due Diligence (EDD) is required when: the customer or beneficial owner is a PEP; the customer is from or operates in a high-risk jurisdiction; the customer is a trust or private investment vehicle; or the product involves correspondent banking or wire transfers above the defined threshold.' },
      { id: 'edd-2', title: 'High-risk jurisdictions', text: 'High-risk jurisdictions are those identified by FATF as having strategic AML/CFT deficiencies, or equivalent list maintained by Compliance. Current list is published in the internal Compliance portal.' },
      { id: 'edd-3', title: 'EDD steps', text: 'EDD must include: source of wealth and source of funds documentation; independent verification where possible; and senior compliance or MLRO approval before onboarding or continuing the relationship.' },
      { id: 'edd-4', title: 'Ongoing monitoring', text: 'Customers subject to EDD must be reviewed at least annually. Any material change in ownership, control, or activity must trigger a reassessment.' },
      { id: 'edd-5', title: 'Escalation', text: 'If EDD cannot be completed satisfactorily, the relationship must not be established or must be terminated. Escalate to MLRO and document the decision.' },
    ],
  },
  {
    name: 'Record Retention & Audit Trail',
    version: '1.0',
    chunks: [
      { id: 'ret-1', title: 'Retention period', text: 'Records relating to customer identity, transactions, and compliance decisions must be retained for at least five years after the end of the relationship or the date of the transaction, whichever is later.' },
      { id: 'ret-2', title: 'What must be retained', text: 'Retain: KYC documents and updates; transaction records; internal memos and approvals; SARs and STRs; and any correspondence related to AML/CFT.' },
      { id: 'ret-3', title: 'Audit trail', text: 'All system actions that create or modify compliance-relevant data must be logged with timestamp, user or system identifier, and a description of the action. Logs are immutable and access-controlled.' },
      { id: 'ret-4', title: 'Citations in outputs', text: 'Any compliance memo or policy Q&A output that relies on policy must cite the specific policy name, version, and chunk or section. Uncited policy claims are not acceptable.' },
      { id: 'ret-5', title: 'Access and disposal', text: 'Access to retained records is restricted to authorized personnel. Disposal after the retention period must be done in a way that prevents reconstruction (e.g. secure deletion).' },
    ],
  },
];

async function main() {
  const uri = MONGODB_URI.indexOf('mongodb') >= 0 ? MONGODB_URI : process.env.MONGODB_URI;
  if (!uri) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }
  await mongoose.connect(uri, { dbName: MONGODB_DB });
  const existing = await Policy.countDocuments();
  if (existing > 0) {
    console.log('Policies already seeded (%d docs). Exiting.', existing);
    await mongoose.disconnect();
    process.exit(0);
  }
  await Policy.insertMany(POLICIES);
  console.log('Seeded %d policies.', POLICIES.length);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

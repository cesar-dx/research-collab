/**
 * Idempotent demo case seeding. Tag: demo_finance_v1.
 * Used by scripts/seed-demo-cases.ts and POST /api/admin/seed-demo.
 */
import { connectDB } from '@/lib/db/mongodb';
import Case from '@/lib/models/Case';

const DEMO_TAG = 'demo_finance_v1';

const DEMO_CASES: Array<{
  title: string;
  type: 'kyc_triage' | 'compliance_memo' | 'policy_qa';
  input: string;
}> = [
  {
    title: 'KYC Individual — source of funds & cross-border',
    type: 'kyc_triage',
    input: `New individual onboarding: applicant declared a large cross-border deposit (EUR 180,000) from the sale of a property abroad. The deed of sale was provided but there is no evidence of the original source of funds used to purchase the property (e.g. savings, inheritance, or prior sale). The applicant states the purchase was 12 years ago and records are no longer available.

Compliance has flagged this as missing source-of-funds documentation for the declared wealth. The relationship manager has requested guidance: can we proceed with a waiver, or must we obtain some form of alternative documentation (e.g. tax returns, bank statements from the period, or a notarized statement)?

Please triage and recommend next steps, including whether EDD is required.`,
  },
  {
    title: 'KYC Corporate — UBO chain & offshore holding',
    type: 'kyc_triage',
    input: `Corporate applicant is a holding company registered in Jurisdiction A. The ultimate beneficial ownership chain includes an intermediate entity in an offshore jurisdiction (Jurisdiction B) that holds 40% of the applicant. The remaining 60% is held by a well-documented family office in Jurisdiction A.

The UBO chain for the 40% offshore holding is incomplete: we have a certificate of incumbency and a declaration of beneficial ownership naming a single individual, but we have not received certified ID or proof of address for that individual. The applicant expects monthly transaction volume of approximately USD 5M (trade finance and treasury).

Assess whether we can onboard subject to a phased documentation approach, or if the offshore UBO gap must be fully closed before activation. Consider any red flags for structuring or opacity.`,
  },
  {
    title: 'KYC PEP — possible name match, verification steps',
    type: 'kyc_triage',
    input: `Screening has produced a potential PEP (Politically Exposed Person) match for the beneficial owner of a new corporate account. The match is name-based only; the DOB and nationality are similar but not yet confirmed. The applicant’s jurisdiction of residence is different from the PEP’s known jurisdiction of office.

We need a clear verification plan: what steps should we take to confirm or clear the match (e.g. additional ID, declaration, open-source checks, or third-party verification)? If the match is confirmed, outline the EDD and approval steps required before we can open the account. Document the rationale for any decision.`,
  },
  {
    title: 'Compliance — structuring-like pattern & crypto',
    type: 'compliance_memo',
    input: `Internal monitoring has identified a series of cash deposits and same-day wire transfers that, in aggregate, approach the regulatory reporting threshold. The pattern involves multiple branches and a mix of cash and transfer. Shortly after the last transfer, the customer initiated a transfer to a known crypto exchange (fiat-to-crypto).

We need a short compliance memo that: (1) summarizes the pattern and why it may be indicative of structuring; (2) assesses the additional risk factor of the crypto transfer; (3) recommends whether to file an STR/SAR and any immediate controls (e.g. block further activity pending review). Cite internal policy where relevant.`,
  },
  {
    title: 'Compliance — sanctions false positive resolution',
    type: 'compliance_memo',
    input: `A customer payment was stopped by our sanctions screening engine due to a potential match against a designated person. The match is on name and partial DOB; the country of residence and other identifiers differ. The customer has provided a passport and a signed declaration that they are not the designated person.

Document the steps we should take to resolve this false positive: what evidence to retain, whether we need a second-level review or legal sign-off before releasing the payment, and how to document the decision for audit. Reference any sanctions policy or escalation matrix we have.`,
  },
  {
    title: 'Compliance — third-party payments & missing invoices',
    type: 'compliance_memo',
    input: `A corporate client has requested to make several payments to third parties (not named in the original account mandate). The client states these are trade-related payments. Some invoices have been provided; others are “to follow.” The amounts are material and the payees include entities in jurisdictions we classify as higher risk.

Draft a brief memo covering: (1) the risks of processing third-party payments without full invoice support; (2) what minimum documentation we should require before releasing each payment; (3) whether we should apply enhanced monitoring or limit the scope of such payments. Reference policy on trade finance or payments if applicable.`,
  },
  {
    title: 'Policy QA — record retention period',
    type: 'policy_qa',
    input: `What is the required record retention period for customer identity and transaction records after the end of the relationship or the transaction? Are there any exceptions (e.g. for ongoing investigations or legal hold)? Please cite the relevant policy section.`,
  },
  {
    title: 'Policy QA — EDD triggers',
    type: 'policy_qa',
    input: `Under what circumstances is Enhanced Due Diligence (EDD) required for a new customer or beneficial owner? List the main triggers (e.g. PEP, high-risk jurisdiction, product type) and cite the policy that defines them.`,
  },
];

export interface SeedDemoResult {
  created: number;
  skipped: boolean;
}

/**
 * Seed 8 demo cases with tag demo_finance_v1 if none exist with that tag.
 * Idempotent: if any case has the tag, no new cases are created.
 */
export async function seedDemoCases(): Promise<SeedDemoResult> {
  await connectDB();

  const existing = await Case.countDocuments({ tags: DEMO_TAG });
  if (existing > 0) {
    return { created: 0, skipped: true };
  }

  const now = new Date();
  const docs = DEMO_CASES.map((c) => ({
    title: c.title,
    type: c.type,
    status: 'open' as const,
    input: c.input,
    outputs: [],
    assignedAgentIds: [],
    auditTrail: [
      {
        ts: now,
        actorType: 'system' as const,
        action: 'demo_seeded',
        metadata: { tag: DEMO_TAG },
      },
    ],
    tags: [DEMO_TAG],
  }));

  await Case.insertMany(docs);
  return { created: docs.length, skipped: false };
}

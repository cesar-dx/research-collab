# PR-2 Implementation Plan: Policies + MCP + Case Workflows

## Auth decision for MCP server

**Reuse existing agent token.** MCP server calls the app with `Authorization: Bearer <API_TOKEN>` where `API_TOKEN` is an agent’s `api_key` (from register). No shared-secret or new auth. README: register an agent (or use existing), set `API_TOKEN`; MCP sends it on every request.

---

## Step checklist (file paths + acceptance)

### Step 1 — Policies (backend + seed) ✅
- **Create:** `lib/models/Policy.ts` — Policy model `{ name, version, chunks: [{ id, title?, text }], createdAt, updatedAt }`
- **Create:** `scripts/seed-policies.ts` — seed 3 policy docs (KYC Minimum Documentation, EDD Triggers, Record Retention & Audit Trail), 10–20 bullets each, split into chunks
- **Create:** `app/api/policies/route.ts` — GET list (name, version, _id)
- **Create:** `app/api/policies/search/route.ts` — GET `?q=...` keyword match on chunk text, return chunks + policy ref
- **Create:** `app/api/policies/[id]/route.ts` — GET one policy with chunks
- **Acceptance:** Seed script runs; GET /api/policies returns 3 items; GET /api/policies/search?q=KYC returns relevant chunks.

### Step 2 — Case outputs + audit trail ✅
- **Modify:** `lib/models/Case.ts` — ICaseOutput: add `ts`, `kind: "draft"|"final"`, `citations: [{ policyId, chunkId, quote? }]`; auditTrail entry shape already has at, action, agentId, detail (extend metadata if needed)
- **Create:** `app/api/cases/[id]/outputs/route.ts` — POST body `{ kind, content, citations, flags, requestId }`; idempotency by requestId (store in new Idempotency model or in-memory Map keyed by agentId+caseId+requestId); append output + auditTrail; logActivity case_output_posted; update agent lastSeen/recentActivity
- **Modify:** `app/api/cases/[id]/route.ts` — GET response includes outputs + auditTrail
- **Acceptance:** POST /api/cases/:id/outputs with valid body returns 201; duplicate requestId returns 200 same response; GET case includes outputs and audit.
- **Manual test:** See [docs/PR2_STEP2_MANUAL_TEST.md](docs/PR2_STEP2_MANUAL_TEST.md).

### Step 3 — Case detail UI + post form ✅
- **Create:** `app/cases/[id]/page.tsx` — case details, outputs (content, citations, flags), audit trail; simple form to POST output (kind, content, citations, flags) for manual demo
- **Create:** `app/cases/[id]/CaseDetailClient.tsx`, `CaseOutputForm.tsx`, `CitationsPicker.tsx`; `lib/client/auth.ts` for agent token (localStorage).
- **Acceptance:** Visiting /cases/[id] shows case; form submits and new output appears; policy_qa final without citations shows 400; citation search adds policyId/chunkId.
- **2-minute demo:** See [docs/PR2_STEP3_DEMO_SCRIPT.md](docs/PR2_STEP3_DEMO_SCRIPT.md).

### Step 4 — Reliability + safety-lite ✅
- **Create:** `lib/utils/rate-limit.ts` — in-memory per-agent token bucket (30/min default, env RATE_LIMIT_PER_MINUTE) for POST /api/cases and POST /api/cases/[id]/outputs; 429 with retryAfterSeconds; log rate_limited.
- **Create:** `lib/utils/redact.ts` — redactPII (emails, phones, SSNs, long digits); apply before ActivityLog and auditTrail writes.
- **Modify:** POST /api/cases/[id]/outputs — policy_qa final without citations returns 400 with error "citations_required" and message; UI hint when policy_qa + kind=final.
- **Acceptance:** Rate limit returns 429 when exceeded; policy_qa final without citations rejected; no raw PII in activity_log/auditTrail.
- **Docs:** [docs/REGULATED_CONTROLS.md](docs/REGULATED_CONTROLS.md) — config, redaction, curl tests.

### Step 5 — MCP server ✅
- **Create:** `mcp-server/` — TypeScript MCP server (@modelcontextprotocol/sdk, zod) with 3 tools: get_policy(query), create_case(type, title, input), post_case_output(caseId, kind, content, citations, flags?, requestId?). Each tool calls app API with BASE_URL + Authorization: Bearer API_TOKEN. requestId auto-generated if omitted.
- **Create:** `mcp-server/README.md` — how to run, env (BASE_URL, API_TOKEN), getting API_TOKEN via POST /api/agents/register, tool descriptions, error handling (429 retryAfterSeconds, citations_required), smoke test.
- **Create:** `mcp-server/.env.example`, `mcp-server/scripts/smoke-test.ts` — one-shot test of all 3 tools.
- **Acceptance:** MCP server runs (stdio); tools return/side-effect correctly; 429 and citations_required surfaced clearly.

### Step 6 — Demo case fixtures ✅
- **Schema:** Case model: `tags?: string[]` (default []), `createdByAgentId` optional; index on `tags`.
- **Create:** `lib/seed-demo-cases.ts` — idempotent seed (tag `demo_finance_v1`); if any case has tag, skip. Creates 8 cases: 3 kyc_triage, 3 compliance_memo, 2 policy_qa; auditTrail entry system `demo_seeded`.
- **Create:** `scripts/seed-demo-cases.ts` — runs seed then disconnects; requires MONGODB_URI.
- **Create:** POST `/api/admin/seed-demo` — protected by `DEMO_SEED_SECRET` (header `x-demo-seed-secret`); returns 404 if env unset; returns `{ created, skipped }`.
- **Acceptance:** 8 demo cases visible on /cases; re-run is no-op; curl to seed and list confirms tag.
- **Docs:** [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) — 2-minute demo flow, curl to seed and verify.

---

## Migration / Railway

- **Policies:** Run once: `npx tsx scripts/seed-policies.ts` (MONGODB_URI, optional MONGODB_DB). Idempotent.
- **Demo cases:** **Locally:** `npx tsx scripts/seed-demo-cases.ts`. **Railway (no shell):** set `DEMO_SEED_SECRET`, then `curl -X POST https://APP/api/admin/seed-demo -H "x-demo-seed-secret: $DEMO_SEED_SECRET"`.

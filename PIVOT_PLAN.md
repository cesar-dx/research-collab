# Pivot Plan: Regulated Workflow Agent Starter Kit (Finance)

Reframe from Research Collab to a finance-focused, regulated-enterprise demo for HW3 + FDE (Custom Agents). **No restart:** keep Next.js + MongoDB + Railway, protocol (skill.md, heartbeat.md, skill.json), and agent onboarding flow.

---

## 1) What Already Exists — Reuse Directly

| Area | What exists | Reuse as |
|------|-------------|----------|
| **Agent onboarding** | `POST /api/agents/register` → api_key + claim_url; claim page `/claim/[token]` | Same; add in response: protocol URLs + “how to post a task / pick up a case”. Optional: register accepts `capabilities[]`. |
| **Protocol URLs** | `app/skill.md/route.ts`, `app/heartbeat.md/route.ts`, `app/skill.json/route.ts` | Same routes; **content** updated to finance workflows (cases, MCP tools, policies). |
| **skill.json** | name, version, description, metadata.openclaw, api_base | Change name/description/emoji to Regulated Workflow (Finance); api_base unchanged. |
| **Backend auth** | `extractApiKey`, Bearer on all non-register routes, Agent model | Keep. Add optional `capabilities[]`, `lastSeen`, `recentActivity` on Agent. |
| **Database** | Mongoose, `lib/db/mongodb.ts`, Agent, Researcher, CollabRequest | Keep Agent (extend). Researcher/CollabRequest can stay for now or be deprecated later. Add **Case**, **ActivityLog**, **Policy** (or seeded fixtures). |
| **API helpers** | successResponse, errorResponse, generateApiKey, extractApiKey, validatePagination, sanitizeInput, checkAdminKey | Keep. Add `logActivity()`. |
| **UI** | Landing, claim page, Header, researchers list, requests (activity) list | Rename copy/nav to “Regulated Workflow (Finance)”. Add **Cases**, **Agent Directory**, **Activity Log**; keep or repurpose researchers/requests as needed. |
| **Deploy** | railway.json, APP_URL, MONGODB_URI | Unchanged. |

---

## 2) Implementation Plan — PR-Sized Steps

### PR-1 — Brand + Cases + Observability (first PR) ✅
- **Scope:** Rename to “Regulated Workflow (Finance)”; add Case model + CRUD; activity_log + logActivity; Agent Directory + Activity Log pages.
- **Files:** layout, Header, page (copy); lib/models/Case.ts, ActivityLog.ts; lib/utils/activity.ts (logActivity); app/api/cases/route.ts, app/api/cases/[id]/route.ts; app/agents/page.tsx, app/activity/page.tsx; extend Agent schema (capabilities, lastSeen, recentActivity).
- **Endpoints:** `POST /api/cases`, `GET /api/cases`, `GET /api/cases/[id]`; all case create/update call logActivity.
- **Acceptance:** Home and nav say “Regulated Workflow (Finance)”; agents can create/list/get cases; every mutation appends to activity_log; Agent Directory and Activity Log pages render.

### PR-2 — Policies + MCP server shell
- **Scope:** Policy model or fixtures (name, version, textChunks); MCP server folder with 3 tools: get_policy(query), create_case(type, input), post_case_output(caseId, output, citations, flags).
- **Files:** lib/models/Policy.ts or seed data; new `mcp-server/` (TypeScript) with tools; app API or MCP server calls into DB.
- **Endpoints:** MCP tools call app (or shared DB); optional `GET /api/policies` for app.
- **Acceptance:** MCP server runs; tools create_case and post_case_output write to MongoDB; get_policy returns snippets from seeded policies.

### PR-3 — Finance workflow 1 (e.g. KYC checklist)
- **Scope:** Case type `kyc_triage`; input (unstructured profile + doc list); output schema (checklist, missing, risk flags, citations); skill.md/heartbeat update for “pick up KYC case”.
- **Files:** Case type + validation; app/api/cases/[id]/output or PATCH; skill.md/heartbeat.md; optional MCP tool post_case_output schema.
- **Acceptance:** Agent can create a KYC case, post structured output with citations; UI shows case + output.

### PR-4 — Finance workflow 2 (e.g. Compliance memo or Policy Q&A)
- **Scope:** Second workflow (compliance_memo or policy_qa); same pattern: case type, input/output schema, protocol docs.
- **Files:** Same as PR-3 for the chosen workflow.
- **Acceptance:** End-to-end demo for both workflows.

### PR-5 — Reliability (idempotency, retries, rate limit)
- **Scope:** Idempotency-Key header on key POSTs (e.g. cases, output); store per agent; retries with backoff for internal calls; rate limiting per agent (in-memory or DB).
- **Files:** lib/utils/idempotency.ts, rate-limit middleware or helper; wrap case/create and post output.
- **Acceptance:** Duplicate Idempotency-Key returns same response; rate limit returns 429; retries logged.

### PR-6 — Guardrails + moderation
- **Scope:** “Report case/output” + “remove output” admin action (x-admin-key); OR tool allowlist + redaction in activity log.
- **Files:** app/api/admin/... routes; activity_log metadata for redaction; skill.md note on policy.
- **Acceptance:** Admin can remove or flag output; activity log respects redaction.

### PR-7 — Sub-agents / skills (orchestration + schemas)
- **Scope:** Document or implement triage_agent, retrieval_agent, validator_agent roles; skills as reusable functions: extract_fields_to_json(schema), cite_policy_snippets(), validate_output_against_rules().
- **Files:** docs or lib/skills/; optional orchestration layer in MCP or app.
- **Acceptance:** Clear roles + skill signatures; validator checks citations and format.

### PR-8 — Protocol + onboarding polish
- **Scope:** skill.md and heartbeat.md fully aligned with cases, MCP tools, and two workflows; register response includes “how to post a task / pick up a case” and protocol URLs.
- **Files:** app/skill.md/route.ts, app/heartbeat.md/route.ts, app/api/agents/register/route.ts (response body).
- **Acceptance:** New agent can read skill.md and complete a case end-to-end.

### PR-9 — Eval-lite (optional)
- **Scope:** ~20 canned test cases; checks: citations when required, refuse when evidence missing, valid JSON schema, no PII in logs.
- **Files:** scripts/eval or tests; fixtures.
- **Acceptance:** Harness runs and reports pass/fail.

---

## 3) Constraints (all PRs)

- No scheduled polling.
- Onboarding stays self-serve (classmates/agents join without manual approval).
- Minimal, incremental changes; do not break current deployment or existing agents.

---

## 4) Domain Reframe (reference)

- **ResearchProject/Match** → **Case/Workflow**. Cases: `{ title, type, status, input, outputs[], createdByAgentId, assignedAgentIds[], auditTrail[], createdAt }`.
- **Policies:** `{ name, version, textChunks[] }` (seeded or DB).
- **activity_log:** `{ ts, actorType(agent|system), actorId, action, caseId?, metadata }`.
- **Agent:** keep; add `capabilities[]`, `lastSeen`, `recentActivity`.

This plan is the single source of truth for the pivot; PR-1 is implemented first.

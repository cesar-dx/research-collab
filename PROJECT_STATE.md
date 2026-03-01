# Regulated Workflow (Finance) — Project State (for AI handoff)

## What this project is

**Research Collab** is a web app for the MIT “Building with AI Agents” class. AI agents (e.g. OpenClaw) use it to find research collaborators on behalf of humans: agents register, create researcher profiles, search by interests, send collaboration requests, and respond to incoming ones. The app follows the assignment’s skill.md/heartbeat.md/skill.json protocol so agents can discover and use it autonomously.

---

## Tech stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Database:** MongoDB (Mongoose); connection in `lib/db/mongodb.ts`
- **Styling:** Tailwind CSS v4
- **Deployment:** Railway (production). `railway.json` and `next start -p 3000` are configured.

---

## Production

- **Live URL:** https://research-collab-production.up.railway.app  
- **Protocol URLs:**  
  - skill.md: https://research-collab-production.up.railway.app/skill.md  
  - heartbeat.md: https://research-collab-production.up.railway.app/heartbeat.md  
  - skill.json: https://research-collab-production.up.railway.app/skill.json  
- **Env on Railway:** `MONGODB_URI`, `MONGODB_DB`, `APP_URL` (set to the Railway URL), `ADMIN_KEY`. Optional: `RATE_LIMIT_PER_MINUTE` (default 30), `DEMO_SEED_SECRET` (for POST /api/admin/seed-demo). No `.env` files are committed; they are gitignored.

---

## Repo structure (relevant paths)

- **Protocol (for agents):**  
  - `app/skill.md/route.ts` — full API docs for agents (registration, profile, search, requests, auth).  
  - `app/heartbeat.md/route.ts` — task loop (setup → profile → handle incoming → send requests → check done).  
  - `app/skill.json/route.ts` — metadata (name, version, `metadata.openclaw` with emoji, category, api_base).

- **API (REST, Bearer auth except register):**  
  - `app/api/agents/register/route.ts` — POST, returns api_key and claim_url; logs agent_registered.  
  - `app/api/agents/claim/[token]/route.ts` — POST, marks agent as claimed; logs agent_claimed.  
  - `app/api/agents/me/route.ts` — GET, agent + capabilities, lastSeen, recentActivity, profile.  
  - `app/api/agents/list/route.ts` — GET, agent directory (no auth).  
  - `app/api/cases/route.ts` — GET list cases, POST create case (auth); logs case_created.  
  - `app/api/cases/[id]/route.ts` — GET one case (includes outputs + auditTrail).  
  - `app/api/cases/[id]/outputs/route.ts` — POST add output (auth, idempotency, rate limit, policy_qa citation validation, PII redaction in audit).  
  - `app/api/policies/route.ts` — GET list policies.  
  - `app/api/policies/search/route.ts` — GET search chunks by keyword.  
  - `app/api/policies/[id]/route.ts` — GET one policy.  
  - `app/api/activity/route.ts` — GET activity log (no auth).  
  - `app/api/admin/seed-demo/route.ts` — POST seed 8 demo cases (idempotent); protected by `x-demo-seed-secret` / `DEMO_SEED_SECRET`; returns 404 if env unset.  
  - `app/api/researchers/profile/route.ts` — POST, create/update researcher profile.  
  - `app/api/researchers/route.ts` — GET, search (query, area, open, limit, offset).  
  - `app/api/researchers/[id]/route.ts` — GET, one researcher + sharedInterests.  
  - `app/api/collab/request/route.ts` — POST, send collaboration request.  
  - `app/api/collab/requests/route.ts` — GET, list requests (direction, status).  
  - `app/api/collab/requests/[id]/respond/route.ts` — PATCH, accept/decline.  
  - `app/api/health/route.ts` — health check.

- **Models (Mongoose):**  
  - `lib/models/Agent.ts` — name, description, apiKey, claimToken, claimStatus, ownerEmail, researcherId, lastActive, **capabilities[]**, **lastSeen**, **recentActivity[]**.  
  - `lib/models/Case.ts` — title, type, status, input, outputs[], createdByAgentId (optional), assignedAgentIds[], auditTrail[], tags[] (e.g. demo_finance_v1); IdempotencyKey for POST outputs.  
  - `lib/models/Policy.ts` — name, version, chunks[] (id, title?, text).  
  - `lib/models/IdempotencyKey.ts` — key, agentId, route, caseId?, response, createdAt.  
  - `lib/models/ActivityLog.ts` — ts, actorType (agent|system), actorId, action, caseId?, metadata.  
  - `lib/models/Researcher.ts` — (legacy) agentId, displayName, institution, researchAreas, etc.  
  - `lib/models/CollabRequest.ts` — (legacy) from/to researcher, message, status.

- **Frontend (human-facing):**  
  - `app/page.tsx` — landing: Regulated Workflow (Finance), stats, Cases / Agent Directory / Activity Log.  
  - `app/claim/[token]/page.tsx` — one-click claim page.  
  - `app/cases/page.tsx` — Cases list (links to case detail).  
  - `app/cases/[id]/page.tsx` — Case detail: header, input, outputs (newest first), audit trail, Post output form + citation picker; token in localStorage.  
  - `app/agents/page.tsx` — Agent directory.  
  - `app/activity/page.tsx` — Activity log.  
  - `app/researchers/page.tsx` — (legacy) browse researchers.  
  - `app/requests/page.tsx` — (legacy) collaboration requests.  
  - `app/layout.tsx`, `components/Header.tsx` — layout and nav.

- **Shared:**  
  - `lib/utils/api-helpers.ts` — successResponse, errorResponse, generateApiKey, generateClaimToken, extractApiKey, validatePagination, sanitizeInput, checkAdminKey. API keys use prefix `rc_`, claim tokens `rc_claim_`.  
  - `lib/utils/activity.ts` — logActivity (redacts PII in metadata before storing). Used on register, claim, case create, case output post, rate_limited.  
  - `lib/utils/rate-limit.ts` — in-memory per-agent token bucket for POST /api/cases and POST /api/cases/[id]/outputs (env RATE_LIMIT_PER_MINUTE, default 30).  
  - `lib/utils/redact.ts` — redactPII(input) for emails, phones, SSNs, long digit sequences.  
  - `lib/client/auth.ts` — getAgentToken / setAgentToken (localStorage) for Case detail form.

- **MCP server** (optional, for agent integrations):  
  - `mcp-server/` — standalone TypeScript MCP server (stdio). Tools: get_policy(query), create_case(type, title, input), post_case_output(caseId, kind, content, citations, flags?, requestId?). Env: BASE_URL, API_TOKEN. See [mcp-server/README.md](mcp-server/README.md).

---

## OpenClaw / “run agent on it”

- **For the project owner (Docker at `~/openclaw`):**  
  - `run-openclaw-agent.sh` — reads message from `OPENCLAW_AGENT_MESSAGE.txt`, runs `docker compose run --rm openclaw-cli agent --message "..."` from `OPENCLAW_REPO` (default `$HOME/openclaw`). Requires one of: `OPENCLAW_AGENT`, `OPENCLAW_TO`, or `OPENCLAW_SESSION_ID`.  
  - `OPENCLAW_AGENT_MESSAGE.txt` — instructions for the human + the exact message to send (skill + heartbeat URLs, steps 1–4). Control UI (no channel) is the primary path; script is Option B.

- **For classmates:**  
  - `SHARE_WITH_CLASSMATES.md` — copy-paste instructions and the same message block so they can run their own agents on the live app (Control UI or channel).

- **Design choice:** No scheduled polling; agent runs the heartbeat once until “done.” Re-running on demand is the intended way to check again later.

---

## Assignment compliance (already done)

- Protocol: skill.md, heartbeat.md, skill.json at the required URLs.  
- Backend: agent registration, claiming, Bearer auth, core functionality (profiles, search, collab requests).  
- Frontend: landing, claim page, content (researchers, requests).  
- skill.md is detailed (curl, responses, errors, escalation).  
- .gitignore includes `.env*`.  
- railway.json present for deploy.

---

## How to run locally

- `npm run dev` (requires `MONGODB_URI`, `MONGODB_DB`, and optionally `APP_URL`/`NEXT_PUBLIC_APP_URL` in `.env.local`).  
- Open http://localhost:3000 and http://localhost:3000/skill.md to verify.

---

## Pivot and next steps

- **PR2:** Step 1–6 complete. See **PR2_PLAN.md** for full checklist.  
- **Regulated controls:** Rate limiting (POST cases/outputs), PII redaction (ActivityLog + auditTrail), policy_qa citation enforcement — see [docs/REGULATED_CONTROLS.md](docs/REGULATED_CONTROLS.md).  
- **Demo cases (Step 6):** 8 finance cases (3 KYC, 3 compliance_memo, 2 policy_qa), tag `demo_finance_v1`. Seed idempotently: **locally** `npm run seed-demo` or `npx tsx scripts/seed-demo-cases.ts` (requires MONGODB_URI); **Railway** set `DEMO_SEED_SECRET` and `POST /api/admin/seed-demo` with header `x-demo-seed-secret`. See [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md). Policies (if needed): `npm run seed-policies`.  
- **Manual tests:** [docs/PR2_STEP2_MANUAL_TEST.md](docs/PR2_STEP2_MANUAL_TEST.md); [docs/PR2_STEP3_DEMO_SCRIPT.md](docs/PR2_STEP3_DEMO_SCRIPT.md); [docs/REGULATED_CONTROLS.md](docs/REGULATED_CONTROLS.md); [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) (2-min demo flow).  
- Do not add scheduled polling; onboarding stays self-serve.

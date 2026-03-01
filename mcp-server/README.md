# Research Collab MCP Server

MCP server that exposes three tools for the Regulated Workflow app: **get_policy**, **create_case**, and **post_case_output**. It calls your deployed app (or local dev server) with an agent Bearer token.

The app may be pre-seeded with **8 demo finance cases** (KYC, compliance memo, policy QA). You can list and work on those via the API or the /cases UI. Agents can also create new cases via the **create_case** tool.

## Prerequisites

- Node.js 18+
- A running instance of the app (e.g. [Railway](https://railway.app) or `npm run dev` in the repo root)
- An agent **API token** (see below)

## Getting an API token

Register an agent to get an `api_key`:

```bash
curl -X POST https://YOUR_APP_URL/api/agents/register \
  -H "Content-Type: application/json" \
  -d '{"name":"My MCP Agent","description":"MCP client"}'
```

Response includes `api_key` — use that as `API_TOKEN`.

## Setup

```bash
cd mcp-server
npm install
cp .env.example .env
# Edit .env: set BASE_URL and API_TOKEN
```

## Run

```bash
BASE_URL=https://your-app.up.railway.app API_TOKEN=your_api_key npm start
```

Or with a `.env` file (you must load it yourself, e.g. `export $(cat .env | xargs)` then `npm start`).

The server runs over **stdio** (standard input/output). MCP clients (e.g. Claude Desktop, Cursor) connect by spawning this process and communicating via stdin/stdout.

## Environment variables

| Variable     | Required | Description |
|-------------|----------|-------------|
| `BASE_URL`  | Yes      | App base URL (no trailing slash), e.g. `https://research-collab-production.up.railway.app` |
| `API_TOKEN`| Yes      | Agent API key from `POST /api/agents/register` |

## Tools

### 1. `get_policy(query)`

Calls `GET /api/policies/search?q=...`. Returns top policy chunks matching the query.

**Parameters:** `query` (string)

**Returns:** Array of `{ policyId, policyName, version, chunkId, title?, text }`

**Example:** `get_policy("retention")` → chunks from Record Retention policy.

---

### 2. `create_case(type, title, input)`

Calls `POST /api/cases` with Bearer token. Creates a new case.

**Parameters:** `type` (enum: `kyc_triage` \| `compliance_memo` \| `policy_qa` \| `general`), `title` (string), `input` (string)

**Returns:** `{ caseId, title, type, status }`

**Example:** `create_case("policy_qa", "KYC question", "What documents are required?")`

---

### 3. `post_case_output(caseId, kind, content, citations, flags?, requestId?)`

Calls `POST /api/cases/:id/outputs` with Bearer token. Adds an output (draft or final). For **policy_qa** cases with **final** kind, at least one citation is required. If `requestId` is omitted, a UUID is generated for idempotency.

**Parameters:**  
- `caseId` (string)  
- `kind` (`draft` \| `final`)  
- `content` (string)  
- `citations` (array of `{ policyId, chunkId, quote? }`)  
- `flags` (optional string array)  
- `requestId` (optional string, UUID)

**Returns:** `{ ok: true, outputIndex, outputTs }`

**Example:** `post_case_output("caseId", "final", "Answer: ...", [{ policyId: "...", chunkId: "..." }])`

---

## Error handling

- **429 (rate limited):** The tool returns an error message that includes `retryAfterSeconds`. Clients can wait and retry.
- **400 (citations_required):** For policy_qa final without citations, the app returns a clear message; the MCP server surfaces it in the tool error.
- All errors include HTTP status and a short body excerpt where useful.

## Smoke test

Run the three tools once against your app (no MCP client needed):

```bash
BASE_URL=https://your-app.up.railway.app API_TOKEN=your_api_key npm run smoke-test
```

Requires the app to have policies seeded (e.g. `npx tsx scripts/seed-policies.ts`). Expected output:

1. `get_policy("retention")` → list of chunks  
2. `create_case("policy_qa", "Smoke test case", "...")` → caseId  
3. `post_case_output(caseId, "final", "Answer...", citations)` → outputIndex, outputTs  

Example:

```
BASE_URL=https://research-collab-production.up.railway.app
API_TOKEN=rc_xxxxx

1) get_policy("retention")
  OK: 5 chunks
  Sample: policyId=... chunkId=...

2) create_case("policy_qa", "Smoke test case", "What is the retention period?")
  OK: caseId=...

3) post_case_output(caseId, "final", "Answer: ...", citations)
  OK: outputIndex=0 outputTs=...

Smoke test passed.
```

## Example tool calls (for README / demos)

| Tool              | Example arguments |
|-------------------|-------------------|
| `get_policy`      | `query: "retention"` |
| `create_case`     | `type: "policy_qa"`, `title: "KYC question"`, `input: "What documents are required?"` |
| `post_case_output`| `caseId: "<from create_case>"`, `kind: "final"`, `content: "Answer: ..."`, `citations: [{ policyId: "<from get_policy>", chunkId: "<from get_policy>" }]` |

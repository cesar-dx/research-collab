# PR2 Step 2 — Manual test sequence

Use these curls to verify Case outputs + idempotency + audit trail + validation. Replace `BASE` and `TOKEN` with your app URL and agent API key.

## 1. Get a Bearer token

Register an agent and save the `api_key`:

```bash
export BASE="https://research-collab-production.up.railway.app"
# or: export BASE="http://localhost:3000"

curl -s -X POST "$BASE/api/agents/register" \
  -H "Content-Type: application/json" \
  -d '{"name": "TestAgentStep2", "description": "Testing PR2 outputs"}'
```

From the response, set:

```bash
export TOKEN="<paste api_key here>"
```

## 2. Get a valid policyId and chunkId (for policy_qa citations)

List policies and pick one `_id`; then get that policy to see chunk `id`s:

```bash
curl -s "$BASE/api/policies" | jq .
curl -s "$BASE/api/policies/<POLICY_ID>" | jq '.data.policy.chunks[0].id'
```

Set for later:

```bash
export POLICY_ID="<from GET /api/policies>"
export CHUNK_ID="<e.g. kyc-1 from GET /api/policies/[id]>"
```

## 3. Create a policy_qa case

```bash
curl -s -X POST "$BASE/api/cases" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Policy Q&A test", "type": "policy_qa", "input": "What is the retention period?"}'
```

Set:

```bash
export CASE_ID="<paste case _id from response>"
```

## 4. Acceptance 1 — policy_qa final with empty citations → 400

```bash
curl -s -X POST "$BASE/api/cases/$CASE_ID/outputs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"kind": "final", "content": "Answer here.", "citations": []}'
```

Expected: `"success": false`, status 400, message about policy_qa requiring non-empty citations.

## 5. Acceptance 2 — policy_qa final with valid citations → 201

```bash
curl -s -X POST "$BASE/api/cases/$CASE_ID/outputs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"kind\": \"final\", \"content\": \"Records must be retained for at least five years.\", \"citations\": [{\"policyId\": \"$POLICY_ID\", \"chunkId\": \"$CHUNK_ID\", \"quote\": \"five years\"}]}"
```

Expected: `"success": true`, status 201, `data.ok: true`, `data.caseId`, `data.outputIndex`, `data.outputTs`.

## 6. Acceptance 3 — same requestId → 200, no duplicate output

```bash
curl -s -X POST "$BASE/api/cases/$CASE_ID/outputs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"kind\": \"final\", \"content\": \"Same content.\", \"citations\": [{\"policyId\": \"$POLICY_ID\", \"chunkId\": \"$CHUNK_ID\"}], \"requestId\": \"idem-001\"}"
```

Then repeat the **exact same** request (same `requestId`):

```bash
curl -s -X POST "$BASE/api/cases/$CASE_ID/outputs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"kind\": \"final\", \"content\": \"Same content.\", \"citations\": [{\"policyId\": \"$POLICY_ID\", \"chunkId\": \"$CHUNK_ID\"}], \"requestId\": \"idem-001\"}"
```

Expected: first call 201, second call 200 with same `data`; GET case should show **one** extra output (no duplicate).

## 7. Acceptance 4 — GET /api/cases/[id] shows outputs and auditTrail

```bash
curl -s "$BASE/api/cases/$CASE_ID" -H "Authorization: Bearer $TOKEN" | jq .
```

Expected: `case.outputs` is an array with entries that have `ts`, `agentId`, `kind`, `content`, `citations`, `flags`. `case.auditTrail` has entries with `ts`, `actorType`, `actorId`, `action`, `metadata`.

## 8. Optional — draft output (no citation check)

```bash
curl -s -X POST "$BASE/api/cases/$CASE_ID/outputs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"kind": "draft", "content": "Draft answer without citations."}'
```

Expected: 201. Draft does not require citations even for policy_qa.

## Idempotency key

- Use **body.requestId** (string). Optional; when present, duplicate requests with the same `requestId` for the same agent and case return the stored response (200) and do not append a second output.
- Alternatively you could support **Idempotency-Key** header (same value as requestId); current implementation uses **requestId** in the body only.

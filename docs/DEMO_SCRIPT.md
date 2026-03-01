# 2-minute demo flow (Regulated Workflow)

Use this to show the app end-to-end: seed demo cases, browse agents/activity, pick a case, post an output (with citations for policy_qa final), and briefly show audit trail, redaction, and rate limiting.

---

## 1) Seed demo cases

**Locally (script):**
```bash
cd research-collab
export MONGODB_URI="your_mongodb_uri"
npm run seed-demo
# or: npx tsx scripts/seed-demo-cases.ts
# Expected: "Seeded 8 demo cases (tag: demo_finance_v1)." or "Demo cases already exist. Skipping."
```
(Policies first, if needed: `npm run seed-policies`.)

**Railway or any host (HTTP endpoint):**  
Set `DEMO_SEED_SECRET` in the environment, then:
```bash
curl -X POST "https://YOUR_APP_URL/api/admin/seed-demo" \
  -H "x-demo-seed-secret: YOUR_DEMO_SEED_SECRET"
# Expected: {"success":true,"data":{"created":8,"skipped":false,"message":"Created 8 demo cases."}}
# If already seeded: {"success":true,"data":{"created":0,"skipped":true,"message":"Demo cases already exist."}}
```

---

## 2) List cases and confirm 8 demo cases

```bash
curl -s "https://YOUR_APP_URL/api/cases?limit=20" | jq '.data.cases | length, .[0].title, .[0].tags'
# Expect: 8 (or more), a title string, and ["demo_finance_v1"] for seeded cases.
```

Open **/cases** in the browser — you should see 8 cases (KYC, compliance memo, policy QA).

---

## 3) Show /agents and /activity

- Open **/agents** — agent directory (agents that registered).
- Open **/activity** — activity log (case_created, case_output_posted, rate_limited, etc.).  
Mention that metadata is PII-redacted before storage.

---

## 4) Pick a case and post an output

- Open a **policy_qa** case (e.g. “Policy QA — record retention period” or “Policy QA — EDD triggers”).
- In the **Post output** section:
  - Paste an agent token (or use one from POST /api/agents/register).
  - Choose **final** — the UI shows the hint: “Citations are required for policy_qa final outputs.”
  - Use **Citation search** to find a chunk (e.g. search “retention” or “EDD”), add at least one citation.
  - Enter content and submit.
- Confirm the new output appears and the audit trail shows `output_posted`.

---

## 5) Audit trail, redaction, rate limit (brief)

- **Audit trail:** On the case detail page, show the table: system `demo_seeded`, then agent `output_posted` entries.
- **Redaction:** Explain that ActivityLog and audit metadata are redacted for emails, phones, SSNs, long digit sequences (see [REGULATED_CONTROLS.md](REGULATED_CONTROLS.md)).
- **Rate limit:** Optionally trigger 429 by spamming POST /api/cases/:id/outputs (see REGULATED_CONTROLS.md); show that the activity log records `rate_limited` and the API returns `retryAfterSeconds`.

---

## Verify demo cases by tag (curl)

```bash
# List cases; filter or inspect for tag (if your API returns tags)
curl -s "https://YOUR_APP_URL/api/cases?limit=20" | jq '.data.cases[] | {title, type, tags}'
# Seeded cases have tags: ["demo_finance_v1"]
```

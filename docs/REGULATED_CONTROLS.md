# Regulated controls (PR2 Step 4)

Minimal production-ish controls for the regulated finance demo: per-agent rate limiting, PII redaction in logs/audit, and policy_qa citation enforcement.

---

## Rate limiting

**Routes:** `POST /api/cases`, `POST /api/cases/[id]/outputs`

**Behavior:** In-memory token bucket per agent per route. Default **30 requests per minute** per agent (configurable).

**Config:**

- `RATE_LIMIT_PER_MINUTE` — optional env var (default: 30). Set to a positive integer to change the limit.

**When exceeded:**

- Status: **429**
- Body: `{ "success": false, "error": "rate_limited", "retryAfterSeconds": N }`
- Header: `Retry-After: N`
- An activity log entry is written with `action: "rate_limited"` and metadata `{ route, retryAfterSeconds }`.

**Test (trigger 429):**

```bash
# Replace API_KEY and CASE_ID. Run many times in a loop until 429.
for i in $(seq 1 35); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:3000/api/cases/CASE_ID/outputs" \
    -H "Authorization: Bearer API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"kind":"draft","content":"test '$i'"}'
done
```

Then check `/api/activity` for an entry with `action: "rate_limited"`.

---

## PII redaction (safety-lite)

**What is redacted:** Strings in metadata that match:

- Email addresses
- Phone numbers (US-style, with optional extension)
- US SSNs (`XXX-XX-XXXX`)
- Long digit sequences (10–16 digits, e.g. account numbers)

**Where applied:**

- **ActivityLog:** `metadata` is redacted before writing (all `logActivity` call sites).
- **Case.auditTrail:** Each entry’s `metadata` (and case-create `detail` when stored) is redacted before saving.

**Implementation:** `lib/utils/redact.ts` — `redactPII(input: unknown): unknown` (recursively processes objects/arrays/strings).

**Test (redacted metadata):**

1. Create a case with PII in the title, or post an output and include PII in a field that ends up in metadata (e.g. pass a note in metadata — currently we only store `kind`, `flagsCount`, `citationsCount` in output metadata; for a quick test, you could temporarily log a body that contains an email).
2. Simpler: call `logActivity` with metadata that contains an email/phone (e.g. from a test script or a one-off API that logs activity). Then GET `/api/activity` and confirm the value is `[REDACTED]`.
3. Case create: create a case with title containing an email, then GET the case and check the first audit entry’s `detail` (or the activity log for `case_created`) — should show `[REDACTED]` instead of the email.

Example curl for activity check after creating a case with PII in title:

```bash
# After creating a case with title "Test user@example.com"
curl -s "http://localhost:3000/api/activity?limit=5" | jq '.data.entries[0].metadata'
# Should show redacted string for any PII in metadata/title.
```

---

## policy_qa citation rule

**Backend:** For `POST /api/cases/[id]/outputs`, when `case.type === "policy_qa"` and `kind === "final"`, at least one citation is required. If not provided:

- Status: **400**
- Body: `{ "success": false, "error": "citations_required", "message": "policy_qa cases require at least one citation when kind is \"final\". Add citations from the policy search above." }`

**UI:** On the case detail page, when the case type is `policy_qa` and the user selects kind **final**, a hint is shown: “Citations are required for policy_qa final outputs. Add at least one from the search above.”

**Test:**

```bash
# Post final output without citations on a policy_qa case (expect 400)
curl -s -X POST "http://localhost:3000/api/cases/CASE_ID/outputs" \
  -H "Authorization: Bearer API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"kind":"final","content":"My answer"}' | jq .
# Expect: .error === "citations_required"
```

---

## Quick manual test checklist

1. **429 rate limit:** Spam `POST /api/cases/:id/outputs` (or `POST /api/cases`) with the same agent token; confirm 429 and `retryAfterSeconds`; confirm `action: "rate_limited"` in `/api/activity`.
2. **Redacted metadata:** Create a case with a title containing an email/phone, or trigger activity/audit that stores PII; confirm ActivityLog and case audit show `[REDACTED]` instead of raw PII.
3. **policy_qa citation hint:** Open a `policy_qa` case, set kind to “final”, and confirm the amber hint appears; submit without citations and confirm 400 with `error: "citations_required"` and the message in the UI.

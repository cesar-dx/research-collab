# PR2 Step 3 — 2-minute demo script (Case Detail UI + Post Output Form)

## Prep (before demo)

1. **Policies seeded:** `npx tsx scripts/seed-policies.ts` (so policy search returns results).
2. **Agent token:** Register once: `POST /api/agents/register` with `name` + `description`, copy `api_key`. Have it ready to paste.
3. **At least one case:** Create via API or use an existing case (e.g. policy_qa type for citation demo).

---

## Demo flow (~2 min)

### 1) From Cases list to Case Detail (15 sec)

- Open **Cases** in the nav (or `/cases`).
- Click **any case** (row is a link).
- **Show:** Case detail page with header (title, type, status, created by, date), **Input** (verbatim), **Outputs** (newest first; empty if none), **Audit trail** table, and **Post output** section at the bottom.

### 2) Post a draft output (30 sec)

- In **Post output**, paste the **Agent token** (stored in localStorage for the session).
- Set **Kind** to **draft**.
- Type something in **Content** (e.g. “Draft answer for review”).
- Click **Post output**.
- **Show:** Success message; page refreshes and the new output appears in **Outputs** with ts, agentId, kind “draft”, and content. **Audit trail** has an `output_posted` (or `case_output_posted` in activity log) entry.

### 3) policy_qa: final without citations → 400 (20 sec)

- Create or open a **policy_qa** case (or use one you have).
- Set **Kind** to **final**, enter content, leave **Citations** empty.
- Click **Post output**.
- **Show:** Red error message (400): policy_qa requires non-empty citations when kind is final.

### 4) Add citation via search and post final (35 sec)

- In **Add citation**, type a keyword (e.g. **KYC** or **retention**).
- Click **Search**.
- **Show:** List of chunks (policy name, version, chunkId). Click one; it’s added to **Citations**.
- Optionally add another citation (search again, click).
- Set **Kind** to **final**, keep or adjust **Content**, click **Post output**.
- **Show:** Success; new output appears with **Citations** rendered (policy name/version · chunkId, and quote if present). Audit trail shows the new action.

### 5) Wrap-up (optional)

- **Navigation:** From Case detail, “← Cases” back to list; from list, click another case to show navigation is consistent.
- **Token prompt:** Clear token (or use incognito); show “Paste your agent token to post outputs” when token is missing.

---

## Acceptance checklist

- [ ] From `/cases` you can click a case and land on `/cases/[id]` and see full details.
- [ ] You can paste an agent token, post a draft output, and see it in Outputs (and audit trail).
- [ ] For policy_qa: posting final with no citations shows the 400 error in the UI.
- [ ] Adding citations via search and posting final succeeds; citations are readable (policy name/version + chunkId).
- [ ] Audit trail is visible and includes the output-posted action.

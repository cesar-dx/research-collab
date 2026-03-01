/**
 * Smoke test: call each tool once (via app API) to verify BASE_URL and API_TOKEN.
 * Run: BASE_URL=... API_TOKEN=... npm run smoke-test
 */
import { getPolicy, createCase, postCaseOutput } from '../src/tools.js';

async function main() {
  const base = process.env.BASE_URL ?? 'http://localhost:3000';
  const token = process.env.API_TOKEN ?? '';
  if (!token) {
    console.error('Set API_TOKEN (e.g. from POST /api/agents/register)');
    process.exit(1);
  }
  console.log('BASE_URL=%s', base);
  console.log('');

  // 1) get_policy("retention")
  console.log('1) get_policy("retention")');
  const policyResult = await getPolicy('retention');
  if ('status' in policyResult) {
    console.error('  FAIL:', policyResult.message);
    process.exit(1);
  }
  console.log('  OK: %d chunks', policyResult.chunks.length);
  if (policyResult.chunks.length > 0) {
    const c = policyResult.chunks[0];
    console.log('  Sample: policyId=%s chunkId=%s', c.policyId.slice(-8), c.chunkId);
  }
  console.log('');

  // 2) create_case("policy_qa", ...)
  console.log('2) create_case("policy_qa", "Smoke test case", "What is the retention period?")');
  const createResult = await createCase(
    'policy_qa',
    'Smoke test case',
    'What is the retention period?'
  );
  if (!('caseId' in createResult)) {
    console.error('  FAIL:', (createResult as import('../src/http.js').AppError).message);
    process.exit(1);
  }
  console.log('  OK: caseId=%s', createResult.caseId);
  const caseId = createResult.caseId;
  console.log('');

  // 3) post_case_output with citations (use first chunk from get_policy if any)
  const citations =
    policyResult.chunks.length > 0
      ? [{ policyId: policyResult.chunks[0].policyId, chunkId: policyResult.chunks[0].chunkId }]
      : [];
  console.log('3) post_case_output(caseId, "final", "Answer: ...", citations)');
  const postResult = await postCaseOutput(
    caseId,
    'final',
    'Answer: Retention is 7 years per policy.',
    citations,
    undefined,
    undefined
  );
  if ('status' in postResult) {
    console.error('  FAIL:', postResult.message);
    process.exit(1);
  }
  console.log('  OK: outputIndex=%d outputTs=%s', postResult.outputIndex, postResult.outputTs);
  console.log('');
  console.log('Smoke test passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

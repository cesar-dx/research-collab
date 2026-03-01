/**
 * MCP tool handlers: get_policy, create_case, post_case_output.
 * All call the app API via http.ts; errors surface 429 retryAfterSeconds and citations_required.
 */

import { appFetch, type AppError } from './http.js';

export interface PolicyChunk {
  policyId: string;
  policyName: string;
  version: string;
  chunkId: string;
  title?: string;
  text: string;
}

export async function getPolicy(query: string): Promise<{ chunks: PolicyChunk[] } | AppError> {
  const q = encodeURIComponent(String(query || '').trim());
  const result = await appFetch(`/api/policies/search?q=${q}&limit=20`, { auth: false });
  if (!result.ok) return result.error;
  const data = result.data as { chunks?: PolicyChunk[]; total?: number };
  const chunks = Array.isArray(data?.chunks) ? data.chunks : [];
  return { chunks };
}

export async function createCase(
  type: string,
  title: string,
  input: string
): Promise<{ caseId: string; title: string; type: string; status: string } | AppError> {
  const result = await appFetch('/api/cases', {
    method: 'POST',
    body: { type, title, input },
    auth: true,
  });
  if (!result.ok) return result.error;
  const data = result.data as { case?: { _id: string; title: string; type: string; status: string } };
  const c = data?.case;
  if (!c) return { status: 200, body: data, message: 'Unexpected response: no case in data' };
  return {
    caseId: c._id,
    title: c.title,
    type: c.type,
    status: c.status,
  };
}

export async function postCaseOutput(
  caseId: string,
  kind: string,
  content: string,
  citations: Array<{ policyId: string; chunkId: string; quote?: string }>,
  flags?: string[],
  requestId?: string
): Promise<
  | { ok: true; outputIndex: number; outputTs: string }
  | AppError
> {
  const id = String(caseId || '').trim();
  if (!id) return { status: 0, body: null, message: 'caseId is required' };
  const k = kind === 'final' ? 'final' : 'draft';
  const body = {
    kind: k,
    content: String(content ?? '').trim(),
    citations: Array.isArray(citations) ? citations : [],
    flags: Array.isArray(flags) ? flags : [],
    requestId: typeof requestId === 'string' && requestId.trim() ? requestId.trim() : crypto.randomUUID(),
  };
  const result = await appFetch(`/api/cases/${id}/outputs`, {
    method: 'POST',
    body,
    auth: true,
  });
  if (!result.ok) return result.error;
  const data = result.data as { ok?: boolean; outputIndex?: number; outputTs?: string };
  return {
    ok: true,
    outputIndex: typeof data?.outputIndex === 'number' ? data.outputIndex : 0,
    outputTs: typeof data?.outputTs === 'string' ? data.outputTs : new Date().toISOString(),
  };
}

export function formatToolError(err: AppError): string {
  let msg = `[${err.status}] ${err.message}`;
  if (err.retryAfterSeconds != null) {
    msg += ` (retryAfterSeconds: ${err.retryAfterSeconds})`;
  }
  return msg;
}

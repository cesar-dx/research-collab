/**
 * MCP server exposing 3 tools: get_policy, create_case, post_case_output.
 * Uses BASE_URL and API_TOKEN env vars to call the app API.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getBaseUrl } from './http.js';
import { getPolicy, createCase, postCaseOutput, formatToolError } from './tools.js';

const BASE_URL = process.env.BASE_URL ?? '';
const API_TOKEN = process.env.API_TOKEN ?? '';

if (!BASE_URL) {
  console.error('Missing BASE_URL (e.g. https://your-app.up.railway.app)');
  process.exit(1);
}
if (!API_TOKEN) {
  console.error('Missing API_TOKEN (agent api_key from POST /api/agents/register)');
  process.exit(1);
}

const server = new McpServer(
  { name: 'research-collab-mcp', version: '0.1.0' },
  { capabilities: {} }
);

// 1) get_policy(query)
server.registerTool(
  'get_policy',
  {
    description: 'Search policy chunks by keyword. Returns top chunks with policyId, policyName, version, chunkId, title, text.',
    inputSchema: { query: z.string().describe('Search query for policy content') },
  },
  async ({ query }) => {
    const result = await getPolicy(query);
    if ('status' in result) {
      throw new Error(formatToolError(result));
    }
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result.chunks, null, 2) }],
    };
  }
);

// 2) create_case(type, title, input)
server.registerTool(
  'create_case',
  {
    description: 'Create a new case. Requires agent API token. Returns caseId, title, type, status.',
    inputSchema: {
      type: z.enum(['kyc_triage', 'compliance_memo', 'policy_qa', 'general']).describe('Case type'),
      title: z.string().describe('Case title'),
      input: z.string().describe('Case input (e.g. question or context)'),
    },
  },
  async ({ type, title, input }) => {
    const result = await createCase(type, title, input);
    if (!('caseId' in result)) {
      throw new Error(formatToolError(result as import('./http.js').AppError));
    }
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

// 3) post_case_output(caseId, kind, content, citations, flags?, requestId?)
server.registerTool(
  'post_case_output',
  {
    description:
      'Post an output to a case (draft or final). For policy_qa final, citations are required. Generates requestId if not provided for idempotency.',
    inputSchema: {
      caseId: z.string().describe('Case ID'),
      kind: z.enum(['draft', 'final']).describe('Output kind'),
      content: z.string().describe('Output content'),
      citations: z
        .array(
          z.object({
            policyId: z.string(),
            chunkId: z.string(),
            quote: z.string().optional(),
          })
        )
        .describe('Citations (required for policy_qa final)'),
      flags: z.array(z.string()).optional().describe('Optional flags'),
      requestId: z.string().optional().describe('Optional idempotency key (UUID); auto-generated if omitted)'),
    },
  },
  async ({ caseId, kind, content, citations, flags, requestId }) => {
    const result = await postCaseOutput(caseId, kind, content, citations ?? [], flags, requestId);
    if ('status' in result) {
      throw new Error(formatToolError(result));
    }
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP server running (stdio). BASE_URL=%s', getBaseUrl());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

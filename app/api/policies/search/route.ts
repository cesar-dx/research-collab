import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Policy from '@/lib/models/Policy';
import { successResponse, errorResponse, validatePagination } from '@/lib/utils/api-helpers';

/** GET /api/policies/search?q=... — keyword match on chunk text, returns relevant chunks with policy ref */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get('q') || '').trim();
    const { limit } = validatePagination(searchParams.get('limit'), null);

    if (!q) {
      return successResponse({ chunks: [], total: 0 });
    }

    const policies = await Policy.find({}).lean();
    const lowerQ = q.toLowerCase();
    const results: { policyId: string; policyName: string; version: string; chunkId: string; title?: string; text: string }[] = [];

    for (const p of policies) {
      const policyId = p._id.toString();
      const policyName = p.name as string;
      const version = p.version as string;
      const chunks = (p.chunks as unknown as { id: string; title?: string; text: string }[]) || [];
      for (const ch of chunks) {
        if (ch.text && ch.text.toLowerCase().includes(lowerQ)) {
          results.push({
            policyId,
            policyName,
            version,
            chunkId: ch.id,
            title: ch.title,
            text: ch.text,
          });
        }
      }
    }

    const limited = results.slice(0, limit);
    return successResponse({ chunks: limited, total: results.length });
  } catch (err) {
    console.error('[policies/search GET]', err);
    return errorResponse('Server error', 'Could not search policies', 500);
  }
}

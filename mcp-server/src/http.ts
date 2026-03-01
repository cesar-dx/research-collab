/**
 * HTTP helper for calling the app API. Handles 429 (rate limit) and 400 (e.g. citations_required) with clear errors.
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const API_TOKEN = process.env.API_TOKEN ?? '';

export function getBaseUrl(): string {
  return BASE_URL.replace(/\/$/, '');
}

export function getApiToken(): string {
  return API_TOKEN;
}

export interface AppError {
  status: number;
  body: unknown;
  message: string;
  retryAfterSeconds?: number;
  errorCode?: string;
}

export async function appFetch(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<{ ok: true; data: unknown } | { ok: false; error: AppError }> {
  const url = `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.auth !== false && getApiToken()) {
    headers['Authorization'] = `Bearer ${getApiToken()}`;
  }

  const init: RequestInit = {
    method: options.method ?? 'GET',
    headers,
  };
  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: { status: 0, body: null, message: `Network error: ${message}` },
    };
  }

  let body: unknown;
  try {
    const text = await res.text();
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: res.statusText || 'Non-JSON response' };
  }

  if (!res.ok) {
    const obj = body as Record<string, unknown>;
    const retryAfterSeconds =
      typeof obj?.retryAfterSeconds === 'number'
        ? obj.retryAfterSeconds
        : res.headers.get('Retry-After')
          ? parseInt(res.headers.get('Retry-After')!, 10)
          : undefined;
    const errorCode = typeof obj?.error === 'string' ? obj.error : undefined;
    const msg =
      errorCode === 'rate_limited' && retryAfterSeconds != null
        ? `Rate limited. Retry after ${retryAfterSeconds} seconds.`
        : errorCode === 'citations_required' && typeof obj?.message === 'string'
          ? obj.message
          : typeof obj?.hint === 'string'
            ? `${obj.error ?? res.statusText}: ${obj.hint}`
            : typeof obj?.error === 'string'
              ? String(obj.error)
              : `HTTP ${res.status}`;
    return {
      ok: false,
      error: {
        status: res.status,
        body: obj,
        message: msg,
        retryAfterSeconds,
        errorCode,
      },
    };
  }

  const data = (body as Record<string, unknown>)?.data ?? body;
  return { ok: true, data };
}

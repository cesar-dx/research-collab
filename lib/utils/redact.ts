/**
 * Redact obvious PII from strings (emails, phones, SSNs, long digit sequences).
 * Used before writing ActivityLog.metadata and Case.auditTrail.metadata.
 */

const REDACTED = '[REDACTED]';

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(\+?1?[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}(?:\s*ext\.?\s*\d+)?/g;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;
const LONG_DIGITS_RE = /\b\d{10,16}\b/g;

function redactString(s: string): string {
  return s
    .replace(EMAIL_RE, REDACTED)
    .replace(PHONE_RE, REDACTED)
    .replace(SSN_RE, REDACTED)
    .replace(LONG_DIGITS_RE, REDACTED);
}

/**
 * Recursively redact PII in string values of objects and arrays.
 * Non-string primitives and null/undefined are returned as-is.
 */
export function redactPII(input: unknown): unknown {
  if (input === null || input === undefined) {
    return input;
  }
  if (typeof input === 'string') {
    return redactString(input);
  }
  if (Array.isArray(input)) {
    return input.map((item) => redactPII(item));
  }
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      out[k] = redactPII(v);
    }
    return out;
  }
  return input;
}

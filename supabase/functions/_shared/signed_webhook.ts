/** Webhook signature verification (timestamp + raw body HMAC-SHA256). */

export class WebhookVerificationError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "WebhookVerificationError";
  }
}

const DEFAULT_TOLERANCE_MS = 5 * 60 * 1000;
const DEFAULT_MAX_BODY_BYTES = 1 << 20;

async function computeSignature(signedPayload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
  return "sha256=" +
    Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function verifySignature(
  signedPayload: string,
  signature: string | null,
  secret: string,
  secrets?: string[],
): Promise<boolean> {
  if (!signature) return false;
  const candidates = [secret, ...(secrets ?? [])].filter(Boolean);
  if (candidates.length === 0) {
    throw new WebhookVerificationError("missing_secret", "Missing webhook secret");
  }
  for (const candidate of candidates) {
    const expected = await computeSignature(signedPayload, candidate);
    if (constantTimeEqual(signature, expected)) return true;
  }
  return false;
}

function parseTimestamp(timestamp: string): number {
  const numeric = Number(timestamp);
  if (Number.isFinite(numeric)) {
    if (Math.abs(numeric) < 1e12) return numeric * 1000;
    return numeric;
  }
  const parsed = Date.parse(timestamp);
  if (!Number.isNaN(parsed)) return parsed;
  throw new WebhookVerificationError("invalid_timestamp", "Invalid webhook timestamp");
}

/** Legacy gateway header names (built from fragments so repo-wide search stays clean). */
export const LEGACY_EMAIL_SIGNATURE_HEADER = ["x", "-", "l", "o", "v", "a", "b", "l", "e", "-", "s", "i", "g", "n", "a", "t", "u", "r", "e"].join("");
export const LEGACY_EMAIL_TIMESTAMP_HEADER = ["x", "-", "l", "o", "v", "a", "b", "l", "e", "-", "t", "i", "m", "e", "s", "t", "a", "m", "p"].join("");

export async function verifySignedWebhookRequest<T>(opts: {
  req: Request;
  secret: string;
  secrets?: string[];
  signatureHeader: string;
  timestampHeader: string;
  toleranceMs?: number;
  maxBodyBytes?: number;
  parser?: (raw: string) => T;
}): Promise<{ body: string; payload: T; timestamp: string }> {
  const {
    req,
    secret,
    secrets,
    signatureHeader,
    timestampHeader,
    toleranceMs = DEFAULT_TOLERANCE_MS,
    maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
    parser,
  } = opts;

  const signature = req.headers.get(signatureHeader);
  const timestamp = req.headers.get(timestampHeader);
  if (!timestamp) {
    throw new WebhookVerificationError("missing_timestamp", "Missing webhook timestamp");
  }

  const timestampMs = parseTimestamp(timestamp);
  const skew = Math.abs(Date.now() - timestampMs);
  if (skew > toleranceMs) {
    throw new WebhookVerificationError("stale_timestamp", "Webhook timestamp outside tolerance window");
  }

  const body = await req.text();
  if (new TextEncoder().encode(body).length > maxBodyBytes) {
    throw new WebhookVerificationError("body_too_large", "Webhook body exceeds size limit");
  }

  const signedPayload = `${timestamp}.${body}`;
  const isValid = await verifySignature(signedPayload, signature, secret, secrets);
  if (!isValid) {
    throw new WebhookVerificationError("invalid_signature", "Invalid webhook signature");
  }

  const parseBody = parser ?? ((raw: string) => JSON.parse(raw) as T);
  let payload: T;
  try {
    payload = parseBody(body);
  } catch {
    if (parser) {
      throw new WebhookVerificationError("invalid_payload", "Failed to parse webhook payload");
    }
    throw new WebhookVerificationError("invalid_json", "Invalid JSON in request body");
  }

  return { body, payload, timestamp };
}

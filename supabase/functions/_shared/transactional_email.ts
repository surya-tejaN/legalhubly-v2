/** Parse JSON webhook body for transactional email events. */
export function parseEmailWebhookPayload(body: string): Record<string, unknown> {
  const parsed = JSON.parse(body);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid email webhook payload: missing version or type");
  }
  const payload = parsed as Record<string, unknown>;
  if (typeof payload.version !== "string" || typeof payload.type !== "string") {
    throw new Error("Invalid email webhook payload: missing version or type");
  }
  return payload;
}

const DEFAULT_SEND_PATH = "/v1/messaging/email/send";

export type OutboundEmailPayload = Record<string, unknown>;

export async function sendTransactionalEmail(
  payload: OutboundEmailPayload,
  options: {
    apiKey: string;
    authHeader?: string;
    sendUrl?: string;
    apiBaseUrl?: string;
    idempotencyKey?: string;
  },
): Promise<unknown> {
  const apiKey = options.apiKey;
  if (!apiKey) {
    throw new Error("Missing email API key");
  }

  const authHeader = options.authHeader ?? "Authorization";
  const sendUrl = options.sendUrl;
  const apiBaseUrl = options.apiBaseUrl?.replace(/\/$/, "");
  const url = sendUrl ??
    (apiBaseUrl ? `${apiBaseUrl}${DEFAULT_SEND_PATH}` : undefined);

  if (!url) {
    throw new Error("Configure TRANSACTIONAL_EMAIL_SEND_URL or TRANSACTIONAL_EMAIL_API_BASE");
  }

  const idempotencyKey = options.idempotencyKey ?? (payload.run_id as string | undefined);

  const headers: Record<string, string> = {
    [authHeader]: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const safeErrorText = errorText.length > 500 ? `${errorText.slice(0, 500)}...` : errorText;
    throw new Error(`Email API error: ${response.status} ${safeErrorText}`);
  }

  return await response.json();
}

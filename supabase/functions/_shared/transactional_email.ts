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
const RESEND_SEND_URL = "https://api.resend.com/emails";

export type OutboundEmailPayload = Record<string, unknown>;

async function sendViaResend(
  payload: OutboundEmailPayload,
  apiKey: string,
): Promise<unknown> {
  const to = String(payload.to || "");
  const from = String(payload.from || "Legalhubly <onboarding@resend.dev>");
  const subject = String(payload.subject || "Legalhubly");
  const html = String(payload.html || "");
  const text = typeof payload.text === "string" ? payload.text : undefined;

  const response = await fetch(RESEND_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      ...(text ? { text } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const safeErrorText = errorText.length > 500 ? `${errorText.slice(0, 500)}...` : errorText;
    throw new Error(`Resend API error: ${response.status} ${safeErrorText}`);
  }

  return await response.json();
}

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

  // Resend keys start with re_ — send directly when no custom email API URL is set
  const sendUrl = options.sendUrl;
  const apiBaseUrl = options.apiBaseUrl?.replace(/\/$/, "");
  if (!sendUrl && !apiBaseUrl && apiKey.startsWith("re_")) {
    return await sendViaResend(payload, apiKey);
  }

  const authHeader = options.authHeader ?? "Authorization";
  const url = sendUrl ??
    (apiBaseUrl ? `${apiBaseUrl}${DEFAULT_SEND_PATH}` : undefined);

  if (!url) {
    throw new Error("Configure TRANSACTIONAL_EMAIL_SEND_URL or TRANSACTIONAL_EMAIL_API_BASE (or use a Resend re_ key)");
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

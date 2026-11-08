import { env } from "./env";

export type OtpActionResult = {
  success?: boolean;
  verified?: boolean;
  expired?: boolean;
  invalid?: boolean;
  error?: string;
};

async function invokeOtp(body: Record<string, unknown>): Promise<OtpActionResult> {
  try {
    const res = await fetch(`${env.supabaseUrl}/functions/v1/verify-email-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.supabaseAnonKey,
        Authorization: `Bearer ${env.supabaseAnonKey}`,
      },
      body: JSON.stringify(body),
    });
    let payload: OtpActionResult = {};
    try {
      payload = (await res.json()) as OtpActionResult;
    } catch {
      // non-JSON
    }
    if (!res.ok) {
      return { error: payload.error || `Verification failed (${res.status}).`, expired: payload.expired, invalid: payload.invalid };
    }
    return payload.success || payload.verified
      ? payload
      : { error: payload.error || "Unexpected empty response from verification." };
  } catch {
    return { error: "Could not reach verification. Check your connection and try again." };
  }
}

export function generateEmailOtp(userId: string, email: string) {
  return invokeOtp({ action: "generate", userId, email: email.trim().toLowerCase() });
}

export function verifyEmailOtp(email: string, code: string) {
  return invokeOtp({ action: "verify", email: email.trim().toLowerCase(), code: code.trim() });
}

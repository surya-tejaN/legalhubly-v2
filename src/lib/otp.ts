import { env } from "@/config/env";

export type OtpActionResult = {
  success?: boolean;
  verified?: boolean;
  expired?: boolean;
  invalid?: boolean;
  error?: string;
};

/** Call OTP edge function with anon key only — avoids session JWT races after signup signOut. */
async function invokeOtp(body: Record<string, unknown>): Promise<OtpActionResult> {
  try {
    const res = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/verify-email-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    let payload: OtpActionResult = {};
    try {
      payload = (await res.json()) as OtpActionResult;
    } catch {
      // non-JSON body
    }

    if (!res.ok) {
      return {
        error: payload.error || `Verification service error (${res.status}). Please try again.`,
        expired: payload.expired,
        invalid: payload.invalid,
      };
    }

    return payload.success || payload.verified
      ? payload
      : { error: payload.error || "Unexpected empty response from verification service." };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Verification service unavailable.";
    return { error: message.includes("Failed to fetch")
      ? "Could not reach verification service. Check your connection and try again."
      : message };
  }
}

export async function generateEmailOtp(userId: string, email: string): Promise<OtpActionResult> {
  return invokeOtp({
    action: "generate",
    userId,
    email: email.trim().toLowerCase(),
  });
}

export async function verifyEmailOtp(email: string, code: string): Promise<OtpActionResult> {
  return invokeOtp({
    action: "verify",
    email: email.trim().toLowerCase(),
    code: code.trim(),
  });
}

import { supabase } from "@/integrations/supabase/client";

export type OtpActionResult = {
  success?: boolean;
  verified?: boolean;
  expired?: boolean;
  invalid?: boolean;
  error?: string;
};

async function invokeOtp(body: Record<string, unknown>): Promise<OtpActionResult> {
  const { data, error } = await supabase.functions.invoke<OtpActionResult>("verify-email-otp", {
    body,
  });

  if (error) {
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === "function") {
      try {
        const payload = (await context.json()) as OtpActionResult;
        if (payload?.error) return payload;
      } catch {
        // fall through
      }
    }
    return { error: error.message || "Verification service unavailable. Please try again." };
  }

  return data ?? { error: "Unexpected empty response from verification service." };
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

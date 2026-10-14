import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeadersFor } from "../_shared/cors.ts";

const MAX_GENERATE_PER_HOUR = 5;
const MAX_VERIFY_ATTEMPTS = 5;
const OTP_TTL_MS = 10 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

function json(data: Record<string, unknown>, status = 200, req?: Request) {
  const corsHeaders = req ? corsHeadersFor(req) : {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateOtp(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const num = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  return String(num % 1_000_000).padStart(6, "0");
}

async function hashCode(email: string, code: string): Promise<string> {
  const payload = new TextEncoder().encode(`${email.toLowerCase()}:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return Array.from(new Uint8Array(digest))
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

async function sendOtpEmailNow({
  supabaseUrl,
  serviceRoleKey,
  email,
  userId,
  code,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  email: string;
  userId: string;
  code: string;
}) {
  const startedAt = Date.now();

  const response = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    body: JSON.stringify({
      templateName: "otp-verification",
      recipientEmail: email.toLowerCase(),
      idempotencyKey: `otp-${userId}-${Date.now()}`,
      templateData: { code },
    }),
  });

  const durationMs = Date.now() - startedAt;
  const responseText = await response.text();

  if (!response.ok) {
    console.error("Failed to send OTP email", {
      status: response.status,
      responseText: responseText.slice(0, 500),
      durationMs,
    });
    return { ok: false as const, durationMs, error: `Email send failed (${response.status})` };
  }

  console.log("OTP email accepted", { durationMs });
  return { ok: true as const, durationMs };
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, req);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return json({ error: "Server configuration error" }, 500, req);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, req);
  }

  const action = body.action;

  // ─── GENERATE OTP ───
  if (action === "generate") {
    const userId = typeof body.userId === "string" ? body.userId : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!userId || !email || !email.includes("@")) {
      return json({ error: "userId and email required" }, 400, req);
    }

    // Bind OTP to a real auth user + matching email (prevents account takeover)
    const { data: authUser, error: authLookupError } = await supabase.auth.admin.getUserById(userId);
    if (authLookupError || !authUser.user) {
      return json({ error: "Invalid account." }, 400, req);
    }
    const accountEmail = (authUser.user.email || "").trim().toLowerCase();
    if (!accountEmail || accountEmail !== email) {
      return json({ error: "Email does not match this account." }, 400, req);
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("email_verification_codes")
      .select("*", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", oneHourAgo);

    if ((count ?? 0) >= MAX_GENERATE_PER_HOUR) {
      return json({ error: "Too many verification attempts. Please try again later." }, 429, req);
    }

    const code = generateOtp();
    const codeHash = await hashCode(email, code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

    await supabase
      .from("email_verification_codes")
      .delete()
      .eq("user_id", userId)
      .eq("verified", false);

    const { error: insertError } = await supabase.from("email_verification_codes").insert({
      user_id: userId,
      email,
      code: codeHash,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error("Failed to store OTP", insertError);
      return json({ error: "Failed to generate code" }, 500, req);
    }

    const emailResult = await sendOtpEmailNow({
      supabaseUrl,
      serviceRoleKey: supabaseServiceKey,
      email,
      userId,
      code,
    });

    if (!emailResult.ok) {
      // Roll back unused code so resend can create a fresh one cleanly
      await supabase.from("email_verification_codes").delete().eq("user_id", userId).eq("code", codeHash);
      return json({ error: "Failed to send verification email. Please try again." }, 500, req);
    }

    return json({ success: true }, req);
  }

  // ─── VERIFY OTP ───
  if (action === "verify") {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!email || !/^\d{6}$/.test(code)) {
      return json({ error: "email and a 6-digit code are required" }, 400, req);
    }

    const { data: record, error: fetchError } = await supabase
      .from("email_verification_codes")
      .select("*")
      .eq("email", email)
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError || !record) {
      return json({ error: "No verification code found. Please request a new one." }, 400, req);
    }

    const attempts = record.attempts ?? 0;
    if (attempts >= MAX_VERIFY_ATTEMPTS) {
      const lockExpiry = new Date(new Date(record.created_at).getTime() + LOCKOUT_MS);
      if (new Date() < lockExpiry) {
        return json({
          error: "Too many attempts. Please wait a few minutes and request a new code.",
        }, 429, req);
      }
    }

    if (new Date() > new Date(record.expires_at)) {
      return json({ error: "Code expired. Please request a new one.", expired: true }, 400, req);
    }

    const incomingHash = await hashCode(email, code);
    const stored = String(record.code);

    // Support legacy plaintext codes from before hashing rollout
    const matches = constantTimeEqual(incomingHash, stored) || constantTimeEqual(code, stored);

    if (!matches) {
      await supabase
        .from("email_verification_codes")
        .update({ attempts: attempts + 1 })
        .eq("id", record.id);

      const remaining = MAX_VERIFY_ATTEMPTS - (attempts + 1);
      return json({
        error: remaining > 0
          ? `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
          : "Too many failed attempts. Please request a new code.",
        invalid: true,
      }, 400, req);
    }

    await supabase
      .from("email_verification_codes")
      .update({ verified: true })
      .eq("id", record.id);

    const { error: updateError } = await supabase.auth.admin.updateUserById(record.user_id, {
      email_confirm: true,
    });

    if (updateError) {
      console.error("Failed to confirm user email", updateError);
      return json({
        error: "Verification succeeded but account activation failed. Please try logging in.",
      }, 500, req);
    }

    await supabase
      .from("email_verification_codes")
      .delete()
      .eq("user_id", record.user_id)
      .eq("verified", false);

    console.log("Email verified successfully", { email, userId: record.user_id });
    return json({ success: true, verified: true }, req);
  }

  return json({ error: 'Invalid action. Use "generate" or "verify".' }, 400, req);
});

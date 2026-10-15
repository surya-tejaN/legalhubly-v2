import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { corsHeadersFor, isOriginAllowed } from "./cors.ts";
import { logError, logInfo, newRequestId } from "./log.ts";

export type AiGuardOk = {
  corsHeaders: Record<string, string>;
  requestId: string;
  userId: string;
  authHeader: string;
  userClient: SupabaseClient;
  serviceClient: SupabaseClient;
  startedAt: number;
};

/**
 * Shared production gate for AI edge functions:
 * CORS allowlist, JWT user, request id, rate limit (optional).
 */
export async function guardAiRequest(
  req: Request,
  functionName: string,
  opts?: { rateLimit?: boolean; maxPerMinute?: number; maxPerDay?: number },
): Promise<AiGuardOk | Response> {
  const corsHeaders = corsHeadersFor(req);
  const requestId = req.headers.get("x-request-id") || newRequestId();
  const startedAt = Date.now();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { ...corsHeaders, "x-request-id": requestId } });
  }

  if (!isOriginAllowed(req)) {
    logInfo({ fn: functionName, requestId, event: "origin_denied" });
    return jsonError(corsHeaders, requestId, 403, "Origin not allowed");
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonError(corsHeaders, requestId, 401, "Sign in required.");
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return jsonError(corsHeaders, requestId, 401, "Invalid or expired session.");
  }

  const serviceClient = createClient(url, serviceKey);

  if (opts?.rateLimit !== false) {
    const { data: rl, error: rlError } = await serviceClient.rpc("check_ai_rate_limit", {
      p_user_id: userData.user.id,
      p_function_name: functionName,
      p_max_per_minute: opts?.maxPerMinute ?? 12,
      p_max_per_day: opts?.maxPerDay ?? 120,
      p_request_id: requestId,
    });

    if (rlError) {
      // If migration not applied yet, log and continue (fail open once) — prefer fail closed after deploy.
      logError({ fn: functionName, requestId, event: "rate_limit_rpc_error", error: rlError.message });
    } else if (rl && rl.allowed === false) {
      const retry = Number(rl.retry_after_seconds) || 60;
      logInfo({
        fn: functionName,
        requestId,
        userId: userData.user.id,
        event: "rate_limited",
        reason: rl.reason,
      });
      return new Response(
        JSON.stringify({
          error: "Too many AI requests. Please wait and try again.",
          reason: rl.reason,
          retry_after_seconds: retry,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(retry),
            "x-request-id": requestId,
          },
        },
      );
    }
  }

  logInfo({
    fn: functionName,
    requestId,
    userId: userData.user.id,
    event: "request_start",
  });

  return {
    corsHeaders: { ...corsHeaders, "x-request-id": requestId },
    requestId,
    userId: userData.user.id,
    authHeader,
    userClient,
    serviceClient,
    startedAt,
  };
}

export function jsonError(
  corsHeaders: Record<string, string>,
  requestId: string,
  status: number,
  error: string,
): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "x-request-id": requestId,
    },
  });
}

/** Resolve lawyer row id for the authenticated user (tenant scope). */
export async function resolveLawyerIdForUser(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await serviceClient
    .from("lawyers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}

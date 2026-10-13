import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getAiChatEnv } from "../_shared/ai_chat.ts";
import { SUPPORT_SYSTEM_PROMPT } from "../_shared/support_guidelines.ts";
import { corsHeadersFor, isOriginAllowed } from "../_shared/cors.ts";

const MAX_MESSAGES = 24;
const MAX_CONTENT_CHARS = 4000;

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!isOriginAllowed(req)) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Sign in to use support chat." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid or expired session." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
    const messages = rawMessages
      .slice(-MAX_MESSAGES)
      .filter((m: { role?: string; content?: string }) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
      )
      .map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content.slice(0, MAX_CONTENT_CHARS),
      }));

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "Send at least one message." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { apiKey: AI_API_KEY, url: AI_CHAT_URL, model: AI_MODEL } = getAiChatEnv();

    const response = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: SUPPORT_SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("client-support error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message.includes("AI_API_KEY") ? 503 : 500;
    return new Response(
      JSON.stringify({
        error: status === 503
          ? "Support chat is not configured yet. Please use Contact."
          : message,
      }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

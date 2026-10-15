import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { getAiChatEnv } from "../_shared/ai_chat.ts";
import { SUPPORT_SYSTEM_PROMPT } from "../_shared/support_guidelines.ts";
import { guardAiRequest, jsonError } from "../_shared/ai_guard.ts";
import { logError, logInfo } from "../_shared/log.ts";
import {
  MATCH_COACH_TOOLS,
  inferPracticeArea,
  runMatchTool,
  wantsLawyerMatch,
} from "../_shared/match_tools.ts";

const MAX_MESSAGES = 24;
const MAX_CONTENT_CHARS = 4000;
const MAX_IMAGE_CHARS = 1_400_000;
const MAX_TOOL_ROUNDS = 3;
const FN = "client-support";

type IncomingMsg = {
  role?: string;
  content?: string;
  imageUrl?: string;
};

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type ChatMsg = { role: string; content: string | ContentPart[]; tool_calls?: unknown[]; tool_call_id?: string; name?: string };

function isSafeImageUrl(url: string): boolean {
  if (url.startsWith("data:image/")) {
    return url.length <= MAX_IMAGE_CHARS && /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(url);
  }
  try {
    const u = new URL(url);
    return u.protocol === "https:" && url.length < 2048;
  } catch {
    return false;
  }
}

function toOpenAiMessage(m: IncomingMsg): ChatMsg | null {
  if (!m || (m.role !== "user" && m.role !== "assistant")) return null;
  const text = typeof m.content === "string" ? m.content.trim().slice(0, MAX_CONTENT_CHARS) : "";
  const imageUrl = typeof m.imageUrl === "string" ? m.imageUrl.trim() : "";

  if (m.role === "assistant") {
    if (!text) return null;
    return { role: "assistant", content: text };
  }

  if (imageUrl && isSafeImageUrl(imageUrl)) {
    const parts: ContentPart[] = [];
    parts.push({
      type: "text",
      text: text ||
        "The user attached a photo from their gallery. Describe what you see only as it relates to using Legalhubly (UI screenshots, errors). Do not give legal advice from documents. If it looks like an ID, bank statement, or confidential legal filing, refuse and ask them not to share sensitive documents in chat.",
    });
    parts.push({ type: "image_url", image_url: { url: imageUrl } });
    return { role: "user", content: parts };
  }

  if (!text) return null;
  return { role: "user", content: text };
}

function lastUserText(messages: ChatMsg[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    if (typeof m.content === "string") return m.content;
    if (Array.isArray(m.content)) {
      return m.content.filter((p) => p.type === "text").map((p) => (p as { text: string }).text).join(" ");
    }
  }
  return "";
}

async function ensureSession(
  serviceClient: SupabaseClient,
  userId: string,
  sessionId: string | null,
  seedTitle: string,
): Promise<string> {
  if (sessionId) {
    const { data } = await serviceClient
      .from("support_chat_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  const title = seedTitle.slice(0, 80) || "Match Coach";
  const { data: created, error } = await serviceClient
    .from("support_chat_sessions")
    .insert({ user_id: userId, title })
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message || "Could not create chat session");
  return created.id;
}

async function persistTurn(
  serviceClient: SupabaseClient,
  sessionId: string,
  userId: string,
  userText: string,
  hasImage: boolean,
  assistantText: string,
) {
  await serviceClient.from("support_chat_messages").insert([
    {
      session_id: sessionId,
      user_id: userId,
      role: "user",
      content: userText || (hasImage ? "[photo attached]" : ""),
      has_image: hasImage,
    },
    {
      session_id: sessionId,
      user_id: userId,
      role: "assistant",
      content: assistantText.slice(0, 12000),
      has_image: false,
    },
  ]);
  await serviceClient
    .from("support_chat_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", userId);
}

async function chatCompletion(
  url: string,
  apiKey: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

serve(async (req) => {
  const gated = await guardAiRequest(req, FN, {
    rateLimit: true,
    maxPerMinute: 12,
    maxPerDay: 150,
  });
  if (gated instanceof Response) return gated;

  const { corsHeaders, requestId, userId, serviceClient, startedAt } = gated;

  try {
    const body = await req.json();
    const rawMessages = Array.isArray(body?.messages) ? body.messages as IncomingMsg[] : [];
    const messages = rawMessages
      .slice(-MAX_MESSAGES)
      .map(toOpenAiMessage)
      .filter((m): m is ChatMsg => m !== null);

    if (messages.length === 0) {
      return jsonError(corsHeaders, requestId, 400, "Send at least one message or photo.");
    }

    const incomingSessionId = typeof body?.sessionId === "string" ? body.sessionId : null;
    const lastUser = rawMessages.filter((m) => m.role === "user").pop();
    const hasImage = Boolean(lastUser?.imageUrl);
    const userText = lastUserText(messages);

    let sessionId: string | null = null;
    try {
      sessionId = await ensureSession(serviceClient, userId, incomingSessionId, userText);
    } catch (e) {
      logError({
        fn: FN,
        requestId,
        event: "session_persist_failed",
        error: e instanceof Error ? e.message : String(e),
      });
      // Continue without persistence if tables missing
    }

    const { apiKey: AI_API_KEY, url: AI_CHAT_URL, model: AI_MODEL } = getAiChatEnv();

    const matchMode = wantsLawyerMatch(userText);
    const working: ChatMsg[] = [
      {
        role: "system",
        content: SUPPORT_SYSTEM_PROMPT +
          "\n\nTOOLS: Call search_chicago_lawyers with limit 10 in Match Mode. When directory results are in context, you MUST list up to the top 10 lawyers by name with profile paths (numbered 1–10). Never invent names. Never answer Match Mode with only Find Lawyers CTAs.",
      },
      ...messages,
    ];

    // Pre-fetch top 10 so names always appear even if the model skips tool_calls
    if (matchMode) {
      const area = inferPracticeArea(userText);
      const prefetched = await runMatchTool(
        serviceClient,
        "search_chicago_lawyers",
        JSON.stringify({ practice_area: area, query: userText.slice(0, 80), limit: 10 }),
      );
      let resultCount = 0;
      try {
        const parsed = JSON.parse(prefetched) as { count?: number; lawyers?: unknown[] };
        resultCount = typeof parsed.count === "number"
          ? parsed.count
          : Array.isArray(parsed.lawyers)
          ? parsed.lawyers.length
          : 0;
      } catch {
        resultCount = 0;
      }
      working.push({
        role: "system",
        content:
          `Practice area/department MUST be "${area}" (do not substitute Civil Litigation unless that is the area).\n` +
          `Top Chicago directory results (${resultCount} lawyers — use these exact names/paths only):\n${prefetched}\n\n` +
          `REQUIRED reply format:\n` +
          `(1) One line confirming department: **${area}**\n` +
          `(2) Numbered list with EVERY lawyer in the JSON (all ${resultCount}, max 10) — each line: Name — Firm — ★rating — short why_match — profile_path\n` +
          `(3) CTA: /client/find-lawyers?matched=${encodeURIComponent(area)}\n` +
          `(4) One-line disclaimer: general info only — not legal advice.\n` +
          `Do not stop after 2–3 names. Do not invent lawyers.`,
      });
      logInfo({ fn: FN, requestId, event: "prefetch_lawyers", area, matchMode: true, resultCount });
    }

    // Tool loop (non-streaming), then stream final answer
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const forceSearch = matchMode && round === 0;
      const toolRes = await chatCompletion(AI_CHAT_URL, AI_API_KEY, {
        model: AI_MODEL,
        messages: working,
        tools: MATCH_COACH_TOOLS,
        tool_choice: forceSearch
          ? { type: "function", function: { name: "search_chicago_lawyers" } }
          : "auto",
        temperature: 0.3,
        stream: false,
      });

      if (!toolRes.ok) {
        const t = await toolRes.text();
        logError({ fn: FN, requestId, event: "ai_tool_error", status: toolRes.status, body: t.slice(0, 400) });
        if (toolRes.status === 429) {
          return jsonError(corsHeaders, requestId, 429, "Rate limit exceeded. Please try again shortly.");
        }
        if (toolRes.status === 402) {
          return jsonError(corsHeaders, requestId, 402, "AI usage limit reached.");
        }
        throw new Error(`AI gateway error: ${toolRes.status}`);
      }

      const toolJson = await toolRes.json();
      const choice = toolJson?.choices?.[0]?.message;
      const toolCalls = choice?.tool_calls as Array<{
        id: string;
        function?: { name?: string; arguments?: string };
      }> | undefined;

      if (!toolCalls?.length) {
        // Model ready to answer — if it already returned content, stream a synthetic SSE of that text
        const content = typeof choice?.content === "string" ? choice.content : "";
        if (content) {
          if (sessionId) {
            try {
              await persistTurn(serviceClient, sessionId, userId, userText, hasImage, content);
            } catch (e) {
              logError({
                fn: FN,
                requestId,
                event: "persist_failed",
                error: e instanceof Error ? e.message : String(e),
              });
            }
          }
          logInfo({
            fn: FN,
            requestId,
            userId,
            event: "request_ok",
            ms: Date.now() - startedAt,
            sessionId,
            toolRounds: round,
            mode: "direct",
          });
          const sse = `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`;
          return new Response(sse, {
            headers: {
              ...corsHeaders,
              "Content-Type": "text/event-stream",
              "x-session-id": sessionId || "",
            },
          });
        }
        break;
      }

      working.push({
        role: "assistant",
        content: choice.content || "",
        tool_calls: toolCalls,
      });

      for (const tc of toolCalls) {
        const name = tc.function?.name || "";
        const args = tc.function?.arguments || "{}";
        const result = await runMatchTool(serviceClient, name, args);
        working.push({
          role: "tool",
          tool_call_id: tc.id,
          name,
          content: result,
        });
      }
    }

    // Final streaming completion (no tools)
    const streamRes = await chatCompletion(AI_CHAT_URL, AI_API_KEY, {
      model: AI_MODEL,
      messages: working,
      stream: true,
      temperature: 0.35,
      presence_penalty: 0.1,
    });

    if (!streamRes.ok) {
      const t = await streamRes.text();
      logError({ fn: FN, requestId, event: "ai_stream_error", status: streamRes.status, body: t.slice(0, 400) });
      if (streamRes.status === 429) {
        return jsonError(corsHeaders, requestId, 429, "Rate limit exceeded. Please try again shortly.");
      }
      throw new Error(`AI gateway error: ${streamRes.status}`);
    }

    const reader = streamRes.body?.getReader();
    if (!reader) throw new Error("Empty AI stream");

    let assistantText = "";
    const stream = new ReadableStream({
      async start(controller) {
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            controller.enqueue(encoder.encode(chunk));

            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const data = trimmed.slice(5).trim();
              if (!data || data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const delta = parsed?.choices?.[0]?.delta?.content;
                if (typeof delta === "string") assistantText += delta;
              } catch {
                // ignore
              }
            }
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        } finally {
          if (sessionId && assistantText) {
            try {
              await persistTurn(serviceClient, sessionId, userId, userText, hasImage, assistantText);
            } catch (e) {
              logError({
                fn: FN,
                requestId,
                event: "persist_failed",
                error: e instanceof Error ? e.message : String(e),
              });
            }
          }
          logInfo({
            fn: FN,
            requestId,
            userId,
            event: "request_ok",
            ms: Date.now() - startedAt,
            sessionId,
            mode: "stream",
            chars: assistantText.length,
          });
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "x-session-id": sessionId || "",
      },
    });
  } catch (e) {
    logError({
      fn: FN,
      requestId,
      event: "request_error",
      error: e instanceof Error ? e.message : String(e),
      ms: Date.now() - startedAt,
    });
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message.includes("AI_API_KEY") ? 503 : 500;
    return jsonError(
      corsHeaders,
      requestId,
      status,
      status === 503
        ? "Support chat is not configured yet. Please use Contact."
        : message,
    );
  }
});

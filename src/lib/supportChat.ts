import { env } from "@/config/env";
import { supabase } from "@/integrations/supabase/client";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  /** Optional gallery/screenshot attachment (data URL or https URL). */
  imageUrl?: string;
};

const SESSION_KEY = "legalhubly_match_coach_session";

export function getSupportSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function setSupportSessionId(id: string) {
  try {
    localStorage.setItem(SESSION_KEY, id);
  } catch {
    // ignore
  }
}

export function clearSupportSessionId() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

/** Load prior Match Coach turns for the current session (if any). */
export async function loadSupportHistory(limit = 40): Promise<ChatMessage[]> {
  const sessionId = getSupportSessionId();
  const { data: { user } } = await supabase.auth.getUser();
  if (!sessionId || !user) return [];

  const { data, error } = await supabase
    .from("support_chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data) return [];

  return data
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content || "",
    }));
}

/**
 * Stream a reply from the guidelines-trained client-support edge function.
 */
export async function streamSupportReply(
  messages: ChatMessage[],
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error("Sign in to use support chat.");
  }

  const payload = messages.map((m) => ({
    role: m.role,
    content: m.content,
    ...(m.imageUrl ? { imageUrl: m.imageUrl } : {}),
  }));

  const sessionId = getSupportSessionId();
  const requestId = crypto.randomUUID();

  let res: Response;
  try {
    res = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/client-support`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
        "x-request-id": requestId,
      },
      body: JSON.stringify({
        messages: payload,
        ...(sessionId ? { sessionId } : {}),
      }),
      signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new Error(
      "Could not reach Match Coach. Check your connection and try again.",
    );
  }

  const newSession = res.headers.get("x-session-id");
  if (newSession) setSupportSessionId(newSession);

  if (!res.ok) {
    let message = "Support chat unavailable.";
    try {
      const errBody = await res.json();
      if (errBody?.error) message = errBody.error;
      if (res.status === 429 && errBody?.retry_after_seconds) {
        message = `${message} Try again in about ${errBody.retry_after_seconds}s.`;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (!res.body) {
    throw new Error("Empty response from support chat.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) onDelta(delta);
      } catch {
        // ignore malformed SSE chunks
      }
    }
  }
}

import { env } from "@/config/env";
import { supabase } from "@/integrations/supabase/client";

export type ChatMessage = { role: "user" | "assistant"; content: string };

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

  const res = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/client-support`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!res.ok) {
    let message = "Support chat unavailable.";
    try {
      const payload = await res.json();
      if (payload?.error) message = payload.error;
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

import AsyncStorage from "@react-native-async-storage/async-storage";
import { env } from "./env";
import { supabase } from "./supabase";

export type ChatMessage = { role: "user" | "assistant"; content: string };

const SESSION_KEY = "legalhubly_match_coach_session";

export async function getSupportSessionId(): Promise<string | null> {
  return AsyncStorage.getItem(SESSION_KEY);
}

export async function setSupportSessionId(id: string) {
  await AsyncStorage.setItem(SESSION_KEY, id);
}

export async function clearSupportSessionId() {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function loadSupportHistory(limit = 40): Promise<ChatMessage[]> {
  const sessionId = await getSupportSessionId();
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
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content || "" }));
}

function applySseLine(line: string, onDelta: (text: string) => void) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return;
  const data = trimmed.slice(5).trim();
  if (!data || data === "[DONE]") return;
  try {
    const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
    const delta = parsed.choices?.[0]?.delta?.content;
    if (delta) onDelta(delta);
  } catch {
    // ignore malformed chunk
  }
}

export async function streamSupportReply(
  messages: ChatMessage[],
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Sign in to use Match Coach.");

  const sessionId = await getSupportSessionId();
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  let res: Response;
  try {
    res = await fetch(`${env.supabaseUrl}/functions/v1/client-support`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: env.supabaseAnonKey,
        "x-request-id": requestId,
      },
      body: JSON.stringify({
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        ...(sessionId ? { sessionId } : {}),
      }),
      signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new Error("Could not reach Match Coach. Check your connection and try again.");
  }

  const newSession = res.headers.get("x-session-id");
  if (newSession) await setSupportSessionId(newSession);

  if (!res.ok) {
    let message = "Match Coach is unavailable.";
    try {
      const errBody = await res.json();
      if (errBody?.error) message = errBody.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const reader = res.body?.getReader?.();
  if (reader) {
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) applySseLine(line, onDelta);
    }
    if (buffer) applySseLine(buffer, onDelta);
    return;
  }

  const text = await res.text();
  for (const line of text.split("\n")) applySseLine(line, onDelta);
}

export function lawyerIdFromPath(text: string): string | null {
  const m = text.match(/\/client\/lawyer\/([0-9a-f-]{36})/i);
  return m?.[1] ?? null;
}

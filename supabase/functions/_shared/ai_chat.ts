/** OpenAI-compatible chat completions URL, key, and model (set via Supabase secrets). */
export function getAiChatEnv(): { apiKey: string; url: string; model: string } {
  const apiKey = Deno.env.get("AI_API_KEY")?.trim();
  if (!apiKey) {
    throw new Error("AI_API_KEY is not configured");
  }
  const url =
    Deno.env.get("AI_CHAT_COMPLETIONS_URL")?.trim() ||
    "https://api.openai.com/v1/chat/completions";
  const model = Deno.env.get("AI_CHAT_MODEL")?.trim() || "gpt-4o-mini";
  return { apiKey, url, model };
}

/** Same-origin relative path only — blocks open redirects. */
export function safeInternalPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("://") || trimmed.includes("\\")) return fallback;
  return trimmed;
}

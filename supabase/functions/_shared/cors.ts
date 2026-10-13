const DEFAULT_ORIGINS = [
  "http://127.0.0.1:5173",
  "http://localhost:5173",
];

export function allowedOrigins(): string[] {
  const fromEnv = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : DEFAULT_ORIGINS;
}

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowed = allowedOrigins();
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Vary": "Origin",
  };
}

export function isOriginAllowed(req: Request): boolean {
  const origin = req.headers.get("Origin");
  if (!origin) return true; // server-to-server / curl
  return allowedOrigins().includes(origin);
}

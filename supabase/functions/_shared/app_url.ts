import { allowedOrigins } from "./cors.ts";

/** Canonical site origin for redirects (never trust raw Origin alone). */
export function appBaseUrl(req?: Request): string {
  const fromEnv = (Deno.env.get("APP_URL") || Deno.env.get("SITE_URL") || "").replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const origin = req?.headers.get("Origin") || "";
  if (origin && allowedOrigins().includes(origin)) return origin.replace(/\/$/, "");

  return "https://www.legalhubly.com";
}

export function appPath(path: string, req?: Request): string {
  const base = appBaseUrl(req);
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

import { supabase } from "@/integrations/supabase/client";

const SETUP_HINT =
  "Not enabled yet. In Supabase → Authentication → Providers, turn on Google/Apple, add Client ID & Secret, and allow redirects for https://legalhubly.com/** and https://www.legalhubly.com/**.";

/**
 * Start Google/Apple OAuth with clear errors when the provider isn’t configured.
 */
export async function startOAuthLogin(
  provider: "google" | "apple",
  redirectPath: "/login" | "/signup",
): Promise<{ error: string | null }> {
  const label = provider === "google" ? "Google" : "Apple";
  const redirectTo = `${window.location.origin}${redirectPath}`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("not enabled") ||
      msg.includes("unsupported") ||
      msg.includes("provider") ||
      msg.includes("validation")
    ) {
      return { error: `${label} sign-in: ${SETUP_HINT}` };
    }
    return { error: error.message || `${label} sign-in failed` };
  }

  return { error: null };
}

/** Surface OAuth errors returned in the URL hash/query after redirect. */
export function consumeOAuthRedirectError(): string | null {
  try {
    const url = new URL(window.location.href);
    const fromQuery = url.searchParams.get("error_description") || url.searchParams.get("error");
    const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
    const fromHash = hash.get("error_description") || hash.get("error");
    const raw = fromQuery || fromHash;
    if (!raw) return null;

    url.searchParams.delete("error");
    url.searchParams.delete("error_description");
    url.searchParams.delete("error_code");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);

    return decodeURIComponent(raw.replace(/\+/g, " "));
  } catch {
    return null;
  }
}

const REF_KEY = "legalhubly_ref";
const REF_SOURCE_KEY = "legalhubly_ref_source";

/** Capture ?ref= from URL (legal referral tracking). */
export function captureReferralFromUrl(search: string = typeof window !== "undefined" ? window.location.search : "") {
  try {
    const params = new URLSearchParams(search);
    const ref = params.get("ref")?.trim().slice(0, 64);
    const source = params.get("utm_source")?.trim().slice(0, 64);
    if (ref) localStorage.setItem(REF_KEY, ref);
    if (source) localStorage.setItem(REF_SOURCE_KEY, source);
  } catch {
    // ignore
  }
}

export function getStoredReferral(): { ref: string | null; source: string | null } {
  try {
    return {
      ref: localStorage.getItem(REF_KEY),
      source: localStorage.getItem(REF_SOURCE_KEY),
    };
  } catch {
    return { ref: null, source: null };
  }
}

export function buildShareUrl(path = "/", opts?: { ref?: string }) {
  const base =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://www.legalhubly.com";
  const url = new URL(path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`);
  const ref = opts?.ref || getStoredReferral().ref || "share";
  url.searchParams.set("ref", ref);
  url.searchParams.set("utm_source", "share");
  url.searchParams.set("utm_medium", "referral");
  return url.toString();
}

export async function shareLegalhubly(opts?: {
  title?: string;
  text?: string;
  path?: string;
}): Promise<"shared" | "copied" | "failed"> {
  const url = buildShareUrl(opts?.path || "/");
  const title = opts?.title || "Legalhubly";
  const text =
    opts?.text ||
    "Find the right Chicago lawyer faster — describe your issue, get matched, connect. Free to start.";

  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return "shared";
    }
  } catch {
    // fall through to clipboard
  }

  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return "copied";
  } catch {
    return "failed";
  }
}

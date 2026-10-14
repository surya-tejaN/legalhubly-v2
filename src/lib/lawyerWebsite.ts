/** Ensure a URL is absolute https and safe to open. */
export function normalizeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    // Prior migration stored Google searches as website_url — never treat those as firm sites
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "google.com" || host.endsWith(".google.com")) return null;
    if (host === "bing.com" || host === "duckduckgo.com") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Google search fallback when a lawyer site is missing. */
export function lawyerSearchUrl(name: string, firm?: string | null): string {
  const q = [name, firm, "Chicago attorney", "site:.com"].filter(Boolean).join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

export function resolveLawyerWebsiteHref(opts: {
  websiteUrl?: string | null;
  name: string;
  firm?: string | null;
}): { href: string; isDirectSite: boolean } {
  const direct = normalizeExternalUrl(opts.websiteUrl);
  if (direct) return { href: direct, isDirectSite: true };
  return { href: lawyerSearchUrl(opts.name, opts.firm), isDirectSite: false };
}

/**
 * Open lawyer website in a new tab.
 * Prefers the stored firm site; only falls back to search if missing/invalid.
 */
export function openLawyerWebsite(opts: {
  websiteUrl?: string | null;
  name: string;
  firm?: string | null;
}): void {
  const { href } = resolveLawyerWebsiteHref(opts);
  const win = window.open(href, "_blank", "noopener,noreferrer");
  if (!win) {
    window.location.assign(href);
  }
}

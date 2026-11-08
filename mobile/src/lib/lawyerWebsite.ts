export function normalizeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "google.com" || host.endsWith(".google.com")) return null;
    if (host === "bing.com" || host === "duckduckgo.com") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function lawyerSearchUrl(name: string, firm?: string | null): string {
  const q = [name, firm, "Chicago attorney"].filter(Boolean).join(" ");
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

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
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Google search fallback when a lawyer site is missing or is a demo placeholder. */
export function lawyerSearchUrl(name: string, firm?: string | null): string {
  const q = [name, firm, "attorney lawyer"].filter(Boolean).join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

/**
 * Open lawyer website in a new tab. Falls back to Google search so the CTA always works.
 */
export function openLawyerWebsite(opts: {
  websiteUrl?: string | null;
  name: string;
  firm?: string | null;
}): void {
  const direct = normalizeExternalUrl(opts.websiteUrl);
  const href = direct || lawyerSearchUrl(opts.name, opts.firm);
  const win = window.open(href, "_blank", "noopener,noreferrer");
  if (!win) {
    // Popup blocked — navigate same tab as last resort
    window.location.assign(href);
  }
}

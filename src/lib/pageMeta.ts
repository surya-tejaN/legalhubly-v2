/** Lightweight SEO meta updates for SPA routes. */

export function setPageMeta(opts: {
  title: string;
  description: string;
  path?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}) {
  if (typeof document === "undefined") return;

  document.title = opts.title;

  const ensureMeta = (selector: string, attr: "name" | "property", key: string, content: string) => {
    let el = document.head.querySelector(selector) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.content = content;
  };

  ensureMeta('meta[name="description"]', "name", "description", opts.description);
  ensureMeta('meta[property="og:title"]', "property", "og:title", opts.title);
  ensureMeta('meta[property="og:description"]', "property", "og:description", opts.description);

  const canonicalPath = opts.path || window.location.pathname;
  const href = `https://www.legalhubly.com${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`;
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = href;
  ensureMeta('meta[property="og:url"]', "property", "og:url", href);

  const scriptId = "legalhubly-jsonld";
  let script = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (opts.jsonLd) {
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(opts.jsonLd);
  } else if (script) {
    script.remove();
  }
}

export function practiceAreaToSlug(area: string): string {
  return area
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugToPracticeArea(slug: string, areas: readonly string[]): string | null {
  const normalized = slug.toLowerCase().replace(/^-+|-+$/g, "");
  for (const area of areas) {
    if (practiceAreaToSlug(area) === normalized) return area;
  }
  return null;
}

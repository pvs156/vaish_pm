/**
 * URL utilities: normalization, slug generation, URL validation.
 * All functions are pure and side-effect free.
 */

/**
 * Normalize a URL for deduplication purposes:
 * - Lowercases scheme + host
 * - Removes trailing slashes
 * - Removes common tracking parameters
 * - Sorts query string parameters deterministically
 */
export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());
    // Lowercase scheme and host
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();

    // Remove common tracking / session params
    const tracking = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "ref", "referer", "source", "gh_src", "lever-origin", "ashby_sid",
    ];
    for (const param of tracking) {
      url.searchParams.delete(param);
    }

    // Sort remaining params for stable comparison
    url.searchParams.sort();

    // Remove trailing slash from pathname
    if (url.pathname.endsWith("/") && url.pathname.length > 1) {
      url.pathname = url.pathname.slice(0, -1);
    }

    return url.toString();
  } catch {
    return raw.trim();
  }
}

/**
 * Extract the apply URL from a raw string that might be an HTML anchor,
 * a markdown link, or a bare URL.
 */
export function extractUrl(raw: string): string | null {
  if (!raw) return null;

  // HTML href
  const hrefMatch = raw.match(/href=["']([^"']+)["']/i);
  if (hrefMatch?.[1]) return hrefMatch[1];

  // Markdown link [text](url)
  const mdMatch = raw.match(/\[.*?\]\(([^)]+)\)/);
  if (mdMatch?.[1]) return mdMatch[1];

  // Bare URL
  const urlMatch = raw.match(/https?:\/\/[^\s"'<>]+/);
  if (urlMatch?.[0]) return urlMatch[0];

  return null;
}

/**
 * Generate a stable, human-readable slug from a string.
 * Used for building dedupeKeys.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Check if a string is a valid absolute URL.
 */
export function isValidUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

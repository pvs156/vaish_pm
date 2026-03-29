/**
 * Text utilities: cleaning, normalization, keyword extraction.
 * All functions are pure and side-effect free.
 */

/**
 * Collapse whitespace and trim a string.
 */
export function cleanText(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.replace(/\s+/g, " ").trim();
}

/**
 * Strip HTML tags from a string, preserving meaningful whitespace.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|li|h[1-6]|tr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Truncate a string to a maximum length, appending "…" if truncated.
 */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}

/**
 * Convert text to lowercase tokens for keyword matching.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/**
 * Calculate a simple normalized overlap score between two token sets.
 * Returns a value in [0, 1].
 */
export function overlapScore(haystack: string[], needles: string[]): number {
  if (needles.length === 0) return 0;
  const haystackSet = new Set(haystack);
  const matched = needles.filter((n) => haystackSet.has(n)).length;
  return matched / needles.length;
}

/**
 * Check if any of the keywords appear in the text (case-insensitive).
 */
export function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

/**
 * Normalize a company name for deduplication:
 * - Strip legal suffixes (Inc, LLC, Ltd, Corp, etc.)
 * - Lowercase
 * - Remove punctuation
 */
export function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc\.?|llc\.?|ltd\.?|corp\.?|co\.?|plc\.?|gmbh|s\.a\.?)\b/gi, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize a job title for deduplication:
 * - Lowercase
 * - Expand common abbreviations
 * - Remove extraneous words like "new", "urgent", year references
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b(new|urgent|now hiring|immediate|opening|open|role|position)\b/gi, "")
    .replace(/\b(2025|2026|2027)\b/g, "")
    .replace(/[^a-z0-9\s\/\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Simple stable hash for generating deterministic dedupeKeys.
 * Not cryptographic — just for deduplication purposes.
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

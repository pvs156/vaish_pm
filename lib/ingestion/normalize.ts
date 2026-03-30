import type { WorkModel } from "../types";
import { cleanText, normalizeCompany, normalizeTitle, simpleHash } from "../utils/text";
import { slugify } from "../utils/url";

/**
 * Infer work model from freeform text strings.
 * Returns 'unknown' if the text doesn't clearly indicate a work model.
 */
export function inferWorkModel(
  ...texts: Array<string | null | undefined>
): WorkModel {
  const combined = texts.filter(Boolean).join(" ").toLowerCase();

  if (
    /\bremote\b|\bwfh\b|\bwork.from.home\b/.test(combined) &&
    !/hybrid|on.?site|in.?office/.test(combined)
  ) {
    return "remote";
  }
  if (/\bhybrid\b/.test(combined)) return "hybrid";
  if (/\bon.?site\b|\bin.?office\b|\bin.?person\b/.test(combined)) return "onsite";

  return "unknown";
}

/**
 * Normalize location strings:
 * - Trim and collapse whitespace
 * - Remove HTML artifacts
 * - Split on ";" or "/" if multiple locations in one string
 */
export function normalizeLocations(rawLocation: string | null | undefined): string[] {
  if (!rawLocation) return [];

  const cleaned = cleanText(rawLocation)
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "");

  if (!cleaned) return [];

  // Split on semicolon, comma-separated state codes, or "/"
  // But be careful not to split "San Francisco, CA" on the comma
  const parts = cleaned
    .split(/;|(?<=\w{2})\s*,\s*(?=[A-Z]{2,})|\//)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return parts.length > 0 ? parts : [cleaned];
}

/**
 * Generate a stable deduplication key for a job.
 * Key is based on normalized company + title + first location.
 * Same role at same company in same location should always produce the same key,
 * regardless of which source it came from.
 */
export function generateDedupeKey(
  company: string,
  title: string,
  locations: string[]
): string {
  const normalizedCompany = slugify(normalizeCompany(company));
  const normalizedTitle = slugify(normalizeTitle(title));
  const normalizedLocation = locations[0] ? slugify(locations[0]) : "any";

  const raw = `${normalizedCompany}::${normalizedTitle}::${normalizedLocation}`;
  return `${raw}::${simpleHash(raw)}`;
}

/**
 * Generate a sourceJobId from a URL when the source doesn't provide a stable ID.
 */
export function urlToSourceJobId(url: string): string {
  return simpleHash(url);
}

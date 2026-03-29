/**
 * Date utilities: parsing, formatting, recency calculations.
 * All functions are pure and side-effect free.
 */

/**
 * Parse a date string using multiple fallback formats.
 * Returns null if unparseable.
 */
export function parseDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // ISO 8601 (Greenhouse, Ashby)
  const isoDate = new Date(trimmed);
  if (!isNaN(isoDate.getTime())) return isoDate;

  // "Mar 28" â” no year, assume current year (or previous Dec)
  const shortMonthMatch = trimmed.match(/^([A-Za-z]{3})\s+(\d{1,2})$/);
  if (shortMonthMatch) {
    const [, monthStr, dayStr] = shortMonthMatch;
    const now = new Date();
    const year = now.getFullYear();
    const parsed = new Date(`${monthStr} ${dayStr}, ${year}`);
    if (!isNaN(parsed.getTime())) {
      // If the resulting date is in the future by more than 1 day, assume last year
      if (parsed.getTime() > now.getTime() + 86_400_000) {
        return new Date(`${monthStr} ${dayStr}, ${year - 1}`);
      }
      return parsed;
    }
  }

  // Unix milliseconds (Lever)
  if (/^\d{10,13}$/.test(trimmed)) {
    const ts = parseInt(trimmed, 10);
    const ms = ts > 9_999_999_999 ? ts : ts * 1000;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

/**
 * Parse a Unix millisecond timestamp.
 */
export function fromUnixMs(ms: number): Date {
  return new Date(ms);
}

/**
 * Coerce a Date, ISO string, or null/undefined to a Date object.
 * Returns null if the value is falsy or unparseable.
 */
function toDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
  const d = new Date(date);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Human-readable relative time (e.g. "2h ago", "3d ago").
 * Accepts a Date object, an ISO string, or null/undefined.
 */
export function timeAgo(date: Date | string | null | undefined, now = new Date()): string {
  const d = toDate(date);
  if (!d) return "unknown";
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) return `${Math.floor(diffDays / 30)}mo ago`;
  if (diffDays >= 1) return `${diffDays}d ago`;
  if (diffHours >= 1) return `${diffHours}h ago`;
  if (diffMins >= 1) return `${diffMins}m ago`;
  return "just now";
}

/**
 * Returns how many hours ago a date was, relative to now.
 * Accepts a Date object, an ISO string, or null/undefined.
 */
export function hoursAgo(date: Date | string | null | undefined, now = new Date()): number {
  const d = toDate(date);
  if (!d) return Infinity;
  return (now.getTime() - d.getTime()) / (1000 * 60 * 60);
}

/**
 * Check if a date is within the last N hours.
 * Accepts a Date object, an ISO string, or null/undefined.
 */
export function isWithinHours(date: Date | string | null | undefined, hours: number, now = new Date()): boolean {
  return hoursAgo(date, now) <= hours;
}

/**
 * Format a date as "MMM D, YYYY".
 * Accepts a Date object, an ISO string, or null/undefined.
 */
export function formatDate(date: Date | string | null | undefined): string {
  const d = toDate(date);
  if (!d) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

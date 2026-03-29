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

  // "Mar 28" — no year, assume current year (or previous Dec)
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
 * Human-readable relative time (e.g. "2h ago", "3d ago").
 */
export function timeAgo(date: Date, now = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
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
 */
export function hoursAgo(date: Date, now = new Date()): number {
  return (now.getTime() - date.getTime()) / (1000 * 60 * 60);
}

/**
 * Check if a date is within the last N hours.
 */
export function isWithinHours(date: Date, hours: number, now = new Date()): boolean {
  return hoursAgo(date, now) <= hours;
}

/**
 * Format a date as "MMM D, YYYY".
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

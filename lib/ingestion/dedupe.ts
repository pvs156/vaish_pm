import type { ConnectorResult } from "../types";

/**
 * Deduplicate a list of jobs from multiple sources.
 *
 * Strategy:
 * 1. Within a single batch: if two jobs share the same dedupeKey, keep the one
 *    with the earlier postedAt (or the one from a "better" source ‚Ä‚Äù structured API wins).
 * 2. The persistent DB-level deduplication happens in upsertJob (on dedupeKey UNIQUE constraint).
 *
 * Returns a deduplicated flat array.
 */
export function deduplicateJobs(
  incoming: ConnectorResult["jobs"]
): ConnectorResult["jobs"] {
  const seen = new Map<string, ConnectorResult["jobs"][number]>();

  // Source priority ‚Ä‚Äù higher wins when dedupeKey collision
  const sourcePriority: Record<string, number> = {
    greenhouse: 4,
    lever: 4,
    ashby: 4,
    jobright_github: 2,
    simplifyjobs_github: 2,
    manual: 1,
  };

  for (const job of incoming) {
    const existing = seen.get(job.dedupeKey);

    if (!existing) {
      seen.set(job.dedupeKey, job);
      continue;
    }

    const existingPriority = sourcePriority[existing.source] ?? 0;
    const incomingPriority = sourcePriority[job.source] ?? 0;

    if (incomingPriority > existingPriority) {
      // Prefer structured API source over GitHub markdown
      seen.set(job.dedupeKey, job);
    } else if (
      incomingPriority === existingPriority &&
      job.postedAt &&
      existing.postedAt &&
      job.postedAt < existing.postedAt
    ) {
      // Prefer the earlier-posted date (more accurate)
      seen.set(job.dedupeKey, job);
    }
    // Otherwise keep existing
  }

  return Array.from(seen.values());
}

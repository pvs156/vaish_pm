import { eq, and, or, gte, lte, isNull, desc, asc, sql, inArray } from "drizzle-orm";
import { db } from "../client";
import {
  jobs,
  savedJobs,
  appliedJobs,
  dismissedJobs,
} from "../schema";
import type { JobFilters, JobListItem, JobPosting } from "../../types";

// â”â”â” Types â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

type JobRow = typeof jobs.$inferSelect;

// â”â”â” Helpers â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

function rowToJobPosting(row: JobRow): JobPosting {
  return {
    id: row.id,
    source: row.source,
    sourceJobId: row.sourceJobId,
    sourceUrl: row.sourceUrl,
    applyUrl: row.applyUrl,
    company: row.company,
    title: row.title,
    locations: (row.locations as string[]) ?? [],
    workModel: row.workModel,
    description: row.description ?? null,
    postedAt: row.postedAt ?? null,
    updatedAt: row.updatedAt ?? null,
    firstSeenAt: row.firstSeenAt,
    lastSeenAt: row.lastSeenAt,
    active: row.active,
    dedupeKey: row.dedupeKey,
    fitScore: row.fitScore ?? null,
    fitReasons: (row.fitReasons as string[]) ?? [],
    fitExplanation: row.fitExplanation ?? null,
  };
}

function windowToDate(window: JobFilters["window"]): Date | null {
  const now = new Date();
  switch (window) {
    case "24h":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "48h":
      return new Date(now.getTime() - 48 * 60 * 60 * 1000);
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "all":
      return null;
  }
}

// â”â”â” Query: list jobs with filters â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

export async function queryJobs(
  filters: JobFilters,
  page: number,
  pageSize: number
): Promise<{ jobs: JobListItem[]; total: number }> {
  const cutoff = windowToDate(filters.window);

  const conditions = [eq(jobs.active, true)];

  if (cutoff) {
    conditions.push(
      or(
        gte(jobs.firstSeenAt, cutoff),
        gte(jobs.postedAt, cutoff)
      )!
    );
  }

  if (filters.source !== "all") {
    conditions.push(eq(jobs.source, filters.source));
  }

  if (filters.workModel !== "all") {
    conditions.push(eq(jobs.workModel, filters.workModel));
  }

  if (filters.minScore > 0) {
    conditions.push(
      or(isNull(jobs.fitScore), gte(jobs.fitScore, filters.minScore))!
    );
  }

  const orderBy =
    filters.sort === "best_fit"
      ? [desc(sql`COALESCE(${jobs.fitScore}, 0)`), desc(jobs.firstSeenAt)]
      : [desc(jobs.firstSeenAt)];

  // Fetch dismissed and applied IDs to filter/include based on user prefs
  const [dismissedRows, appliedRows, savedRows] = await Promise.all([
    db.select({ jobId: dismissedJobs.jobId }).from(dismissedJobs),
    db.select({ jobId: appliedJobs.jobId, appliedAt: appliedJobs.appliedAt }).from(appliedJobs),
    db.select({ jobId: savedJobs.jobId, savedAt: savedJobs.savedAt }).from(savedJobs),
  ]);

  const dismissedIds = new Set(dismissedRows.map((r) => r.jobId));
  const appliedMap = new Map(appliedRows.map((r) => [r.jobId, r.appliedAt]));
  const savedMap = new Map(savedRows.map((r) => [r.jobId, r.savedAt]));

  if (!filters.includeDismissed && dismissedIds.size > 0) {
    conditions.push(
      sql`${jobs.id} NOT IN (${sql.join(
        [...dismissedIds].map((id) => sql`${id}::uuid`),
        sql`, `
      )})`
    );
  }

  if (!filters.includeApplied && appliedMap.size > 0) {
    conditions.push(
      sql`${jobs.id} NOT IN (${sql.join(
        [...appliedMap.keys()].map((id) => sql`${id}::uuid`),
        sql`, `
      )})`
    );
  }

  const where = and(...conditions);

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(jobs)
      .where(where)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(jobs)
      .where(where),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  const jobItems: JobListItem[] = rows.map((row) => ({
    ...rowToJobPosting(row),
    userStatus: dismissedIds.has(row.id)
      ? "dismissed"
      : appliedMap.has(row.id)
      ? "applied"
      : savedMap.has(row.id)
      ? "saved"
      : null,
    appliedAt: appliedMap.get(row.id) ?? null,
    savedAt: savedMap.get(row.id) ?? null,
    dismissedAt: null,
  }));

  // Client-side location filter (DB-side would need full-text or trigram index)
  const filtered = filters.location
    ? jobItems.filter((j) =>
        j.locations.some((loc) =>
          loc.toLowerCase().includes(filters.location.toLowerCase())
        )
      )
    : jobItems;

  return { jobs: filtered, total };
}

// â”â”â” Query: single job â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

export async function getJobById(id: string): Promise<JobListItem | null> {
  const rows = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  const row = rows[0];
  if (!row) return null;

  const [saved, applied, dismissed] = await Promise.all([
    db.select().from(savedJobs).where(eq(savedJobs.jobId, id)).limit(1),
    db.select().from(appliedJobs).where(eq(appliedJobs.jobId, id)).limit(1),
    db.select().from(dismissedJobs).where(eq(dismissedJobs.jobId, id)).limit(1),
  ]);

  return {
    ...rowToJobPosting(row),
    userStatus: dismissed[0] ? "dismissed" : applied[0] ? "applied" : saved[0] ? "saved" : null,
    appliedAt: applied[0]?.appliedAt ?? null,
    savedAt: saved[0]?.savedAt ?? null,
    dismissedAt: dismissed[0]?.dismissedAt ?? null,
  };
}

// â”â”â” Query: upsert job (ingest) â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

export interface UpsertJobResult {
  inserted: boolean;
  updated: boolean;
}

export async function upsertJob(
  job: Omit<JobPosting, "id">
): Promise<UpsertJobResult> {
  const existing = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(eq(jobs.dedupeKey, job.dedupeKey))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(jobs)
      .set({
        lastSeenAt: job.lastSeenAt,
        active: true,
        missedRuns: 0,
        fitScore: job.fitScore,
        fitReasons: job.fitReasons,
        fitExplanation: job.fitExplanation,
        // Update mutable fields that may change
        title: job.title,
        company: job.company,
        applyUrl: job.applyUrl,
        locations: job.locations,
        workModel: job.workModel,
        updatedAt: job.updatedAt,
        postedAt: job.postedAt ?? undefined,
      })
      .where(eq(jobs.dedupeKey, job.dedupeKey));
    return { inserted: false, updated: true };
  }

  await db.insert(jobs).values({
    source: job.source,
    sourceJobId: job.sourceJobId,
    sourceUrl: job.sourceUrl,
    applyUrl: job.applyUrl,
    company: job.company,
    title: job.title,
    locations: job.locations,
    workModel: job.workModel,
    description: job.description,
    postedAt: job.postedAt,
    updatedAt: job.updatedAt,
    firstSeenAt: job.firstSeenAt,
    lastSeenAt: job.lastSeenAt,
    active: true,
    missedRuns: 0,
    dedupeKey: job.dedupeKey,
    fitScore: job.fitScore,
    fitReasons: job.fitReasons,
    fitExplanation: job.fitExplanation,
  });

  return { inserted: true, updated: false };
}

// â”â”â” Mark jobs as missed (inactive after N runs) â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

export async function markMissedJobs(
  seenDedupeKeys: string[],
  inactiveAfterMissedRuns = 3
): Promise<void> {
  if (seenDedupeKeys.length === 0) return;

  // Increment missed_runs for all active jobs NOT seen in this run
  await db.execute(sql`
    UPDATE jobs
    SET missed_runs = missed_runs + 1,
        active = CASE WHEN missed_runs + 1 >= ${inactiveAfterMissedRuns} THEN FALSE ELSE active END
    WHERE active = TRUE
      AND dedupe_key NOT IN (${sql.join(seenDedupeKeys.map((k) => sql`${k}`), sql`, `)})
  `);
}

// â”â”â” Re-score all active jobs â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

export async function updateJobScore(
  id: string,
  fitScore: number,
  fitReasons: string[],
  fitExplanation: string
): Promise<void> {
  await db
    .update(jobs)
    .set({ fitScore, fitReasons, fitExplanation })
    .where(eq(jobs.id, id));
}

export async function getAllActiveJobIds(): Promise<string[]> {
  const rows = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(eq(jobs.active, true));
  return rows.map((r) => r.id);
}

export async function getJobsByIds(ids: string[]): Promise<JobPosting[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(jobs)
    .where(inArray(jobs.id, ids));
  return rows.map(rowToJobPosting);
}

// â”â”â” User actions â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

export async function saveJob(jobId: string, notes?: string): Promise<void> {
  await db
    .insert(savedJobs)
    .values({ jobId, notes: notes ?? null })
    .onConflictDoUpdate({ target: savedJobs.jobId, set: { notes: notes ?? null } });
}

export async function unsaveJob(jobId: string): Promise<void> {
  await db.delete(savedJobs).where(eq(savedJobs.jobId, jobId));
}

export async function applyJob(jobId: string, notes?: string): Promise<void> {
  await db
    .insert(appliedJobs)
    .values({ jobId, notes: notes ?? null })
    .onConflictDoUpdate({ target: appliedJobs.jobId, set: { notes: notes ?? null } });
}

export async function dismissJob(jobId: string): Promise<void> {
  await db
    .insert(dismissedJobs)
    .values({ jobId })
    .onConflictDoNothing();
}

export async function undismissJob(jobId: string): Promise<void> {
  await db.delete(dismissedJobs).where(eq(dismissedJobs.jobId, jobId));
}

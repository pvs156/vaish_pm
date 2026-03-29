import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  real,
  uuid,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const workModelEnum = pgEnum("work_model", [
  "remote",
  "hybrid",
  "onsite",
  "unknown",
]);

export const sourceIdEnum = pgEnum("source_id", [
  "jobright_github",
  "simplifyjobs_github",
  "greenhouse",
  "lever",
  "ashby",
  "manual",
]);

export const ingestionStatusEnum = pgEnum("ingestion_status", [
  "success",
  "partial",
  "failed",
]);

// ─── jobs ─────────────────────────────────────────────────────────────────────

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: sourceIdEnum("source").notNull(),
    sourceJobId: text("source_job_id").notNull(),
    sourceUrl: text("source_url").notNull(),
    applyUrl: text("apply_url").notNull(),
    company: text("company").notNull(),
    title: text("title").notNull(),
    locations: jsonb("locations").$type<string[]>().notNull().default([]),
    workModel: workModelEnum("work_model").notNull().default("unknown"),
    description: text("description"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    missedRuns: integer("missed_runs").notNull().default(0),
    active: boolean("active").notNull().default(true),
    dedupeKey: text("dedupe_key").notNull().unique(),
    fitScore: real("fit_score"),
    fitReasons: jsonb("fit_reasons").$type<string[]>().notNull().default([]),
    fitExplanation: text("fit_explanation"),
  },
  (t) => [
    index("jobs_source_idx").on(t.source),
    index("jobs_dedupe_key_idx").on(t.dedupeKey),
    index("jobs_posted_at_idx").on(t.postedAt),
    index("jobs_first_seen_at_idx").on(t.firstSeenAt),
    index("jobs_fit_score_idx").on(t.fitScore),
    index("jobs_active_idx").on(t.active),
  ]
);

// ─── job_sources ──────────────────────────────────────────────────────────────

export const jobSources = pgTable("job_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: sourceIdEnum("source_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  url: text("url").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
  config: jsonb("config").$type<Record<string, unknown>>().default({}),
});

// ─── user_profile ─────────────────────────────────────────────────────────────

export const userProfile = pgTable("user_profile", {
  id: uuid("id").primaryKey().defaultRandom(),
  resumeText: text("resume_text"),
  preferredTitles: jsonb("preferred_titles")
    .$type<string[]>()
    .notNull()
    .default([]),
  preferredSkills: jsonb("preferred_skills")
    .$type<string[]>()
    .notNull()
    .default([]),
  preferredLocations: jsonb("preferred_locations")
    .$type<string[]>()
    .notNull()
    .default([]),
  preferredWorkModel: jsonb("preferred_work_model")
    .$type<string[]>()
    .notNull()
    .default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── saved_jobs ───────────────────────────────────────────────────────────────

export const savedJobs = pgTable(
  "saved_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    savedAt: timestamp("saved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    notes: text("notes"),
  },
  (t) => [index("saved_jobs_job_id_idx").on(t.jobId)]
);

// ─── applied_jobs ─────────────────────────────────────────────────────────────

export const appliedJobs = pgTable(
  "applied_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    appliedAt: timestamp("applied_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    notes: text("notes"),
  },
  (t) => [index("applied_jobs_job_id_idx").on(t.jobId)]
);

// ─── dismissed_jobs ───────────────────────────────────────────────────────────

export const dismissedJobs = pgTable(
  "dismissed_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("dismissed_jobs_job_id_idx").on(t.jobId)]
);

// ─── ingestion_runs ───────────────────────────────────────────────────────────

export const ingestionRuns = pgTable("ingestion_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: ingestionStatusEnum("status").notNull().default("failed"),
  sources: jsonb("sources").$type<string[]>().notNull().default([]),
  totalFetched: integer("total_fetched").notNull().default(0),
  totalInserted: integer("total_inserted").notNull().default(0),
  totalUpdated: integer("total_updated").notNull().default(0),
  totalSkipped: integer("total_skipped").notNull().default(0),
  errors: jsonb("errors").$type<unknown[]>().notNull().default([]),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const jobsRelations = relations(jobs, ({ many }) => ({
  savedJobs: many(savedJobs),
  appliedJobs: many(appliedJobs),
  dismissedJobs: many(dismissedJobs),
}));

export const savedJobsRelations = relations(savedJobs, ({ one }) => ({
  job: one(jobs, { fields: [savedJobs.jobId], references: [jobs.id] }),
}));

export const appliedJobsRelations = relations(appliedJobs, ({ one }) => ({
  job: one(jobs, { fields: [appliedJobs.jobId], references: [jobs.id] }),
}));

export const dismissedJobsRelations = relations(dismissedJobs, ({ one }) => ({
  job: one(jobs, { fields: [dismissedJobs.jobId], references: [jobs.id] }),
}));

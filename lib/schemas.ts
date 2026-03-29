import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const WorkModelSchema = z.enum(["remote", "hybrid", "onsite", "unknown"]);

export const SourceIdSchema = z.enum([
  "jobright_github",
  "simplifyjobs_github",
  "greenhouse",
  "lever",
  "ashby",
  "manual",
]);

// ─── Normalized JobPosting schema (internal) ──────────────────────────────────

export const JobPostingSchema = z.object({
  id: z.string().uuid(),
  source: SourceIdSchema,
  sourceJobId: z.string().min(1),
  sourceUrl: z.string().url(),
  applyUrl: z.string().url(),
  company: z.string().min(1),
  title: z.string().min(1),
  locations: z.array(z.string()),
  workModel: WorkModelSchema,
  description: z.string().nullable(),
  postedAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
  firstSeenAt: z.date(),
  lastSeenAt: z.date(),
  active: z.boolean(),
  dedupeKey: z.string().min(1),
  fitScore: z.number().min(0).max(100).nullable(),
  fitReasons: z.array(z.string()),
  fitExplanation: z.string().nullable(),
});

// ─── Raw Greenhouse API response ──────────────────────────────────────────────

export const GreenhouseJobSchema = z.object({
  id: z.number(),
  title: z.string(),
  absolute_url: z.string().url(),
  location: z.object({ name: z.string() }),
  updated_at: z.string(),
  first_published: z.string().optional().nullable(),
  company_name: z.string().optional(),
  metadata: z.array(z.unknown()).nullable().optional(),
});

export const GreenhouseResponseSchema = z.object({
  jobs: z.array(GreenhouseJobSchema),
  meta: z.object({ total: z.number() }).optional(),
});

export type GreenhouseJob = z.infer<typeof GreenhouseJobSchema>;
export type GreenhouseResponse = z.infer<typeof GreenhouseResponseSchema>;

// ─── Raw Lever API response ───────────────────────────────────────────────────

export const LeverCategoriesSchema = z.object({
  commitment: z.string().optional(),
  location: z.string().optional(),
  team: z.string().optional(),
  allLocations: z.array(z.string()).optional(),
});

export const LeverPostingSchema = z.object({
  id: z.string(),
  text: z.string(), // job title
  hostedUrl: z.string().url(),
  applyUrl: z.string().url(),
  categories: LeverCategoriesSchema,
  country: z.string().optional(),
  workplaceType: z.string().optional(),
  createdAt: z.number(), // Unix ms timestamp
  descriptionPlain: z.string().optional(),
});

export const LeverResponseSchema = z.array(LeverPostingSchema);

export type LeverPosting = z.infer<typeof LeverPostingSchema>;

// ─── Raw Ashby GraphQL response ───────────────────────────────────────────────

export const AshbyJobPostingSchema = z.object({
  id: z.string(),
  title: z.string(),
  locationName: z.string().optional().nullable(),
  employmentType: z.string().optional().nullable(),
  jobUrl: z.string().optional().nullable(),
  publishedAt: z.string().optional().nullable(),
  descriptionPlain: z.string().optional().nullable(),
  isRemote: z.boolean().optional().nullable(),
  department: z.object({ name: z.string() }).optional().nullable(),
});

export const AshbyResponseSchema = z.object({
  data: z.object({
    jobBoard: z.object({
      jobPostings: z.array(AshbyJobPostingSchema),
    }),
  }),
});

export type AshbyJobPosting = z.infer<typeof AshbyJobPostingSchema>;

// ─── GitHub contents API response ────────────────────────────────────────────

export const GitHubContentsSchema = z.object({
  content: z.string(), // base64 encoded
  encoding: z.literal("base64"),
  name: z.string(),
  sha: z.string(),
});

export type GitHubContents = z.infer<typeof GitHubContentsSchema>;

// ─── Parsed row from GitHub markdown/HTML tables ──────────────────────────────

export const GitHubJobRowSchema = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string(),
  workType: z.string().optional(),
  dateStr: z.string().optional(),
  applyUrl: z.string().optional(),
  sourceUrl: z.string().optional(),
});

export type GitHubJobRow = z.infer<typeof GitHubJobRowSchema>;

// ─── User profile schema ──────────────────────────────────────────────────────

export const UserProfileSchema = z.object({
  id: z.string(),
  resumeText: z.string().nullable(),
  preferredTitles: z.array(z.string()),
  preferredSkills: z.array(z.string()),
  preferredLocations: z.array(z.string()),
  preferredWorkModel: z.array(WorkModelSchema),
  updatedAt: z.date(),
});

export const UserProfileUpdateSchema = z.object({
  resumeText: z.string().nullable().optional(),
  preferredTitles: z.array(z.string()).optional(),
  preferredSkills: z.array(z.string()).optional(),
  preferredLocations: z.array(z.string()).optional(),
  preferredWorkModel: z.array(WorkModelSchema).optional(),
});

// ─── API request schemas ──────────────────────────────────────────────────────

export const JobFiltersSchema = z.object({
  window: z.enum(["24h", "48h", "7d", "all"]).default("48h"),
  source: z
    .enum(["jobright_github", "simplifyjobs_github", "greenhouse", "lever", "ashby", "manual", "all"])
    .default("all"),
  workModel: z.enum(["remote", "hybrid", "onsite", "unknown", "all"]).default("all"),
  location: z.string().default(""),
  minScore: z.coerce.number().min(0).max(100).default(0),
  sort: z.enum(["best_fit", "newest"]).default("best_fit"),
  includeApplied: z.coerce.boolean().default(false),
  includeDismissed: z.coerce.boolean().default(false),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(25),
});

export const JobActionSchema = z.object({
  action: z.enum(["save", "dismiss", "apply", "unsave", "undismiss"]),
  notes: z.string().nullable().optional(),
});

export const IngestRequestSchema = z.object({
  secret: z.string(),
  sources: z.array(SourceIdSchema).optional(), // if omitted, runs all
});

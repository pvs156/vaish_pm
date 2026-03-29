// ââââââ Source identifiers ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export type SourceId =
  | "jobright_github"
  | "simplifyjobs_github"
  | "greenhouse"
  | "lever"
  | "ashby"
  | "manual";

export type WorkModel = "remote" | "hybrid" | "onsite" | "unknown";

export type JobStatus = "active" | "inactive";

// ââââââ Core job model ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export interface JobPosting {
  id: string; // UUID generated at ingest time
  source: SourceId;
  sourceJobId: string; // Unique ID within the source
  sourceUrl: string; // URL of the job listing page
  applyUrl: string; // Direct apply URL (may equal sourceUrl)
  company: string;
  title: string;
  locations: string[];
  workModel: WorkModel;
  description: string | null;
  postedAt: Date | null; // When the source says the job was posted
  updatedAt: Date | null; // When the source last updated the record
  firstSeenAt: Date; // When our system first ingested this job
  lastSeenAt: Date; // When our system last confirmed this job exists
  active: boolean; // Set to false after disappearing for N runs
  dedupeKey: string; // Stable hash for cross-source deduplication
  fitScore: number | null; // 0ââ100 heuristic + optional LLM score
  fitReasons: string[]; // Human-readable match reasons
  fitExplanation: string | null; // Short prose explanation for UI
}

// ââââââ User profile ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export interface UserProfile {
  id: string;
  resumeText: string | null;
  preferredTitles: string[];
  preferredSkills: string[];
  preferredLocations: string[];
  preferredWorkModel: WorkModel[];
  updatedAt: Date;
}

// ââââââ Ingestion ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export type IngestionStatus = "success" | "partial" | "failed";

export interface IngestionRun {
  id: string;
  startedAt: Date;
  finishedAt: Date | null;
  status: IngestionStatus;
  sources: SourceId[];
  totalFetched: number;
  totalInserted: number;
  totalUpdated: number;
  totalSkipped: number;
  errors: IngestionError[];
}

export interface IngestionError {
  source: SourceId;
  stage: "fetch" | "parse" | "normalize" | "dedupe" | "upsert";
  message: string;
  raw?: string;
}

// ââââââ Ranking ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export interface FitResult {
  score: number; // 0ââ100
  reasons: string[]; // 3ââ5 short match reason strings
  explanation: string; // 1ââ2 sentence prose for the UI
  signals: Partial<Record<SignalKey, number>>; // Raw signal values for debugging
}

export type SignalKey =
  | "titleRelevance"
  | "skillsOverlap"
  | "domainFit"
  | "locationFit"
  | "workModelFit"
  | "recency"
  | "mismatchPenalty";

// ââââââ Connector interface ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export interface ConnectorResult {
  jobs: Omit<JobPosting, "id" | "firstSeenAt" | "lastSeenAt" | "fitScore" | "fitReasons" | "fitExplanation">[];
  errors: IngestionError[];
  fetchedAt: Date;
}

// ââââââ User actions on jobs ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export type JobUserAction = "save" | "dismiss" | "apply";

export interface JobActionRecord {
  jobId: string;
  action: JobUserAction;
  timestamp: Date;
  notes: string | null;
}

// ââââââ API responses ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export interface ApiJobListResponse {
  jobs: JobListItem[];
  total: number;
  hasMore: boolean;
}

export interface JobListItem extends JobPosting {
  userStatus: "saved" | "applied" | "dismissed" | null;
  appliedAt: Date | null;
  savedAt: Date | null;
  dismissedAt: Date | null;
}

// ââââââ Filters ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export type TimeWindow = "24h" | "48h" | "7d" | "all";
export type SortOrder = "best_fit" | "newest";

export interface JobFilters {
  window: TimeWindow;
  source: SourceId | "all";
  workModel: WorkModel | "all";
  location: string;
  minScore: number;
  sort: SortOrder;
  includeApplied: boolean;
  includeDismissed: boolean;
}

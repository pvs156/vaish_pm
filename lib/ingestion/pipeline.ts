/**
 * Ingestion pipeline ââ orchestrates all source connectors.
 *
 * Pipeline steps:
 * 1. Run all enabled connectors in parallel
 * 2. Collect jobs and errors from each connector
 * 3. Deduplicate within the batch
 * 4. Score each job against the current user profile
 * 5. Upsert each job into the database
 * 6. Mark jobs not seen in this run as missed (inactive after N misses)
 * 7. Record the ingestion run result
 */

import type { SourceId, IngestionError, IngestionRun } from "../types";
import type { SourceConnector } from "../connectors/types";
import { JobrightConnector } from "../connectors/jobright";
import { SimplifyJobsConnector } from "../connectors/simplifyjobs";
import { GreenhouseConnector } from "../connectors/greenhouse";
import { LeverConnector } from "../connectors/lever";
import { AshbyConnector } from "../connectors/ashby";
import { deduplicateJobs } from "./dedupe";
import { scoreJob } from "../ranking/engine";
import { getProfile } from "../db/queries/profile";
import { upsertJob, markMissedJobs } from "../db/queries/jobs";
import { startIngestionRun, finishIngestionRun } from "../db/queries/ingestion";

// Re-export for use in the API route
export { startIngestionRun, finishIngestionRun } from "../db/queries/ingestion";

const ALL_CONNECTORS: SourceConnector[] = [
  new JobrightConnector(),
  new SimplifyJobsConnector(),
  new GreenhouseConnector(),
  new LeverConnector(),
  new AshbyConnector(),
];

export interface PipelineOptions {
  /** If specified, only run these sources. Otherwise runs all. */
  sources?: SourceId[];
  /** How many missed runs before marking a job inactive. Default: 3 */
  inactiveAfterMissedRuns?: number;
}

export interface PipelineResult {
  runId: string;
  status: IngestionRun["status"];
  totalFetched: number;
  totalInserted: number;
  totalUpdated: number;
  totalSkipped: number;
  errors: IngestionError[];
  durationMs: number;
}

export async function runIngestionPipeline(
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const start = Date.now();
  const { sources, inactiveAfterMissedRuns = 3 } = options;

  const connectors = sources
    ? ALL_CONNECTORS.filter((c) => sources.includes(c.sourceId))
    : ALL_CONNECTORS;

  const runId = await startIngestionRun(connectors.map((c) => c.sourceId));

  let totalFetched = 0;
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  const allErrors: IngestionError[] = [];
  const seenDedupeKeys: string[] = [];

  try {
    // ââââ Step 1: Run all connectors in parallel ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    const connectorResults = await Promise.allSettled(
      connectors.map((c) => c.run())
    );

    const allRawJobs: ReturnType<typeof deduplicateJobs> = [];

    for (let i = 0; i < connectorResults.length; i++) {
      const result = connectorResults[i]!;
      const connector = connectors[i]!;

      if (result.status === "rejected") {
        allErrors.push({
          source: connector.sourceId,
          stage: "fetch",
          message: `Connector threw unexpectedly: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
        });
        continue;
      }

      allErrors.push(...result.value.errors);
      allRawJobs.push(...result.value.jobs);
      totalFetched += result.value.jobs.length;
    }

    // ââââ Step 2: Deduplicate within the batch ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    const deduped = deduplicateJobs(allRawJobs);
    totalSkipped += totalFetched - deduped.length;

    // ââââ Step 3: Load user profile for scoring ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    const profile = await getProfile();

    // ââââ Step 4: Score + upsert each job ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    await Promise.allSettled(
      deduped.map(async (rawJob) => {
        try {
          // Score against profile (if profile exists)
          const fitResult = profile
            ? scoreJob(rawJob, profile)
            : { score: null, reasons: [], explanation: null };

          const now = new Date();
          const jobToUpsert = {
            ...rawJob,
            firstSeenAt: now,
            lastSeenAt: now,
            fitScore: fitResult.score,
            fitReasons: fitResult.reasons,
            fitExplanation: fitResult.explanation,
          };

          const result = await upsertJob(jobToUpsert);
          seenDedupeKeys.push(rawJob.dedupeKey);

          if (result.inserted) totalInserted++;
          else if (result.updated) totalUpdated++;
        } catch (err) {
          allErrors.push({
            source: rawJob.source,
            stage: "upsert",
            message: `Failed to upsert job "${rawJob.title}" at "${rawJob.company}": ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      })
    );

    // ââââ Step 5: Mark jobs not seen in this run ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    if (seenDedupeKeys.length > 0) {
      await markMissedJobs(seenDedupeKeys, inactiveAfterMissedRuns);
    }
  } catch (err) {
    allErrors.push({
      source: "manual",
      stage: "fetch",
      message: `Pipeline fatal error: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  const status: IngestionRun["status"] =
    allErrors.length === 0
      ? "success"
      : totalInserted + totalUpdated > 0
      ? "partial"
      : "failed";

  await finishIngestionRun(runId, {
    status,
    totalFetched,
    totalInserted,
    totalUpdated,
    totalSkipped,
    errors: allErrors,
  });

  return {
    runId,
    status,
    totalFetched,
    totalInserted,
    totalUpdated,
    totalSkipped,
    errors: allErrors,
    durationMs: Date.now() - start,
  };
}

import { desc, eq } from "drizzle-orm";
import { db } from "../client";
import { ingestionRuns } from "../schema";
import type { IngestionRun, IngestionError } from "../../types";

type RunRow = typeof ingestionRuns.$inferSelect;

function rowToRun(row: RunRow): IngestionRun {
  return {
    id: row.id,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt ?? null,
    status: row.status,
    sources: (row.sources as string[]) as IngestionRun["sources"],
    totalFetched: row.totalFetched,
    totalInserted: row.totalInserted,
    totalUpdated: row.totalUpdated,
    totalSkipped: row.totalSkipped,
    errors: (row.errors as IngestionError[]) ?? [],
  };
}

export async function startIngestionRun(sources: string[]): Promise<string> {
  const inserted = await db
    .insert(ingestionRuns)
    .values({ sources, status: "partial", startedAt: new Date() })
    .returning({ id: ingestionRuns.id });
  return inserted[0]!.id;
}

export async function finishIngestionRun(
  id: string,
  result: Pick<
    IngestionRun,
    "status" | "totalFetched" | "totalInserted" | "totalUpdated" | "totalSkipped" | "errors"
  >
): Promise<void> {
  await db
    .update(ingestionRuns)
    .set({
      finishedAt: new Date(),
      status: result.status,
      totalFetched: result.totalFetched,
      totalInserted: result.totalInserted,
      totalUpdated: result.totalUpdated,
      totalSkipped: result.totalSkipped,
      errors: result.errors,
    })
    .where(eq(ingestionRuns.id, id));
}

export async function getRecentIngestionRuns(limit = 10): Promise<IngestionRun[]> {
  const rows = await db
    .select()
    .from(ingestionRuns)
    .orderBy(desc(ingestionRuns.startedAt))
    .limit(limit);
  return rows.map(rowToRun);
}

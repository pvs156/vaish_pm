import { NextRequest, NextResponse } from "next/server";
import { runIngestionPipeline } from "@/lib/ingestion/pipeline";
import type { SourceId } from "@/lib/types";

/**
 * POST /api/ingest
 *
 * Triggers the full ingestion pipeline.
 * Requires `Authorization: Bearer <INGEST_SECRET>` or body `{ secret }`.
 *
 * Also responds to Vercel cron calls (which send CRON_SECRET as Authorization header).
 *
 * Body (optional):
 * {
 *   sources?: SourceId[]  // run specific sources only
 * }
 */
export async function POST(req: NextRequest) {
  // Auth check — accept INGEST_SECRET or CRON_SECRET
  const authHeader = req.headers.get("authorization") ?? "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  const ingestSecret = process.env.INGEST_SECRET;
  const cronSecret = process.env.CRON_SECRET;

  const isAuthorized =
    (ingestSecret && bearerToken === ingestSecret) ||
    (cronSecret && bearerToken === cronSecret);

  // Also allow body-based secret for manual local testing
  let bodySources: SourceId[] | undefined;
  if (!isAuthorized) {
    try {
      const body = (await req.json()) as { secret?: string; sources?: SourceId[] };
      if (!body.secret || body.secret !== ingestSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      bodySources = body.sources;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    try {
      const body = (await req.json()) as { sources?: SourceId[] };
      bodySources = body.sources;
    } catch {
      // No body — that's fine for cron calls
    }
  }

  try {
    const result = await runIngestionPipeline({ sources: bodySources });

    return NextResponse.json({
      ok: true,
      runId: result.runId,
      status: result.status,
      totalFetched: result.totalFetched,
      totalInserted: result.totalInserted,
      totalUpdated: result.totalUpdated,
      totalSkipped: result.totalSkipped,
      errorCount: result.errors.length,
      durationMs: result.durationMs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ingest] Pipeline error:", message);
    return NextResponse.json({ error: "Internal server error", message }, { status: 500 });
  }
}

// Allow Vercel cron to call via GET as well
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || bearerToken !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runIngestionPipeline();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

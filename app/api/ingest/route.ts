import { NextRequest, NextResponse } from "next/server";
import { runIngestionPipeline } from "@/lib/ingestion/pipeline";
import type { SourceId } from "@/lib/types";

/**
 * POST /api/ingest
 *
 * Triggers the full ingestion pipeline. Open for MVP — this is a personal
 * single-user site and ingest only reads public job board APIs.
 *
 * Body (optional): { sources?: SourceId[] }
 */
export async function POST(req: NextRequest) {
  // Personal site MVP: POST is open — ingest only reads public job APIs.
  // The GET endpoint below stays protected by CRON_SECRET for Vercel cron.
  let bodySources: SourceId[] | undefined;
  try {
    const body = (await req.json()) as { sources?: SourceId[] };
    bodySources = body.sources;
  } catch {
    // No body — fine for button-triggered calls
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

// GET /api/ingest — Vercel cron endpoint, requires CRON_SECRET
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

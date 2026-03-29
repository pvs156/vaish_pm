import { NextRequest, NextResponse } from "next/server";
import { JobActionSchema } from "@/lib/schemas";
import {
  getJobById,
  saveJob,
  unsaveJob,
  applyJob,
  dismissJob,
  undismissJob,
} from "@/lib/db/queries/jobs";

/**
 * GET /api/jobs/[id]
 * Returns a single job with user status attached.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const job = await getJobById(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    return NextResponse.json(job);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/jobs/[id]
 *
 * Body: { action: "save" | "dismiss" | "apply" | "unsave" | "undismiss", notes?: string }
 *
 * Updates the user's action state for a job.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = JobActionSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid action", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { action, notes } = parseResult.data;

  try {
    switch (action) {
      case "save":
        await saveJob(id, notes ?? undefined);
        break;
      case "unsave":
        await unsaveJob(id);
        break;
      case "apply":
        await applyJob(id, notes ?? undefined);
        break;
      case "dismiss":
        await dismissJob(id);
        break;
      case "undismiss":
        await undismissJob(id);
        break;
    }

    return NextResponse.json({ ok: true, jobId: id, action });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[api/jobs/${id}] Action error:`, message);
    return NextResponse.json({ error: "Failed to apply action" }, { status: 500 });
  }
}

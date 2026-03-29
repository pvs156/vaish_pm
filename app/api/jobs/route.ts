import { NextRequest, NextResponse } from "next/server";
import { queryJobs } from "@/lib/db/queries/jobs";
import { JobFiltersSchema } from "@/lib/schemas";

/**
 * GET /api/jobs
 *
 * Returns a paginated, filtered list of jobs.
 *
 * Query params (all optional):
 *   window       24h | 48h | 7d | all     (default: 48h)
 *   source       jobright_github | simplifyjobs_github | greenhouse | lever | ashby | manual | all
 *   workModel    remote | hybrid | onsite | unknown | all
 *   location     string (partial match)
 *   minScore     0â€â€œ100
 *   sort         best_fit | newest
 *   includeApplied   true | false
 *   includeDismissed true | false
 *   page         integer >= 1
 *   pageSize     1â€â€œ100
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const parseResult = JobFiltersSchema.safeParse(
    Object.fromEntries(searchParams.entries())
  );

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid filter parameters", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const filters = parseResult.data;
  const { page, pageSize, ...jobFilters } = filters;

  try {
    const { jobs, total } = await queryJobs(jobFilters, page, pageSize);

    return NextResponse.json({
      jobs,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/jobs] Query error:", message);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

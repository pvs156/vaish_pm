import { NextRequest, NextResponse } from "next/server";
import { getProfile, upsertProfile } from "@/lib/db/queries/profile";
import { UserProfileUpdateSchema } from "@/lib/schemas";
import { extractProfileFromResume } from "@/lib/profile/extract";
import { getAllActiveJobIds, getJobsByIds, updateJobScore } from "@/lib/db/queries/jobs";
import { scoreJob } from "@/lib/ranking/engine";

/**
 * GET /api/profile
 * Returns the user profile.
 */
export async function GET() {
  try {
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/profile
 *
 * Updates the user profile. After saving, re-scores all active jobs.
 * If resumeText is provided, extracted fields are merged (only for empty fields).
 *
 * Body: Partial<UserProfile> (validated with UserProfileUpdateSchema)
 */
export async function PUT(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = UserProfileUpdateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const updates = parseResult.data;

  // If resume text is provided, auto-extract missing fields
  if (updates.resumeText) {
    const extracted = extractProfileFromResume(updates.resumeText);
    if (!updates.preferredSkills || updates.preferredSkills.length === 0) {
      updates.preferredSkills = extracted.preferredSkills;
    }
    if (!updates.preferredTitles || updates.preferredTitles.length === 0) {
      updates.preferredTitles = extracted.preferredTitles;
    }
    if (!updates.preferredLocations || updates.preferredLocations.length === 0) {
      updates.preferredLocations = extracted.preferredLocations;
    }
    if (!updates.preferredWorkModel || updates.preferredWorkModel.length === 0) {
      updates.preferredWorkModel = extracted.preferredWorkModel;
    }
  }

  try {
    const profile = await upsertProfile(updates);

    // Kick off async re-scoring â€â€ don't await it (too slow for a request)
    rescoreAllJobs(profile).catch((err) => {
      console.error("[api/profile] Rescore error:", err);
    });

    return NextResponse.json(profile);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/profile/extract
 * Extracts profile fields from resume text without saving.
 * Useful for the settings preview.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { resumeText } = body as { resumeText?: string };
  if (!resumeText || typeof resumeText !== "string") {
    return NextResponse.json({ error: "resumeText is required" }, { status: 400 });
  }

  const extracted = extractProfileFromResume(resumeText);
  return NextResponse.json(extracted);
}

// ââ€€ââ€€ââ€€ Background re-scoring ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€ââ€€

async function rescoreAllJobs(
  profile: Awaited<ReturnType<typeof upsertProfile>>
): Promise<void> {
  const ids = await getAllActiveJobIds();
  const BATCH = 50;

  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const jobs = await getJobsByIds(batch);

    await Promise.allSettled(
      jobs.map(async (job) => {
        const result = scoreJob(
          {
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
            active: job.active,
            dedupeKey: job.dedupeKey,
          },
          profile
        );

        if (result.score !== null) {
          await updateJobScore(
            job.id,
            result.score,
            result.reasons,
            result.explanation ?? ""
          );
        }
      })
    );
  }
}

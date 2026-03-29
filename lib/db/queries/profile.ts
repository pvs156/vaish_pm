import { eq } from "drizzle-orm";
import { db } from "../client";
import { userProfile } from "../schema";
import type { UserProfile } from "../../types";

type ProfileRow = typeof userProfile.$inferSelect;

function rowToProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    resumeText: row.resumeText ?? null,
    preferredTitles: (row.preferredTitles as string[]) ?? [],
    preferredSkills: (row.preferredSkills as string[]) ?? [],
    preferredLocations: (row.preferredLocations as string[]) ?? [],
    preferredWorkModel: (row.preferredWorkModel as UserProfile["preferredWorkModel"]) ?? [],
    updatedAt: row.updatedAt,
  };
}

export async function getProfile(): Promise<UserProfile | null> {
  const rows = await db.select().from(userProfile).limit(1);
  const row = rows[0];
  return row ? rowToProfile(row) : null;
}

export async function upsertProfile(
  data: Partial<Omit<UserProfile, "id" | "updatedAt">>
): Promise<UserProfile> {
  const existing = await db.select().from(userProfile).limit(1);

  if (existing.length > 0 && existing[0]) {
    const updated = await db
      .update(userProfile)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(userProfile.id, existing[0].id))
      .returning();
    return rowToProfile(updated[0]!);
  }

  const inserted = await db
    .insert(userProfile)
    .values({
      resumeText: data.resumeText ?? null,
      preferredTitles: data.preferredTitles ?? [],
      preferredSkills: data.preferredSkills ?? [],
      preferredLocations: data.preferredLocations ?? [],
      preferredWorkModel: data.preferredWorkModel ?? [],
      updatedAt: new Date(),
    })
    .returning();

  return rowToProfile(inserted[0]!);
}

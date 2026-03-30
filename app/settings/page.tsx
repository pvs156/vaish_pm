import { getProfile } from "@/lib/db/queries/profile";
import { ProfileForm } from "@/components/settings/ProfileForm";
import type { UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let profile: UserProfile | null = null;
  try {
    profile = await getProfile();
  } catch {
    // Not connected yet â” show empty form
  }

  return (
    <div style={{background:"#fafaf9"}} className="min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-stone-800 tracking-tight">Profile settings</h1>
          <p className="text-[13px] text-stone-400 mt-1">
            Your resume and preferences are used to score and rank every job listing.
          </p>
        </div>
        <ProfileForm initial={profile} />
      </div>
    </div>
  );
}

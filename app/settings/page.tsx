import { getProfile } from "@/lib/db/queries/profile";
import { ProfileForm } from "@/components/settings/ProfileForm";
import type { UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let profile: UserProfile | null = null;
  try {
    profile = await getProfile();
  } catch {
    // Not connected yet ‚Ä‚Äù show empty form
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-8">
        Your profile helps us rank and filter PM roles to match your preferences.
      </p>
      <ProfileForm initial={profile} />
    </div>
  );
}

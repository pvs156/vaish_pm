/**
 * Shared score badge component — circular pill displaying fit score with
 * color-coded thresholds: green ≥70, amber ≥40, red <40.
 */

interface ScoreBadgeProps {
  score: number | null;
  size?: "sm" | "md" | "lg";
}

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  if (score === null) {
    return (
      <span className="text-xs text-gray-400 italic">Unscored</span>
    );
  }

  const colorClass =
    score >= 70
      ? "bg-emerald-500 text-white"
      : score >= 40
      ? "bg-amber-400 text-white"
      : "bg-red-400 text-white";

  const sizeClass =
    size === "sm"
      ? "w-8 h-8 text-xs"
      : size === "lg"
      ? "w-14 h-14 text-xl font-bold"
      : "w-10 h-10 text-sm";

  return (
    <div
      className={`${sizeClass} ${colorClass} rounded-full flex items-center justify-center font-semibold tabular-nums shrink-0`}
      title={`Fit score: ${score}/100`}
    >
      {score}
    </div>
  );
}

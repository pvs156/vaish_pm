interface ScoreBadgeProps {
  score: number | null;
  size?: "sm" | "md" | "lg";
}

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  if (score === null) {
    return <span className="text-[11px] text-stone-400 font-medium tracking-wide">--</span>;
  }

  const colorClass =
    score >= 70
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      : score >= 40
      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      : "bg-red-50 text-red-600 ring-1 ring-red-200";

  const sizeClass =
    size === "sm"
      ? "w-9 h-9 text-xs"
      : size === "lg"
      ? "w-16 h-16 text-2xl font-bold"
      : "w-11 h-11 text-sm";

  return (
    <div
      className={`${sizeClass} ${colorClass} rounded-full flex flex-col items-center justify-center font-semibold tabular-nums shrink-0`}
      title={`Fit score: ${score}/100`}
    >
      <span>{score}</span>
    </div>
  );
}

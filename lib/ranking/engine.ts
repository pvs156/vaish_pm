/**
 * Ranking engine â” aggregates individual signals into a deterministic 0â“100 score.
 *
 * Weights (sum to 1.0):
 *   titleRelevance  0.30  â” most important: is this even a PM role?
 *   skillsOverlap   0.20  â” do skills from profile/JD match?
 *   domainFit       0.15  â” does the domain match user's background?
 *   recency         0.15  â” newer is better
 *   locationFit     0.10  â” geography alignment
 *   workModelFit    0.10  â” remote/hybrid/onsite preference
 *
 * Mismatch penalty is applied as a final multiplier (not weighted).
 */

import type { FitResult, UserProfile } from "../types";
import type { ConnectorResult } from "../types";
import {
  titleRelevanceScore,
  skillsOverlapScore,
  domainFitScore,
  locationFitScore,
  workModelFitScore,
  recencyScore,
  mismatchPenalty,
} from "./signals";

type RawJob = ConnectorResult["jobs"][number];

interface ScoredJob {
  score: number | null;
  reasons: string[];
  explanation: string | null;
}

const WEIGHTS = {
  titleRelevance: 0.30,
  skillsOverlap: 0.20,
  domainFit: 0.15,
  recency: 0.15,
  locationFit: 0.10,
  workModelFit: 0.10,
} as const;

/**
 * Score a single job against a user profile.
 * Returns null score if profile is empty/missing.
 */
export function scoreJob(job: RawJob, profile: UserProfile): ScoredJob {
  // If profile has no useful data, return null (unscored)
  const hasProfile =
    profile.preferredTitles.length > 0 ||
    profile.preferredSkills.length > 0 ||
    profile.resumeText;

  if (!hasProfile) {
    return { score: null, reasons: [], explanation: null };
  }

  const title = titleRelevanceScore(job.title, profile);
  const skills = skillsOverlapScore(job, profile);
  const domain = domainFitScore(job, profile);
  const location = locationFitScore(job, profile);
  const workModel = workModelFitScore(job, profile);
  const recency = recencyScore(job);
  const penalty = mismatchPenalty(job, profile);

  const rawScore =
    title.score * WEIGHTS.titleRelevance +
    skills.score * WEIGHTS.skillsOverlap +
    domain.score * WEIGHTS.domainFit +
    recency.score * WEIGHTS.recency +
    location.score * WEIGHTS.locationFit +
    workModel.score * WEIGHTS.workModelFit;

  // Apply mismatch multiplier and scale to 0â“100
  const finalScore = Math.round(rawScore * penalty.multiplier * 100);
  const clampedScore = Math.max(0, Math.min(100, finalScore));

  // Build reasons list (3â“5 most informative items)
  const reasons: string[] = [];

  if (title.matched) {
    reasons.push(`Title matches: "${title.matched}"`);
  }

  if (skills.matched.length > 0) {
    const top = skills.matched.slice(0, 3).join(", ");
    reasons.push(`Skills match: ${top}`);
  }

  if (domain.domain) {
    reasons.push(`Domain fit: ${domain.domain}`);
  }

  if (recency.label) {
    reasons.push(recency.label);
  }

  if (location.reason) {
    reasons.push(location.reason);
  }

  if (workModel.reason && reasons.length < 5) {
    reasons.push(workModel.reason);
  }

  if (penalty.reason) {
    reasons.push(`â  ${penalty.reason}`);
  }

  // Build a short explanation string for the UI
  const matchStrength =
    clampedScore >= 80
      ? "Strong match"
      : clampedScore >= 60
      ? "Good match"
      : clampedScore >= 40
      ? "Partial match"
      : "Low match";

  const topReason = reasons[0] ?? "Role is in scope";
  const explanation = `${matchStrength}. ${topReason}.`;

  return {
    score: clampedScore,
    reasons,
    explanation,
  };
}

/**
 * Score a full FitResult (with all signal values) â” used for API/debug responses.
 */
export function scoreJobFull(job: RawJob, profile: UserProfile): FitResult {
  const { score, reasons, explanation } = scoreJob(job, profile);

  return {
    score: score ?? 0,
    reasons,
    explanation: explanation ?? "",
    signals: {
      titleRelevance: titleRelevanceScore(job.title, profile).score,
      skillsOverlap: skillsOverlapScore(job, profile).score,
      domainFit: domainFitScore(job, profile).score,
      locationFit: locationFitScore(job, profile).score,
      workModelFit: workModelFitScore(job, profile).score,
      recency: recencyScore(job).score,
    },
  };
}

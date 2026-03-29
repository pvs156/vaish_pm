/**
 * Individual ranking signal scorers.
 *
 * Each scorer returns a value in [0, 1].
 * Scores are combined with weights in engine.ts.
 *
 * All scorers are pure functions â” no side effects, no I/O.
 */

import type { UserProfile } from "../types";
import type { ConnectorResult } from "../types";
import { tokenize, overlapScore, containsAny } from "../utils/text";
import { hoursAgo } from "../utils/dates";

type RawJob = ConnectorResult["jobs"][number];

// â”â”â” PM-adjacent title keywords (ordered by relevance to the user profile) â”â”â”

const PM_CORE_TITLES = [
  "product manager",
  "product management",
  "apm",
  "associate product manager",
  "associate product management",
];

const PM_ADJACENT_TITLES = [
  "program manager",
  "program management",
  "project manager",
  "product operations",
  "product analyst",
  "product strategy",
  "technical product manager",
  "product owner",
];

const PM_MISMATCH_TITLES = [
  "marketing manager",
  "content manager",
  "account manager",
  "sales manager",
  "customer success manager",
  "hr manager",
  "office manager",
];

// Domain keywords that overlap with user's background
const HIGH_FIT_DOMAINS = [
  "ai", "artificial intelligence", "machine learning", "ml", "healthtech",
  "healthcare", "health", "fintech", "financial", "finance",
  "saas", "enterprise", "b2b", "platform", "data",
];

const PM_CORE_SKILLS = [
  "product roadmap", "roadmap", "feature prioritization", "prioritization",
  "go-to-market", "gtm", "a/b testing", "ab testing", "competitive analysis",
  "product metrics", "kpis", "agile", "scrum", "kanban", "jira", "confluence",
  "figma", "user research", "requirements", "stakeholder", "sprint", "backlog",
  "python", "sql", "data analysis", "analytics",
];

// â”â”â” Signal: Title Relevance â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

/**
 * How well does the job title match PM-relevant role types?
 * Returns 1.0 for core PM roles, 0.6 for adjacent, 0 for clear mismatches.
 */
export function titleRelevanceScore(
  jobTitle: string,
  _profile: UserProfile
): { score: number; matched: string | null } {
  const lower = jobTitle.toLowerCase();

  for (const title of PM_MISMATCH_TITLES) {
    if (lower.includes(title)) return { score: 0, matched: null };
  }

  for (const title of PM_CORE_TITLES) {
    if (lower.includes(title)) return { score: 1.0, matched: title };
  }

  for (const title of PM_ADJACENT_TITLES) {
    if (lower.includes(title)) return { score: 0.6, matched: title };
  }

  // Check against user's preferred titles
  for (const pref of _profile.preferredTitles) {
    if (lower.includes(pref.toLowerCase())) return { score: 0.8, matched: pref };
  }

  return { score: 0.2, matched: null };
}

// â”â”â” Signal: Skills Overlap â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

/**
 * How many of the user's skills appear in the job description or title?
 * Returns a value in [0, 1].
 */
export function skillsOverlapScore(
  job: RawJob,
  profile: UserProfile
): { score: number; matched: string[] } {
  const combinedText = [
    job.title,
    job.description ?? "",
  ].join(" ");

  const jobTokens = tokenize(combinedText);
  const coreSkillTokens = PM_CORE_SKILLS.flatMap((s) => tokenize(s));

  // Check user's preferred skills against job text
  const userSkillTokens = profile.preferredSkills.flatMap((s) => tokenize(s));
  const allNeedleTokens = [...new Set([...coreSkillTokens, ...userSkillTokens])];

  const score = overlapScore(jobTokens, allNeedleTokens);

  const matched = profile.preferredSkills.filter((skill) =>
    combinedText.toLowerCase().includes(skill.toLowerCase())
  );

  return { score: Math.min(score * 2, 1), matched }; // amplify since partial matches are common
}

// â”â”â” Signal: Domain Fit â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

/**
 * Does the job's company/title/description mention domains that match the user's background?
 */
export function domainFitScore(
  job: RawJob,
  _profile: UserProfile
): { score: number; domain: string | null } {
  const combinedText = [job.company, job.title, job.description ?? ""].join(" ");
  const lower = combinedText.toLowerCase();

  for (const domain of HIGH_FIT_DOMAINS) {
    if (lower.includes(domain)) return { score: 1.0, domain };
  }

  return { score: 0.3, domain: null };
}

// â”â”â” Signal: Location Fit â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

/**
 * Does the job's location match any of the user's preferred locations?
 * Returns 1.0 for match, 0.5 for US-based (user is in US), 0.2 for international.
 */
export function locationFitScore(
  job: RawJob,
  profile: UserProfile
): { score: number; reason: string | null } {
  if (job.workModel === "remote") {
    return { score: 0.9, reason: "Remote â” open to all locations" };
  }

  const jobLocations = job.locations.map((l) => l.toLowerCase());
  const prefLocations = profile.preferredLocations.map((l) => l.toLowerCase());

  for (const pref of prefLocations) {
    if (jobLocations.some((loc) => loc.includes(pref) || pref.includes(loc))) {
      return { score: 1.0, reason: `Matches preferred location: ${pref}` };
    }
  }

  const usKeywords = ["united states", ", us", ", usa", ", ca", ", ny", ", tx", ", wa", ", il", ", ma", ", fl", ", co"];
  const isUS = jobLocations.some((loc) =>
    usKeywords.some((kw) => loc.includes(kw))
  );

  if (isUS) return { score: 0.7, reason: "US-based role" };

  return { score: 0.2, reason: null };
}

// â”â”â” Signal: Work Model Fit â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

/**
 * Does the job's work model match the user's preferences?
 */
export function workModelFitScore(
  job: RawJob,
  profile: UserProfile
): { score: number; reason: string | null } {
  if (profile.preferredWorkModel.length === 0) {
    return { score: 0.7, reason: null }; // neutral if no preference set
  }

  if (profile.preferredWorkModel.includes(job.workModel)) {
    return { score: 1.0, reason: `Work model matches preference: ${job.workModel}` };
  }

  // Remote is universally good if user prefers remote
  if (job.workModel === "remote" && profile.preferredWorkModel.includes("remote")) {
    return { score: 1.0, reason: "Remote role" };
  }

  if (job.workModel === "unknown") return { score: 0.6, reason: null };

  return { score: 0.3, reason: `Work model (${job.workModel}) doesn't match preference` };
}

// â”â”â” Signal: Recency â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

/**
 * How recently was the job posted?
 * Decays from 1.0 (just posted) to ~0.1 (more than 30 days old).
 */
export function recencyScore(job: RawJob): { score: number; label: string } {
  const referenceDate = job.postedAt ?? new Date();
  const hours = hoursAgo(referenceDate);

  if (hours <= 24) return { score: 1.0, label: "Posted today" };
  if (hours <= 48) return { score: 0.9, label: "Posted yesterday" };
  if (hours <= 72) return { score: 0.8, label: "Posted 3 days ago" };
  if (hours <= 168) return { score: 0.65, label: "Posted this week" };
  if (hours <= 336) return { score: 0.45, label: "Posted last 2 weeks" };
  if (hours <= 720) return { score: 0.25, label: "Posted this month" };
  return { score: 0.1, label: "Older posting" };
}

// â”â”â” Signal: Mismatch Penalty â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

/**
 * Apply penalties for clear mismatches: wrong seniority, excluded domains, etc.
 * Returns a multiplier in [0, 1] â” 1.0 = no penalty.
 */
export function mismatchPenalty(
  job: RawJob,
  _profile: UserProfile
): { multiplier: number; reason: string | null } {
  const combined = [job.title, job.company, job.description ?? ""].join(" ").toLowerCase();

  // Hard mismatch: senior roles (not for interns)
  if (/\b(senior|sr\.|staff|principal|director|vp|vice president|head of|lead)\b/.test(combined)) {
    return { multiplier: 0.3, reason: "Appears to be senior/leadership role" };
  }

  // Hard mismatch: engineering-only, no PM signals
  if (
    /\b(software engineer|backend engineer|frontend engineer|fullstack engineer|devops|sre|qa engineer)\b/.test(combined) &&
    !containsAny(combined, ["product", "program", "project"])
  ) {
    return { multiplier: 0.2, reason: "Engineering role without PM components" };
  }

  // Mild mismatch: ops/analyst roles that are not PM-specific
  if (
    /\b(data analyst|business analyst|marketing analyst)\b/.test(combined) &&
    !containsAny(combined, ["product"])
  ) {
    return { multiplier: 0.6, reason: "Analyst role without explicit PM focus" };
  }

  return { multiplier: 1.0, reason: null };
}

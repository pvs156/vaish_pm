/**
 * Resume/profile extraction â” heuristic extraction of structured fields from
 * a pasted resume text block.
 *
 * This is intentionally simple and resilient: it uses regex + keyword lists
 * to extract titles, skills, and location preferences.
 * It will NOT get everything right â” it surfaces likely values for the user to
 * confirm/correct in the settings UI.
 */

import type { UserProfile, WorkModel } from "../types";
import { cleanText } from "../utils/text";

// â”â”â” Known PM titles â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

const KNOWN_TITLES = [
  "Product Manager",
  "Senior Product Manager",
  "Principal Product Manager",
  "Associate Product Manager",
  "APM",
  "Technical Product Manager",
  "Group Product Manager",
  "Product Lead",
  "Product Operations Manager",
  "Program Manager",
  "Project Manager",
  "Product Analyst",
  "Product Strategist",
  "Product Owner",
];

// â”â”â” Known PM skills â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

const KNOWN_SKILLS = [
  "Product Roadmapping",
  "Roadmap",
  "Feature Prioritization",
  "Go-to-Market",
  "GTM",
  "A/B Testing",
  "Competitive Analysis",
  "Product Metrics",
  "Requirements Gathering",
  "Market Research",
  "Agile",
  "Scrum",
  "Kanban",
  "JIRA",
  "Jira",
  "Confluence",
  "Figma",
  "PowerBI",
  "Power BI",
  "Python",
  "SQL",
  "AWS",
  "Excel",
  "Machine Learning",
  "Stakeholder Management",
  "User Research",
  "Data Analysis",
  "Analytics",
  "API",
  "Tableau",
  "Looker",
  "Amplitude",
  "Mixpanel",
  "Notion",
  "Linear",
  "Product Discovery",
  "Sprint Planning",
  "Backlog Grooming",
  "OKRs",
  "KPIs",
  "React",
  "TypeScript",
  "JavaScript",
  "Docker",
  "Kubernetes",
];

// â”â”â” US states and remote keywords â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

const US_LOCATIONS = [
  "San Francisco, CA",
  "New York, NY",
  "Seattle, WA",
  "Austin, TX",
  "Boston, MA",
  "Chicago, IL",
  "Los Angeles, CA",
  "Denver, CO",
  "Atlanta, GA",
  "Washington, DC",
  "Remote",
  "United States",
];

// â”â”â” Extraction functions â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

/**
 * Extract skill keywords that appear in the resume text.
 */
export function extractSkills(resumeText: string): string[] {
  const found = new Set<string>();
  for (const skill of KNOWN_SKILLS) {
    // Word-boundary match, case-insensitive
    const pattern = new RegExp(`\\b${skill.replace(/[-+]/g, "\\$&")}\\b`, "i");
    if (pattern.test(resumeText)) {
      found.add(skill);
    }
  }
  return Array.from(found);
}

/**
 * Extract job title preferences from the resume.
 * Looks for known title strings plus common section patterns.
 */
export function extractPreferredTitles(resumeText: string): string[] {
  const found = new Set<string>();

  for (const title of KNOWN_TITLES) {
    const pattern = new RegExp(`\\b${title}\\b`, "i");
    if (pattern.test(resumeText)) {
      found.add(title);
    }
  }

  // Also look for "Seeking: ..." or "Looking for: ..." patterns
  const seekingMatch = resumeText.match(
    /(?:seeking|targeting|looking for|objective)[:\s]+([^\n.]+)/i
  );
  if (seekingMatch?.[1]) {
    const seeking = cleanText(seekingMatch[1]);
    if (seeking.length < 100) found.add(seeking);
  }

  return Array.from(found);
}

/**
 * Extract location preferences from the resume.
 */
export function extractPreferredLocations(resumeText: string): string[] {
  const found = new Set<string>();

  for (const loc of US_LOCATIONS) {
    if (resumeText.toLowerCase().includes(loc.toLowerCase())) {
      found.add(loc);
    }
  }

  // Generic US city, State pattern
  const cityStatePatterms = resumeText.matchAll(
    /\b([A-Z][a-z]+(?: [A-Z][a-z]+)*),\s*([A-Z]{2})\b/g
  );
  for (const match of cityStatePatterms) {
    const [, city, state] = match;
    if (city && state) found.add(`${city}, ${state}`);
  }

  return Array.from(found).slice(0, 5); // cap at 5 locations
}

/**
 * Infer work model preference from resume text.
 */
export function extractWorkModelPreference(resumeText: string): WorkModel[] {
  const lower = resumeText.toLowerCase();
  const prefs: WorkModel[] = [];

  if (/\bremote\b/.test(lower)) prefs.push("remote");
  if (/\bhybrid\b/.test(lower)) prefs.push("hybrid");
  if (/\bon.?site\b|\bin.?office\b/.test(lower)) prefs.push("onsite");

  return prefs;
}

// â”â”â” Main extraction entry point â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

export interface ExtractedProfile {
  preferredTitles: string[];
  preferredSkills: string[];
  preferredLocations: string[];
  preferredWorkModel: WorkModel[];
}

/**
 * Extract structured profile fields from a pasted resume text.
 * Returns partial profile data suitable for showing in the settings preview.
 */
export function extractProfileFromResume(resumeText: string): ExtractedProfile {
  return {
    preferredTitles: extractPreferredTitles(resumeText),
    preferredSkills: extractSkills(resumeText),
    preferredLocations: extractPreferredLocations(resumeText),
    preferredWorkModel: extractWorkModelPreference(resumeText),
  };
}

/**
 * Merge extracted profile into an existing UserProfile,
 * preserving manual edits where they exist.
 */
export function mergeExtractedIntoProfile(
  existing: UserProfile,
  extracted: ExtractedProfile
): Partial<UserProfile> {
  return {
    preferredTitles:
      existing.preferredTitles.length > 0
        ? existing.preferredTitles
        : extracted.preferredTitles,
    preferredSkills:
      existing.preferredSkills.length > 0
        ? existing.preferredSkills
        : extracted.preferredSkills,
    preferredLocations:
      existing.preferredLocations.length > 0
        ? existing.preferredLocations
        : extracted.preferredLocations,
    preferredWorkModel:
      existing.preferredWorkModel.length > 0
        ? existing.preferredWorkModel
        : extracted.preferredWorkModel,
  };
}

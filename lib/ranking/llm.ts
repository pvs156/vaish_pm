/**
 * Optional LLM boost for ranking.
 *
 * When OPENAI_API_KEY is set, this function calls the OpenAI Chat API with
 * the user's profile and job description to get a nuanced "match quality" score
 * (0‚Ä‚Äú100) and a short explanation.
 *
 * When the key is absent or the call fails, the function quietly returns null
 * so the pipeline falls back to the pure heuristic score.
 *
 * This is intentionally isolated: it never replaces the heuristic score outright
 * ‚Ä‚Äù it can only nudge the final score up or down by ¬±15 points.
 */

import type { UserProfile } from "../types";
import type { ConnectorResult } from "../types";

type RawJob = ConnectorResult["jobs"][number];

const LLM_NUDGE_MAX = 15; // max points the LLM can adjust the heuristic score

export interface LlmBoostResult {
  nudge: number; // signed integer in [-15, 15]
  reasoning: string;
}

/**
 * Returns a nudge value that will be added to the heuristic score.
 * Returns null if LLM is not available or the call fails.
 */
export async function getLlmBoost(
  job: RawJob,
  profile: UserProfile,
  heuristicScore: number
): Promise<LlmBoostResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const profileSummary = [
    profile.preferredTitles.length > 0
      ? `Preferred titles: ${profile.preferredTitles.join(", ")}`
      : null,
    profile.preferredSkills.length > 0
      ? `Skills: ${profile.preferredSkills.join(", ")}`
      : null,
    profile.preferredLocations.length > 0
      ? `Preferred locations: ${profile.preferredLocations.join(", ")}`
      : null,
    profile.resumeText
      ? `Resume excerpt: ${profile.resumeText.slice(0, 800)}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const jobSummary = [
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    `Location: ${job.locations.join(", ") || "Unknown"}`,
    `Work model: ${job.workModel}`,
    job.description ? `Description: ${job.description.slice(0, 600)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `You are a job-matching assistant. A heuristic algorithm has scored a job at ${heuristicScore}/100 for a candidate.

Candidate profile:
${profileSummary}

Job:
${jobSummary}

Respond with JSON only:
{
  "nudge": <integer from -${LLM_NUDGE_MAX} to ${LLM_NUDGE_MAX}>,
  "reasoning": "<one short sentence explaining the adjustment>"
}

nudge > 0 if the job is a better fit than the heuristic suggests, < 0 if worse, 0 if accurate.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 150,
        temperature: 0,
      }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const content = data.choices[0]?.message.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as { nudge?: unknown; reasoning?: unknown };
    const nudge = typeof parsed.nudge === "number"
      ? Math.max(-LLM_NUDGE_MAX, Math.min(LLM_NUDGE_MAX, Math.round(parsed.nudge)))
      : 0;
    const reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning : "";

    return { nudge, reasoning };
  } catch {
    // Fail silently ‚Ä‚Äù LLM boost is always optional
    return null;
  }
}

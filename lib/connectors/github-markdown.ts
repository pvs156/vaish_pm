import { GitHubContentsSchema } from "../schemas";

const GITHUB_API_BASE = "https://api.github.com";

/**
 * Fetch a file from a public GitHub repository using the Contents API.
 * Returns the decoded UTF-8 string content of the file.
 *
 * Uses GITHUB_TOKEN if present (5000 req/hr vs 60 req/hr unauthenticated).
 */
export async function fetchGitHubFile(
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<string> {
  const url = new URL(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`
  );
  if (ref) url.searchParams.set("ref", ref);

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), { headers, cache: "no-store" });

  if (!res.ok) {
    throw new Error(
      `GitHub Contents API error: ${res.status} ${res.statusText} for ${url}`
    );
  }

  const json: unknown = await res.json();
  const parsed = GitHubContentsSchema.parse(json);

  // GitHub returns base64 content with newlines every 60 chars
  const content = Buffer.from(parsed.content.replace(/\n/g, ""), "base64").toString(
    "utf-8"
  );
  return content;
}

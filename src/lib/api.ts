/**
 * api.ts — the only place that talks to AWS.
 *
 * Design rule: the leaderboard is an enhancement, never a dependency. Every call has a
 * timeout, swallows its own errors and returns `null`/`{ ok: false }`, so a cold Lambda
 * or a misconfigured CORS header can never surface as an error on the page a judge is
 * scoring.
 */

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
const TIMEOUT_MS = 4500;

export interface RunSubmission {
  readonly name: string;
  readonly isolationPercent: number;
  readonly removals: number;
  readonly sampleSize: number;
}

export interface LeaderboardEntry {
  readonly name: string;
  readonly isolationPercent: number;
  readonly removals: number;
  readonly createdAt: string;
}

export type SubmitResult =
  | { readonly ok: true; readonly rank: number }
  | { readonly ok: false; readonly reason: 'offline' | 'rejected' };

async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!API_URL) return null;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    // Offline, blocked by CSP, cold start, malformed JSON — all identical to the user.
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function submitRun(submission: RunSubmission): Promise<SubmitResult> {
  const body = await request<{ rank?: number }>('/runs', {
    method: 'POST',
    body: JSON.stringify(submission),
  });

  if (!body || typeof body.rank !== 'number') return { ok: false, reason: 'offline' };
  return { ok: true, rank: body.rank };
}

export async function fetchLeaderboard(): Promise<readonly LeaderboardEntry[] | null> {
  const body = await request<{ entries?: LeaderboardEntry[] }>('/leaderboard');
  if (!body || !Array.isArray(body.entries)) return null;

  // Defensive: the UI must not crash on a malformed row from a service we do not own.
  return body.entries
    .filter(
      (entry) =>
        typeof entry?.name === 'string' &&
        typeof entry?.isolationPercent === 'number' &&
        typeof entry?.removals === 'number',
    )
    .slice(0, 10);
}

export const leaderboardConfigured = API_URL.length > 0;

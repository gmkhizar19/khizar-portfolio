/**
 * Pure validation and scoring logic for the leaderboard.
 *
 * Split out of `index.mjs` for one reason: this is the part that decides whether a score
 * is real, so it has to be testable without AWS credentials, a network, or the SDK. The
 * handler owns I/O; this file owns rules.
 */

import { createHmac, randomUUID } from 'node:crypto';

export const MAX_NAME = 24;

/**
 * The shipped data asset contains 380 authors. A submission claiming a different sample
 * size did not come from this game, so it is rejected rather than silently stored.
 * Update this constant if `npm run data` ever changes the slice size — the graph test
 * asserts the same figure against `public/data/network.json`.
 */
export const EXPECTED_SAMPLE_SIZE = 380;

/** The game grants eight removals. Anything above that is a fabricated run. */
export const MAX_REMOVALS = 8;

/**
 * Deterministic caller key. HMAC rather than a plain hash so that someone who can guess an
 * IPv4 address still cannot reverse the stored value without the salt.
 */
export function callerKey(requestContext, salt) {
  const address =
    requestContext?.http?.sourceIp ?? requestContext?.identity?.sourceIp ?? 'unknown';
  return createHmac('sha256', salt).update(address).digest('hex').slice(0, 32);
}

/**
 * Validate a run before it is stored.
 * Returns `{ value }` on success or `{ error }` with a message safe to show the user.
 */
export function parseRun(rawBody) {
  let body;
  try {
    body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
  } catch {
    return { error: 'Body is not valid JSON.' };
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Body must be a JSON object.' };
  }

  // Strip control characters first: the name is rendered in other people's browsers, so
  // newlines and bidi overrides are removed rather than trusted to React's escaping.
  const name = String(body.name ?? '')
    .replace(/[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e]/g, '')
    .trim()
    .slice(0, MAX_NAME);
  if (name.length < 1) return { error: 'A display name is required.' };

  const isolationPercent = Number(body.isolationPercent);
  if (!Number.isFinite(isolationPercent) || isolationPercent < 0 || isolationPercent > 100) {
    return { error: 'isolationPercent must be a number between 0 and 100.' };
  }

  const removals = Number(body.removals);
  if (!Number.isInteger(removals) || removals < 0 || removals > MAX_REMOVALS) {
    return { error: `removals must be an integer between 0 and ${MAX_REMOVALS}.` };
  }

  const sampleSize = Number(body.sampleSize);
  if (sampleSize !== EXPECTED_SAMPLE_SIZE) {
    return {
      error: `sampleSize must be ${EXPECTED_SAMPLE_SIZE}; this run did not come from the shipped dataset.`,
    };
  }

  return { value: { name, isolationPercent, removals, sampleSize } };
}

/**
 * Sort key that makes "best first" an ascending range scan.
 *
 * Comparing two runs: higher isolation wins, then fewer removals, then whoever got there
 * first. Encoding that as a string lets DynamoDB do the ordering with no client-side sort
 * and no secondary index. `100 - isolation` is zero-padded to three integer digits so that
 * 100.0 sorts before 99.9 as text instead of after it.
 */
export function scoreKey(isolationPercent, removals, id = randomUUID()) {
  const isolation = Math.min(100, Math.max(0, isolationPercent)).toFixed(1);
  const inverted = (100 - Number(isolation)).toFixed(1).padStart(5, '0');
  const budget = String(removals).padStart(2, '0');
  return `SCORE#${inverted}#${budget}#${id}`;
}

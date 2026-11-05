/**
 * Leaderboard handler for the "Break the Network" game.
 *
 * Two routes, both fronted by an API Gateway HTTP API:
 *   POST /runs        -> { rank }            submit a completed run
 *   GET  /leaderboard -> { entries: [...] }  top ten scores
 *
 * Design rules, in order of importance:
 *
 * 1. **No dependencies.** The nodejs20.x runtime already ships AWS SDK v3, so this file
 *    deploys as-is: no bundler, no layer, no lockfile drift. Only `client-dynamodb` is
 *    imported, and only raw AttributeValue marshalling is used, because that package is
 *    guaranteed present in the runtime while `lib-dynamodb` conveniences are not.
 *
 * 2. **Never store an IP address.** Callers are identified by an HMAC of their address
 *    with a server-side salt. That is enough to rate limit one visitor without holding
 *    personal data, which is the whole point of hashing instead of counting addresses.
 *
 * 3. **Reject impossible scores.** A leaderboard that accepts anything is decoration. The
 *    run must come from the shipped 380-author slice and fit inside the eight-removal
 *    budget, or it is refused.
 *
 * 4. **CORS is not set here.** The HTTP API's CorsConfiguration does it. Adding the headers
 *    here too produces duplicate values, which browsers treat as invalid.
 *
 * The rules themselves live in `validate.mjs` so they can be tested without AWS.
 */

import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { callerKey, parseRun, scoreKey } from './validate.mjs';

const client = new DynamoDBClient({ region: process.env.AWS_REGION });

const TABLE = process.env.TABLE_NAME;
const SALT = process.env.IP_SALT ?? '';
const THROTTLE_PER_HOUR = Number(process.env.THROTTLE_PER_HOUR ?? 5);

const LEADERBOARD_PK = 'LEADERBOARD';
const TOP_N = 10;

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});

/** Rank = how many stored rows beat this one, plus one. */
async function rankOf(sk) {
  let ahead = 0;
  let startKey;
  do {
    const page = await client.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'pk = :pk AND sk < :sk',
        ExpressionAttributeValues: { ':pk': { S: LEADERBOARD_PK }, ':sk': { S: sk } },
        Select: 'COUNT',
        ExclusiveStartKey: startKey,
      }),
    );
    ahead += page.Count ?? 0;
    startKey = page.LastEvaluatedKey;
  } while (startKey);
  return ahead + 1;
}

async function submitRun(event, caller) {
  const parsed = parseRun(event.body);
  if (parsed.error) return json(400, { error: parsed.error });

  const { name, isolationPercent, removals, sampleSize } = parsed.value;

  // Throttle. One conditional ADD per submission: atomic, and it cannot be raced into
  // letting a sixth request through. TTL clears the counter at the top of the next hour.
  const expiresAt = Math.floor(Date.now() / 1000 / 3600) * 3600 + 3600;
  try {
    await client.send(
      new UpdateItemCommand({
        TableName: TABLE,
        Key: { pk: { S: `THROTTLE#${caller}` }, sk: { S: 'HOUR' } },
        UpdateExpression: 'SET expiresAt = :exp ADD #count :one',
        ConditionExpression: 'attribute_not_exists(#count) OR #count < :limit',
        ExpressionAttributeNames: { '#count': 'count' },
        ExpressionAttributeValues: {
          ':one': { N: '1' },
          ':limit': { N: String(THROTTLE_PER_HOUR) },
          ':exp': { N: String(expiresAt) },
        },
      }),
    );
  } catch (error) {
    if (error?.name === 'ConditionalCheckFailedException') {
      return json(429, { error: `Limit of ${THROTTLE_PER_HOUR} runs per hour reached.` });
    }
    throw error;
  }

  const sk = scoreKey(isolationPercent, removals);
  await client.send(
    new PutItemCommand({
      TableName: TABLE,
      Item: {
        pk: { S: LEADERBOARD_PK },
        sk: { S: sk },
        name: { S: name },
        isolationPercent: { N: isolationPercent.toFixed(1) },
        removals: { N: String(removals) },
        sampleSize: { N: String(sampleSize) },
        submittedAt: { S: new Date().toISOString() },
      },
    }),
  );

  return json(200, { rank: await rankOf(sk) });
}

async function readLeaderboard() {
  const page = await client.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': { S: LEADERBOARD_PK } },
      ScanIndexForward: true, // ascending sort key == best score first
      Limit: TOP_N,
    }),
  );

  const entries = (page.Items ?? []).map((item) => ({
    name: item.name?.S ?? 'anonymous',
    isolationPercent: Number(item.isolationPercent?.N ?? 0),
    removals: Number(item.removals?.N ?? 0),
  }));

  return json(200, { entries });
}

export const handler = async (event) => {
  if (!TABLE || !SALT) {
    // Misconfiguration is our bug, not the visitor's. Say so plainly instead of 500-ing in
    // a way that looks like the site is broken.
    return json(503, { error: 'Leaderboard is not configured.' });
  }

  const method = event.requestContext?.http?.method ?? 'GET';
  const path = event.rawPath ?? '/';

  try {
    if (method === 'OPTIONS') return { statusCode: 204, body: '' };
    if (method === 'POST' && path.endsWith('/runs')) {
      return await submitRun(event, callerKey(event.requestContext, SALT));
    }
    if (method === 'GET' && path.endsWith('/leaderboard')) {
      return await readLeaderboard();
    }
    return json(404, { error: 'Not found.' });
  } catch (error) {
    console.error('leaderboard failure', error);
    return json(500, { error: 'Leaderboard unavailable.' });
  }
};

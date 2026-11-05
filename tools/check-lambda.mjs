/**
 * Contract checks for the leaderboard Lambda — part of `npm run verify`.
 *
 * The handler cannot be invoked here (no AWS credentials, no DynamoDB), but its rules can
 * be, and the rules are where the risk lives: an over-permissive validator turns the
 * leaderboard into a text box, and a wrong sort key silently orders the top ten backwards.
 * Both are cheap to check and expensive to discover in production.
 *
 * The frontend contract is also asserted, from `src/lib/api.ts`'s point of view: the shapes
 * below are exactly what the page parses.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { callerKey, parseRun, scoreKey, EXPECTED_SAMPLE_SIZE } from '../infra/lambda/validate.mjs';

let checks = 0;
function check(label, fn) {
  fn();
  checks += 1;
  console.log(`✓ ${label}`);
}

const VALID = { name: 'Khizar', isolationPercent: 53.2, removals: 8, sampleSize: 380 };

console.log('leaderboard contract\n');

check('handler parses as an ES module', () => {
  // Syntax only: imports are not resolved, so this works with no SDK installed locally.
  execFileSync(process.execPath, ['--check', 'infra/lambda/index.mjs'], { stdio: 'pipe' });
});

check('accepts a well-formed run', () => {
  const result = parseRun(JSON.stringify(VALID));
  assert.equal(result.error, undefined);
  assert.deepEqual(result.value, {
    name: 'Khizar',
    isolationPercent: 53.2,
    removals: 8,
    sampleSize: 380,
  });
});

check('accepts an object body as well as a JSON string', () => {
  // API Gateway with payload format 2.0 hands over a string; a direct invoke hands over an
  // object. Supporting both keeps the handler testable without a gateway in front of it.
  assert.equal(parseRun(VALID).error, undefined);
});

check('rejects a body that is not JSON', () => {
  assert.match(parseRun('{nope').error, /not valid JSON/);
});

check('rejects a JSON array', () => {
  assert.match(parseRun('[]').error, /JSON object/);
});

check('rejects a missing name', () => {
  assert.match(parseRun({ ...VALID, name: '   ' }).error, /display name/);
});

check('strips control characters and bidi overrides from the name', () => {
  const result = parseRun({ ...VALID, name: 'Ali\u0000\u202e\u001bce' });
  assert.equal(result.value.name, 'Alice');
});

check('truncates an over-long name to 24 characters', () => {
  const result = parseRun({ ...VALID, name: 'a'.repeat(80) });
  assert.equal(result.value.name.length, 24);
});

check('rejects an isolation outside 0-100', () => {
  assert.match(parseRun({ ...VALID, isolationPercent: 100.1 }).error, /between 0 and 100/);
  assert.match(parseRun({ ...VALID, isolationPercent: -1 }).error, /between 0 and 100/);
  assert.match(parseRun({ ...VALID, isolationPercent: 'lots' }).error, /between 0 and 100/);
});

check('rejects a removal count over the eight-move budget', () => {
  assert.match(parseRun({ ...VALID, removals: 9 }).error, /between 0 and 8/);
  assert.match(parseRun({ ...VALID, removals: 2.5 }).error, /between 0 and 8/);
});

check('rejects a run from a different dataset', () => {
  assert.match(parseRun({ ...VALID, sampleSize: 379 }).error, /shipped dataset/);
  assert.equal(EXPECTED_SAMPLE_SIZE, 380);
});

check('sort key orders by isolation descending', () => {
  const best = scoreKey(90, 8, 'a');
  const worst = scoreKey(20, 8, 'b');
  // Ascending lexical == best first, which is what the leaderboard query relies on.
  assert.ok(best < worst, `${best} should sort before ${worst}`);
});

check('sort key treats 100.0 as better than 99.9', () => {
  // The padding exists for exactly this: as plain text, "100" > "99.9".
  assert.ok(scoreKey(100, 8, 'a') < scoreKey(99.9, 8, 'b'));
});

check('sort key breaks ties by fewer removals', () => {
  assert.ok(scoreKey(50, 3, 'a') < scoreKey(50, 8, 'b'));
});

check('sort key pads single-digit isolation correctly', () => {
  // 0% will never happen, but a bug here would misorder every low score, so it is pinned.
  assert.match(scoreKey(0, 1, 'x'), /^SCORE#100\.0#01#x$/);
});

check('caller key is stable, salted and never reveals the address', () => {
  const context = { http: { sourceIp: '203.0.113.7' } };
  const a = callerKey(context, 'salt-one');
  const b = callerKey(context, 'salt-one');
  const c = callerKey(context, 'salt-two');

  assert.equal(a, b, 'same caller and salt must map to the same key');
  assert.notEqual(a, c, 'a different salt must produce a different key');
  assert.equal(a.length, 32);
  assert.ok(!a.includes('203.0.113'), 'the key must not contain the address');
});

check('caller key falls back when no address is present', () => {
  // A missing sourceIp must not collide with a real caller, and must not throw.
  assert.equal(callerKey({}, 'salt').length, 32);
});

console.log(`\n✓ ${checks} leaderboard contract checks passed`);

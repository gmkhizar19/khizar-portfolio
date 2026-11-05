/**
 * Bundle budget check — part of `npm run verify`.
 *
 * The judged artefact is a single page on a CDN, so weight is a design constraint and not
 * an afterthought. This script fails the build when the payload drifts past the limits the
 * design was built to, instead of letting a stray import quietly double the bundle.
 *
 * Limits are gzip sizes, because that is what the visitor actually downloads.
 */

import { gzipSync } from 'node:zlib';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const ASSETS = join(DIST, 'assets');

const LIMITS = {
  /** Total JavaScript, gzipped, across every chunk. */
  jsTotal: 110 * 1024,
  /** Any single JavaScript chunk, gzipped. */
  jsChunk: 90 * 1024,
  /** All CSS, gzipped (fonts are separate .woff2 files). */
  cssTotal: 40 * 1024,
};

function gzipSize(bytes) {
  return gzipSync(bytes, { level: 9 }).length;
}

function kib(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`;
}

if (!existsSync(ASSETS)) {
  console.error(`No build found at ${ASSETS}. Run \`npm run build\` first.`);
  process.exit(1);
}

const files = readdirSync(ASSETS).sort();
const rows = [];
let jsTotal = 0;
let cssTotal = 0;
let failures = 0;

for (const file of files) {
  const isJs = file.endsWith('.js');
  const isCss = file.endsWith('.css');
  if (!isJs && !isCss) continue;

  const raw = readFileSync(join(ASSETS, file));
  const gz = gzipSize(raw);

  if (isJs) {
    jsTotal += gz;
    if (gz > LIMITS.jsChunk) {
      console.error(`✗ ${file} is ${kib(gz)} gzipped, over the ${kib(LIMITS.jsChunk)} chunk limit.`);
      failures += 1;
    }
  } else {
    cssTotal += gz;
  }

  rows.push({ file, raw: raw.length, gz });
}

console.log('asset'.padEnd(34), 'raw'.padStart(12), 'gzip'.padStart(12));
for (const row of rows) {
  console.log(row.file.padEnd(34), kib(row.raw).padStart(12), kib(row.gz).padStart(12));
}
console.log('-'.repeat(60));
console.log('javascript total'.padEnd(34), ''.padStart(12), kib(jsTotal).padStart(12));
console.log('css total'.padEnd(34), ''.padStart(12), kib(cssTotal).padStart(12));

if (jsTotal > LIMITS.jsTotal) {
  console.error(`✗ JavaScript total ${kib(jsTotal)} exceeds the ${kib(LIMITS.jsTotal)} budget.`);
  failures += 1;
}
if (cssTotal > LIMITS.cssTotal) {
  console.error(`✗ CSS total ${kib(cssTotal)} exceeds the ${kib(LIMITS.cssTotal)} budget.`);
  failures += 1;
}

/**
 * The creative feature must stay in its own chunk. If it ever merges into the entry bundle,
 * a visitor who only wants to read the About section pays for the whole game.
 */
if (!files.some((file) => /^network-.*\.js$/.test(file))) {
  console.error('✗ The game is no longer split into its own `network` chunk.');
  failures += 1;
} else {
  console.log('✓ game split into a separate network chunk');
}

/**
 * No third-party requests: the fonts are self-hosted and nothing else is fetched. A single
 * external stylesheet would both slow the page and break the CSP.
 */
const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const tags = [...html.matchAll(/<(?:script|link)\b[^>]*>/g)].map((match) => match[0]);
const external = tags
  .filter((tag) => /(?:src|href)="https?:\/\//.test(tag))
  // A rel="canonical" link is metadata about this page, not a subresource it loads.
  .filter((tag) => !/rel="canonical"/.test(tag))
  .map((tag) => tag.slice(0, 120));

if (external.length > 0) {
  console.error('✗ index.html loads external resources:', external.join('\n  '));
  failures += 1;
} else {
  console.log('✓ no external subresources in index.html');
}

if (failures > 0) {
  console.error(`\n${failures} budget check(s) failed.`);
  process.exit(1);
}

console.log('\n✓ bundle within budget');

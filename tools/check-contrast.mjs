/**
 * WCAG contrast audit — part of `npm run verify`.
 *
 * A dark theme is where accessibility quietly dies: muted greys look "refined" on a
 * designer's monitor and become unreadable on a laptop at 40% brightness. This script
 * recomputes the real ratios from `theme.css` (so it can never drift from the shipped
 * values) and fails when a text/background pair drops below WCAG AA.
 *
 * AA thresholds: 4.5:1 for normal text, 3:1 for large text (>= 24px or >= 18.66px bold).
 * The pairs below are all body-size text, so 4.5:1 is the bar.
 */

import { readFileSync } from 'node:fs';

const THEME = 'src/styles/theme.css';
const AA_NORMAL = 4.5;

/** Resolve CSS custom properties declared in theme.css into a name -> hex map. */
function readTokens(path) {
  const css = readFileSync(path, 'utf8');
  const tokens = new Map();
  for (const match of css.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    tokens.set(match[1], match[2].toLowerCase());
  }
  return tokens;
}

function channels(hex) {
  let value = hex.replace('#', '');
  if (value.length === 3) {
    value = value
      .split('')
      .map((character) => character + character)
      .join('');
  }
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255);
}

/** sRGB relative luminance, per WCAG 2.x definition. */
function luminance(hex) {
  const [r, g, b] = channels(hex).map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const tokens = readTokens(THEME);
const backgrounds = ['ink-950', 'ink-900'];

/**
 * Every text token that is actually painted on a surface. `violet` is deliberately absent:
 * it is used for glows and shadows, never for a glyph, so holding it to a text threshold
 * would be a false failure. `muted` is absent for the same reason — it is a hairline colour.
 */
const foregrounds = [
  'bone-50',
  'bone-100',
  'bone-200',
  'bone-300',
  'bone-400',
  'bone-500',
  'signal',
  'signal-soft',
  'live',
  'alert',
];

let failures = 0;
console.log(`${'text'.padEnd(14)}${'on'.padEnd(10)}ratio`.padEnd(30) + 'verdict');
console.log('-'.repeat(50));

for (const foreground of foregrounds) {
  const fg = tokens.get(foreground);
  if (!fg) {
    console.error(`✗ token --${foreground} is missing from ${THEME}`);
    failures += 1;
    continue;
  }

  for (const background of backgrounds) {
    const bg = tokens.get(background);
    if (!bg) {
      console.error(`✗ token --${background} is missing from ${THEME}`);
      failures += 1;
      continue;
    }

    const ratio = contrast(fg, bg);
    const pass = ratio >= AA_NORMAL;
    if (!pass) failures += 1;

    console.log(
      `${foreground.padEnd(14)}${background.padEnd(10)}${ratio.toFixed(2).padStart(6)}:1`.padEnd(30) +
        (pass ? '✓ AA' : '✗ below AA 4.5'),
    );
  }
}

if (failures > 0) {
  console.error(`\n${failures} contrast pair(s) fail WCAG AA.`);
  process.exit(1);
}

console.log('\n✓ every text/surface pair meets WCAG AA (4.5:1)');

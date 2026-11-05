/**
 * Builds `public/og.png` — the 1200x630 social preview.
 *
 * The constellation in the image is the actual hero subgraph from
 * `src/generated/hero.ts`, not a decorative scribble, so the preview shows the same
 * network a visitor lands on. Fonts are inlined as data URIs from the Fontsource packages
 * so the render matches the site instead of falling back to Segoe UI.
 *
 * Run with: node tools/make-og.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const CHROME =
  process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

/** Pull the two generated arrays straight out of the TS source; they are valid JSON. */
function readHero() {
  const source = readFileSync('src/generated/hero.ts', 'utf8');

  const nodesMatch = source.match(/export const heroNodes[^=]*=\s*(\[[\s\S]*?\]);/);
  const edgesMatch = source.match(/export const heroEdges[^=]*=\s*(\[[\s\S]*?\]);/);
  if (!nodesMatch || !edgesMatch) {
    throw new Error('Could not read heroNodes/heroEdges from src/generated/hero.ts');
  }

  return {
    nodes: JSON.parse(nodesMatch[1]),
    edges: JSON.parse(edgesMatch[1]),
  };
}

function fontDataUri(packagePath) {
  const bytes = readFileSync(`node_modules/${packagePath}`);
  return `data:font/woff2;base64,${bytes.toString('base64')}`;
}

const { nodes, edges } = readHero();

const spaceGrotesk = fontDataUri(
  '@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2',
);
const inter = fontDataUri('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2');
const jetbrains = fontDataUri(
  '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2',
);

/**
 * The hero coordinates live in a 0-100 square. Map them into pixel space once, so circles
 * stay circular (a non-square viewBox with preserveAspectRatio="none" would stretch them
 * into ellipses) and so the network can bleed past the right edge deliberately.
 */
const GRAPH = { size: 760, x: 500, y: -70 };

const project = (point) => ({
  x: GRAPH.x + (point.x / 100) * GRAPH.size,
  y: GRAPH.y + (point.y / 100) * GRAPH.size,
});

const lines = edges
  .map(([from, to]) => {
    const a = nodes[from];
    const b = nodes[to];
    if (!a || !b) return '';
    const p = project(a);
    const q = project(b);
    return `<line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${q.x.toFixed(1)}" y2="${q.y.toFixed(1)}" />`;
  })
  .join('');

const dots = nodes
  .map((node, index) => {
    const { x, y } = project(node);
    const radius = (1.6 + node.r * 1.9).toFixed(2);
    // A few nodes are lime: the articulation points a player is hunting for.
    const fill = index % 11 === 0 ? '#d9ff66' : index % 5 === 0 ? '#9fe0d2' : '#cfcde4';
    const opacity = index % 11 === 0 ? 0.95 : 0.62;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius}" fill="${fill}" opacity="${opacity}" />`;
  })
  .join('');

const html = `<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  @font-face { font-family: 'Space Grotesk'; src: url(${spaceGrotesk}) format('woff2-variations'); font-weight: 300 700; }
  @font-face { font-family: 'Inter'; src: url(${inter}) format('woff2-variations'); font-weight: 100 900; }
  @font-face { font-family: 'JetBrains Mono'; src: url(${jetbrains}) format('woff2-variations'); font-weight: 100 800; }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body {
    background: #111118;
    color: #f5f4fa;
    font-family: 'Inter', sans-serif;
    position: relative;
  }

  /* Violet bloom behind the network, and a second one bottom-left for depth. */
  .glow-a { position: absolute; width: 900px; height: 900px; right: -260px; top: -330px;
    background: radial-gradient(circle, rgba(112,71,235,0.42), rgba(112,71,235,0) 62%); }
  .glow-b { position: absolute; width: 620px; height: 620px; left: -280px; bottom: -330px;
    background: radial-gradient(circle, rgba(159,224,210,0.12), rgba(159,224,210,0) 66%); }

  .grid { position: absolute; inset: 0; opacity: 0.5; }
  .grid span { position: absolute; width: 1px; height: 1px; background: rgba(245,244,250,0.22); }

  .graph { position: absolute; inset: 0; }
  .graph line { stroke: rgba(198,194,224,0.20); stroke-width: 0.6; }

  /* Fade the network out towards the text so the two never compete. */
  .fade { position: absolute; inset: 0;
    background: linear-gradient(90deg, #111118 0%, #111118 42%, rgba(17,17,24,0.65) 62%, rgba(17,17,24,0) 82%); }

  .content { position: absolute; left: 72px; top: 78px; width: 620px; }

  .eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 13px; letter-spacing: 0.22em;
    text-transform: uppercase; color: #d9ff66; display: flex; align-items: center; gap: 12px; }
  .eyebrow::before { content: ''; width: 30px; height: 1px; background: #d9ff66; }

  h1 { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 62px;
    line-height: 1.02; letter-spacing: -0.035em; margin-top: 26px; }
  h1 em { font-style: normal; color: #d9ff66; }

  .role { margin-top: 20px; font-size: 19px; line-height: 1.5; color: #d3d2de; max-width: 26ch;
    font-weight: 400; letter-spacing: -0.01em; }

  .stats { position: absolute; left: 72px; bottom: 74px; display: flex; gap: 46px; }
  .stat b { display: block; font-family: 'Space Grotesk', sans-serif; font-size: 30px;
    font-weight: 600; letter-spacing: -0.02em; color: #f5f4fa; }
  .stat span { display: block; margin-top: 4px; font-family: 'JetBrains Mono', monospace;
    font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #85849b; }

  .rule { position: absolute; left: 72px; right: 72px; bottom: 118px; height: 1px;
    background: linear-gradient(90deg, rgba(245,244,250,0.18), rgba(245,244,250,0)); }

  .foot { position: absolute; right: 72px; bottom: 74px; text-align: right;
    font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #85849b; letter-spacing: 0.06em; }
  .foot strong { color: #d9ff66; font-weight: 500; }

  .provenance { position: absolute; right: 64px; top: 64px; font-family: 'JetBrains Mono', monospace;
    font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(245,244,250,0.55);
    background: rgba(17,17,24,0.7); border: 1px solid rgba(245,244,250,0.12);
    border-radius: 999px; padding: 6px 12px; }
</style></head>
<body>
  <div class="glow-a"></div>
  <div class="glow-b"></div>
  <div class="grid">${Array.from({ length: 44 }, (_, row) =>
    Array.from({ length: 84 }, (_, column) =>
      `<span style="left:${column * 14.4}px;top:${row * 14.4}px"></span>`,
    ).join(''),
  ).join('')}</div>

  <svg class="graph" viewBox="0 0 1200 630">${lines}${dots}</svg>
  <div class="fade"></div>

  <div class="provenance">Real data · OpenAlex CC0</div>

  <div class="content">
    <div class="eyebrow">DevOps &amp; Cloud Engineer</div>
    <h1>Ghulam<br />Muhammad<br /><em>Khizar</em></h1>
    <p class="role">I build systems, then build the pipeline that keeps them running.</p>
  </div>

  <div class="rule"></div>
  <div class="stats">
    <div class="stat"><b>42,774</b><span>network records</span></div>
    <div class="stat"><b>3</b><span>specialisations</span></div>
    <div class="stat"><b>20</b><span>courses</span></div>
  </div>
</body></html>`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--font-render-hinting=none'],
  defaultViewport: { width: 1200, height: 630, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
// One frame of settle so font metrics are applied before pixels are taken.
await new Promise((resolve) => setTimeout(resolve, 350));

const buffer = await page.screenshot({ type: 'png' });
await browser.close();

writeFileSync('public/og.png', buffer);
console.log(`saved public/og.png (${(buffer.length / 1024).toFixed(1)} kB)`);

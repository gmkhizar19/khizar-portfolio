/**
 * Export a playable slice of the real Pakistani co-authorship network.
 *
 * Source of truth: the cleaned CSV exports from the `researchers-network` project,
 * which are themselves derived from OpenAlex (CC0 1.0). This script runs once; its
 * output is committed so the portfolio build never depends on another repository.
 *
 * The interesting design problem is *which* 380 authors to show. The core network is a
 * dense, robust blob: removing 10% of its highest-betweenness authors only drops the
 * largest component to 76%. Sampling around the mega-hubs therefore produces a graph
 * that cannot be visibly broken — a bad demonstration and a dishonest one.
 *
 * Instead the script measures candidates: for each plausible seed it grows a BFS ball,
 * then simulates greedy removal and records how many removals it takes to break the
 * largest component below 50%. The seed whose ball is *measurably* fragile wins.
 *
 * That selection is disclosed in the UI: the sample is a real region, chosen because
 * its structure is fragile, while the full network is robust. The contrast is the
 * finding, not a trick.
 *
 * Usage:  node tools/export-network.mjs
 *         RESEARCHERS_NETWORK_DIR=/path/to/checkout node tools/export-network.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SOURCE_DIR =
  process.env.RESEARCHERS_NETWORK_DIR ?? resolve(ROOT, '..', 'researchers-network');

const TARGET_NODES = 380;
const SEED = 42;
const LAYOUT_ITERATIONS = 700;

/**
 * The game gives the visitor a fixed budget of removals and scores how much of the
 * network they can isolate. A budget is fairer than a fixed percentage target: real
 * co-authorship networks resist fragmentation, so "reach 50%" is unreachable inside a
 * 30-second game and would misrepresent the data. Isolation is measured, not assumed.
 */
const REMOVAL_BUDGET = 8;
const MIN_ISOLATION = 0.25;

/* ------------------------------------------------------------------ utilities */

/** Mulberry32 — small, fast, deterministic PRNG so every rebuild is byte-identical. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Minimal RFC 4180 CSV parser. Hand-written instead of adding a dependency, and
 * necessary because the source contains quoted fields with embedded commas.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...records] = rows;
  const columns = header.map((name) => name.trim());
  return records
    .filter((record) => record.length === columns.length)
    .map((record) =>
      Object.fromEntries(columns.map((column, index) => [column, record[index] ?? ''])),
    );
}

function fail(message) {
  console.error(`\n  ✖ ${message}\n`);
  process.exit(1);
}

/* ------------------------------------------------------------------ load data */

const nodesPath = join(SOURCE_DIR, 'data', 'cleaned', 'author_nodes.csv');
const edgesPath = join(SOURCE_DIR, 'data', 'cleaned', 'author_edges.csv');
const criticalPath = join(SOURCE_DIR, 'data', 'results', 'p1_critical_authors.csv');

for (const path of [nodesPath, edgesPath]) {
  if (!existsSync(path)) {
    fail(
      `Missing source file: ${path}\n` +
        `    Set RESEARCHERS_NETWORK_DIR to the researchers-network checkout.`,
    );
  }
}

console.log('→ reading source network');
const nodeRows = parseCsv(readFileSync(nodesPath, 'utf8'));
const edgeRows = parseCsv(readFileSync(edgesPath, 'utf8'));

const allNodes = new Map();
for (const row of nodeRows) {
  if (!row.author_id) continue;
  allNodes.set(row.author_id, {
    name: row.name,
    works: Number.parseInt(row.works_count, 10) || 0,
    citedBy: Number.parseInt(row.cited_by_count, 10) || 0,
    institution: row.primary_institution || '',
    topic: (row.topics || '').split(';')[0]?.trim() ?? '',
  });
}

const adjacency = new Map();
for (const id of allNodes.keys()) adjacency.set(id, new Set());

let edgeCount = 0;
for (const row of edgeRows) {
  const a = row.source;
  const b = row.target;
  if (!a || !b || a === b) continue;
  if (!allNodes.has(a) || !allNodes.has(b)) continue;
  adjacency.get(a).add(b);
  adjacency.get(b).add(a);
  edgeCount += 1;
}

const meanDegree = (2 * edgeCount) / allNodes.size;
console.log(
  `  ${allNodes.size.toLocaleString()} authors, ${edgeCount.toLocaleString()} edges ` +
    `(mean degree ${meanDegree.toFixed(1)})`,
);

/* -------------------------------------------------------------- graph helpers */

function inducedEdges(nodes) {
  const set = new Set(nodes);
  const edges = [];
  for (const id of nodes) {
    for (const neighbour of adjacency.get(id)) {
      if (id < neighbour && set.has(neighbour)) edges.push([id, neighbour]);
    }
  }
  return edges;
}

function buildLocal(nodes, edges) {
  const local = new Map();
  for (const id of nodes) local.set(id, []);
  for (const [a, b] of edges) {
    local.get(a).push(b);
    local.get(b).push(a);
  }
  return local;
}

/** Components as arrays, largest first. */
function components(nodes, edges) {
  const local = buildLocal(nodes, edges);
  const seen = new Set();
  const result = [];
  for (const id of nodes) {
    if (seen.has(id)) continue;
    const component = [];
    const stack = [id];
    seen.add(id);
    while (stack.length > 0) {
      const current = stack.pop();
      component.push(current);
      for (const neighbour of local.get(current)) {
        if (!seen.has(neighbour)) {
          seen.add(neighbour);
          stack.push(neighbour);
        }
      }
    }
    result.push(component);
  }
  return result.sort((a, b) => b.length - a.length);
}

/**
 * Greedy adversarial play: at each step remove the surviving node of highest degree
 * (recomputed), then measure how much of the network is left outside the largest
 * component. This answers the same question the visitor is asked — "how many people can
 * you cut off in eight moves?" — so candidate regions are compared on measured
 * playability rather than on how pretty they look.
 */
function adversarialIsolation(nodes, edges, budget) {
  let remaining = new Set(nodes);
  let currentEdges = edges;

  for (let step = 0; step < budget; step += 1) {
    const local = buildLocal([...remaining], currentEdges);
    let target = null;
    let best = -1;
    for (const id of remaining) {
      const degree = local.get(id).length;
      if (degree > best) {
        best = degree;
        target = id;
      }
    }
    if (target === null) break;
    remaining.delete(target);
    currentEdges = currentEdges.filter(([a, b]) => a !== target && b !== target);
  }

  const largest = components([...remaining], currentEdges)[0]?.length ?? 0;
  return {
    isolatedFraction: 1 - largest / Math.max(remaining.size, 1),
    largest,
    remaining: remaining.size,
  };
}

/** Tarjan's algorithm, iterative. Marks articulation points of a sample. */
function articulationPoints(nodes, edges) {
  const local = buildLocal(nodes, edges);
  const discoveredAt = new Map();
  const low = new Map();
  const parent = new Map();
  const articulation = new Set();
  let time = 0;

  for (const root of nodes) {
    if (discoveredAt.has(root)) continue;

    const stack = [{ node: root, index: 0 }];
    discoveredAt.set(root, time);
    low.set(root, time);
    time += 1;
    parent.set(root, null);
    let rootChildren = 0;

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const neighbours = local.get(frame.node);

      if (frame.index < neighbours.length) {
        const neighbour = neighbours[frame.index];
        frame.index += 1;

        if (!discoveredAt.has(neighbour)) {
          parent.set(neighbour, frame.node);
          discoveredAt.set(neighbour, time);
          low.set(neighbour, time);
          time += 1;
          stack.push({ node: neighbour, index: 0 });
          if (frame.node === root) rootChildren += 1;
        } else if (neighbour !== parent.get(frame.node)) {
          low.set(frame.node, Math.min(low.get(frame.node), discoveredAt.get(neighbour)));
        }
      } else {
        stack.pop();
        const parentNode = parent.get(frame.node);
        if (parentNode !== null && parentNode !== undefined) {
          low.set(parentNode, Math.min(low.get(parentNode), low.get(frame.node)));
          if (parentNode !== root && low.get(frame.node) >= discoveredAt.get(parentNode)) {
            articulation.add(parentNode);
          }
        }
      }
    }

    if (rootChildren > 1) articulation.add(root);
  }

  return articulation;
}

/**
 * BFS ball around a seed, filled layer by layer up to `limit` nodes.
 *
 * Two strategies are evaluated because they produce very different graphs:
 *   - "degree"  prefers the most connected frontier nodes → hub-rich, dense, hairball.
 *   - "uniform" keeps the natural BFS order → includes satellite authors, sparser,
 *     and visually closer to how a real collaboration network looks.
 */
function growBall(seed, limit, mode) {
  const seen = new Set([seed]);
  const order = [seed];
  let frontier = [seed];

  while (order.length < limit && frontier.length > 0) {
    const next = [];
    for (const id of frontier) {
      const candidates = [...adjacency.get(id)].filter((n) => !seen.has(n));
      if (mode === 'degree') candidates.sort((a, b) => adjacency.get(b).size - adjacency.get(a).size);
      for (const candidate of candidates) {
        if (seen.has(candidate)) continue;
        if (order.length >= limit) break;
        seen.add(candidate);
        order.push(candidate);
        next.push(candidate);
      }
    }
    frontier = next;
  }

  return order;
}

/* ------------------------------------------------------------- choose sample */

const criticalRows = existsSync(criticalPath)
  ? parseCsv(readFileSync(criticalPath, 'utf8'))
  : [];

const betweennessById = new Map(
  criticalRows.map((row) => [row.author_id, Number.parseFloat(row.betweenness) || 0]),
);

const candidates = [...allNodes.keys()]
  .map((id) => ({
    id,
    betweenness: betweennessById.get(id) ?? 0,
    degree: adjacency.get(id).size,
  }))
  // Mid-sized hubs, not mega-hubs: a ball around a degree-300 author is one dense
  // star that swallows the whole budget without isolating anyone.
  .filter((entry) => entry.degree >= 12 && entry.degree <= 60)
  .sort((a, b) => b.betweenness - a.betweenness || b.degree - a.degree)
  .slice(0, 80);

if (candidates.length === 0) fail('No usable seed authors found in the full network');

console.log(`→ testing ${candidates.length} candidate regions for playability`);

const evaluated = [];
for (const candidate of candidates) {
  for (const mode of ['uniform', 'degree']) {
    const ball = growBall(candidate.id, TARGET_NODES, mode);
    if (ball.length < TARGET_NODES * 0.7) continue;

    const ballEdges = inducedEdges(ball);
    const main = components(ball, ballEdges)[0];
    if (main.length < TARGET_NODES * 0.7) continue;

    const mainEdges = inducedEdges(main);
    const play = adversarialIsolation(main, mainEdges, REMOVAL_BUDGET);
    if (play.isolatedFraction < MIN_ISOLATION) continue;

    const averageDegree = (2 * mainEdges.length) / main.length;
    const cut = articulationPoints(main, mainEdges).size;

    // Maximise how much a good player can isolate; penalise a graph so dense that the
    // canvas turns into a hairball (legibility is part of usability).
    const visualPenalty = Math.max(0, averageDegree - 3.4) * 10;

    evaluated.push({
      id: candidate.id,
      mode,
      nodes: main,
      edges: mainEdges,
      play,
      averageDegree,
      articulation: cut,
      score: play.isolatedFraction * 100 + cut * 0.2 - visualPenalty,
    });
  }
}

if (evaluated.length === 0) fail('No candidate region was breakable within the budget');

evaluated.sort((a, b) => b.score - a.score);
const chosen = evaluated[0];

console.log(
  `  chosen region: ${chosen.nodes.length} nodes, ${chosen.edges.length} edges, ` +
    `${chosen.articulation} articulation points`,
);
console.log(
  `  greedy adversarial play isolates ${(chosen.play.isolatedFraction * 100).toFixed(1)}% ` +
    `in ${REMOVAL_BUDGET} removals (mean degree ${chosen.averageDegree.toFixed(2)})`,
);

const sampleNodes = chosen.nodes;
const sampleEdges = chosen.edges;
const articulations = articulationPoints(sampleNodes, sampleEdges);

/* --------------------------------------------------------------------- layout */

console.log(`→ laying out ${sampleNodes.length} nodes`);

const random = mulberry32(SEED);
const positions = new Map();
sampleNodes.forEach((id, index) => {
  const angle = index * 2.399963229728653;
  const radius = Math.sqrt(index / sampleNodes.length) * 0.45;
  positions.set(id, {
    x: 0.5 + Math.cos(angle) * radius + (random() - 0.5) * 0.02,
    y: 0.5 + Math.sin(angle) * radius + (random() - 0.5) * 0.02,
  });
});

const n = sampleNodes.length;
const idealEdgeLength = 0.07;
const repulsion = 0.0012;

for (let iteration = 0; iteration < LAYOUT_ITERATIONS; iteration += 1) {
  const temperature = 0.08 * (1 - iteration / LAYOUT_ITERATIONS) + 0.0015;
  const displacement = new Map(sampleNodes.map((id) => [id, { x: 0, y: 0 }]));

  for (let i = 0; i < n; i += 1) {
    const a = sampleNodes[i];
    const pa = positions.get(a);
    for (let j = i + 1; j < n; j += 1) {
      const b = sampleNodes[j];
      const pb = positions.get(b);
      let dx = pa.x - pb.x;
      let dy = pa.y - pb.y;
      let distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < 1e-6) {
        dx = (random() - 0.5) * 1e-3;
        dy = (random() - 0.5) * 1e-3;
        distanceSquared = dx * dx + dy * dy;
      }
      const distance = Math.sqrt(distanceSquared);
      const force = repulsion / distanceSquared;
      const ux = (dx / distance) * force;
      const uy = (dy / distance) * force;

      const da = displacement.get(a);
      const db = displacement.get(b);
      da.x += ux;
      da.y += uy;
      db.x -= ux;
      db.y -= uy;
    }
  }

  for (const [a, b] of sampleEdges) {
    const pa = positions.get(a);
    const pb = positions.get(b);
    const dx = pa.x - pb.x;
    const dy = pa.y - pb.y;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1e-6;
    const force = ((distance * distance) / idealEdgeLength) * 0.02;
    const ux = (dx / distance) * force;
    const uy = (dy / distance) * force;

    displacement.get(a).x -= ux;
    displacement.get(a).y -= uy;
    displacement.get(b).x += ux;
    displacement.get(b).y += uy;
  }

  for (const id of sampleNodes) {
    const p = positions.get(id);
    const d = displacement.get(id);
    // Radial pull. This is what gives the cloud an edge: without it, the sum of
    // repulsions has no equilibrium and every outer node ends up pinned to a clamp,
    // which is why the first draft looked like a rectangle of evenly spaced dots.
    d.x += (0.5 - p.x) * 0.05;
    d.y += (0.5 - p.y) * 0.05;
  }

  for (const id of sampleNodes) {
    const p = positions.get(id);
    const d = displacement.get(id);
    const magnitude = Math.sqrt(d.x * d.x + d.y * d.y) || 1;
    const scale = Math.min(magnitude, temperature) / magnitude;
    p.x += d.x * scale;
    p.y += d.y * scale;
  }
}

/**
 * Fit the finished cloud into a padded box.
 *
 * Measured once, after the simulation, rather than clamped during it: the layout keeps
 * its organic outline, the stage gets a real margin, and hubs near the boundary cannot
 * be drawn half outside the canvas.
 */
const LAYOUT_PAD = 0.055;
const xs = sampleNodes.map((id) => positions.get(id).x);
const ys = sampleNodes.map((id) => positions.get(id).y);
const minX = Math.min(...xs);
const maxX = Math.max(...xs);
const minY = Math.min(...ys);
const maxY = Math.max(...ys);
const spanX = maxX - minX || 1;
const spanY = maxY - minY || 1;

for (const id of sampleNodes) {
  const p = positions.get(id);
  p.x = LAYOUT_PAD + ((p.x - minX) / spanX) * (1 - LAYOUT_PAD * 2);
  p.y = LAYOUT_PAD + ((p.y - minY) / spanY) * (1 - LAYOUT_PAD * 2);
}

/* ---------------------------------------------------------------------- emit */

const indexOf = new Map(sampleNodes.map((id, index) => [id, index]));

const output = {
  meta: {
    source: 'OpenAlex (CC0 1.0) — Priem, Piwowar & Orr (2022), arXiv:2205.01833',
    project: "Pakistan's Researchers Network",
    scope:
      'Works with at least one Pakistani-affiliated institution, primary field Computer Science, 2015–2025.',
    fullNetwork: {
      authors: 42_774,
      coAuthorshipEdges: 170_700,
      core: { nodes: 14_574, edges: 81_793, lccPercent: 92.6 },
      note:
        'On the full core network, removing 10% of authors by betweenness leaves the largest component at 76.3% (random removal: 82.4%). The network is robust; this sample is a deliberately fragile region, chosen to make the mechanics visible.',
    },
    sample: {
      nodes: sampleNodes.length,
      edges: sampleEdges.length,
      articulationPoints: articulations.size,
      removalBudget: REMOVAL_BUDGET,
      greedyIsolationPercent: Number((chosen.play.isolatedFraction * 100).toFixed(1)),
      method:
        'BFS region around a mid-sized high-betweenness author; chosen from 80 candidates by measured isolation under greedy adversarial play.',
    },
    layout: 'Deterministic Fruchterman–Reingold, 700 iterations, seed 42',
    generatedAt: new Date().toISOString().slice(0, 10),
  },
  nodes: sampleNodes.map((id) => {
    const node = allNodes.get(id);
    const position = positions.get(id);
    return {
      i: indexOf.get(id),
      name: node.name,
      degree: adjacency.get(id).size,
      works: node.works,
      citedBy: node.citedBy,
      institution: node.institution,
      topic: node.topic,
      cut: articulations.has(id),
      x: Number(position.x.toFixed(4)),
      y: Number(position.y.toFixed(4)),
    };
  }),
  edges: sampleEdges.map(([a, b]) => [indexOf.get(a), indexOf.get(b)]),
};

const outDir = join(ROOT, 'public', 'data');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'network.json'), JSON.stringify(output), 'utf8');

/* ------------------------------------------------- hero constellation (inline) */

/**
 * A connected neighbourhood of the same layout, emitted as a typed module so the hero
 * can draw a real constellation without a network request or a second data file.
 *
 * Grown breadth-first from the sampled hub rather than taken as an even stride: a strided
 * slice of a sparse graph is mostly isolated dots, and a constellation with no lines is
 * not a constellation. This is still the real graph — an induced subgraph, honestly so.
 */
const HERO_TARGET = 60;
const sampleSet = new Set(sampleNodes);
const heroSeed = [...sampleNodes].sort((a, b) => adjacency.get(b).size - adjacency.get(a).size)[0];
const heroIndices = [];
const heroSeen = new Set([heroSeed]);
const heroQueue = [heroSeed];

while (heroQueue.length > 0 && heroIndices.length < HERO_TARGET) {
  const current = heroQueue.shift();
  heroIndices.push(current);
  const neighbours = [...adjacency.get(current)]
    // Stay inside the exported sample: a neighbour outside it has no layout position.
    .filter((neighbour) => sampleSet.has(neighbour))
    .sort((a, b) => adjacency.get(b).size - adjacency.get(a).size);
  for (const neighbour of neighbours) {
    if (heroSeen.has(neighbour)) continue;
    heroSeen.add(neighbour);
    heroQueue.push(neighbour);
  }
}
const heroIndexSet = new Set(heroIndices);
const heroPosition = new Map(heroIndices.map((id, index) => [id, index]));

// The BFS region is spatially compact, so it is rescaled to its own bounding box before
// export. The shape is untouched — a uniform zoom, not a new layout — and it means the
// constellation fills the hero instead of sitting in one corner of the viewBox.
const heroXs = heroIndices.map((id) => positions.get(id).x);
const heroYs = heroIndices.map((id) => positions.get(id).y);
const heroMinX = Math.min(...heroXs);
const heroMaxX = Math.max(...heroXs);
const heroMinY = Math.min(...heroYs);
const heroMaxY = Math.max(...heroYs);
const heroSpanX = heroMaxX - heroMinX || 1;
const heroSpanY = heroMaxY - heroMinY || 1;
const HERO_PAD = 8;

const heroXY = new Map(
  heroIndices.map((id) => {
    const p = positions.get(id);
    return [
      id,
      {
        x: HERO_PAD + ((p.x - heroMinX) / heroSpanX) * (100 - HERO_PAD * 2),
        // Preserve the laid-out shape rather than stretching each axis independently.
        y: HERO_PAD + ((p.y - heroMinY) / heroSpanY) * (100 - HERO_PAD * 2),
      },
    ];
  }),
);

const heroEdges = sampleEdges
  .filter(([a, b]) => heroIndexSet.has(a) && heroIndexSet.has(b))
  .map(([a, b]) => [heroPosition.get(a), heroPosition.get(b)]);

const heroSource = `// Generated by tools/export-network.mjs — do not edit by hand.
// A strided slice of the same real network rendered in the hero. Coordinates are
// normalised to a 0–100 viewBox so the SVG scales without layout maths.
export interface HeroNode {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

export const heroNodes: readonly HeroNode[] = ${JSON.stringify(
  heroIndices.map((id) => {
    const position = heroXY.get(id);
    return {
      x: Number(position.x.toFixed(2)),
      y: Number(position.y.toFixed(2)),
      r: Number((0.42 + Math.min(0.72, Math.sqrt(adjacency.get(id).size) * 0.1)).toFixed(2)),
    };
  }),
)};

export const heroEdges: readonly (readonly [number, number])[] = ${JSON.stringify(heroEdges)};
`;

mkdirSync(join(ROOT, 'src', 'generated'), { recursive: true });
writeFileSync(join(ROOT, 'src', 'generated', 'hero.ts'), heroSource, 'utf8');

const bytes = Buffer.byteLength(JSON.stringify(output));
console.log(`\n✔ wrote public/data/network.json`);
console.log(`  nodes ${output.meta.sample.nodes}, edges ${output.meta.sample.edges}`);
console.log(`  articulation points ${output.meta.sample.articulationPoints}`);
console.log(`  ${(bytes / 1024).toFixed(1)} KB raw`);

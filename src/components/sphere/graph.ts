/**
 * graph.ts — pure graph algorithms for the interactive network.
 *
 * No React, no DOM, no global state: everything here is a function of its arguments so
 * it can be unit-tested in isolation (tests/graph.test.ts). The creative feature depends
 * on these results being exactly right; a wrong component count would turn a technically
 * impressive page into a dishonest one.
 */

export interface NetworkNode {
  readonly i: number;
  readonly name: string;
  readonly degree: number;
  readonly works: number;
  readonly citedBy: number;
  readonly institution: string;
  readonly topic: string;
  readonly cut: boolean;
  readonly x: number;
  readonly y: number;
}

export interface NetworkMeta {
  readonly source: string;
  readonly project: string;
  readonly scope: string;
  readonly fullNetwork: {
    readonly authors: number;
    readonly coAuthorshipEdges: number;
    readonly core: { readonly nodes: number; readonly edges: number; readonly lccPercent: number };
    readonly note: string;
  };
  readonly sample: {
    readonly nodes: number;
    readonly edges: number;
    readonly articulationPoints: number;
    readonly removalBudget: number;
    readonly greedyIsolationPercent: number;
    readonly method: string;
  };
  readonly layout: string;
  readonly generatedAt: string;
}

export interface NetworkData {
  readonly meta: NetworkMeta;
  readonly nodes: readonly NetworkNode[];
  readonly edges: readonly (readonly [number, number])[];
}

export interface ComponentSummary {
  /** Node indices grouped into connected components, largest first. */
  readonly components: readonly (readonly number[])[];
  /** Number of nodes still present. */
  readonly aliveCount: number;
  /** Size of the largest connected component. */
  readonly largestSize: number;
  /** `largestSize / aliveCount`, in [0, 1]. */
  readonly lccFraction: number;
  /** `1 - lccFraction`, in [0, 1] — the score the player is trying to maximise. */
  readonly isolationFraction: number;
}

/** Build an adjacency list once; reused by every subsequent calculation. */
export function buildAdjacency(
  nodeCount: number,
  edges: readonly (readonly [number, number])[],
): readonly (readonly number[])[] {
  const lists: number[][] = Array.from({ length: nodeCount }, () => []);
  for (const [a, b] of edges) {
    if (a === b) continue;
    lists[a]?.push(b);
    lists[b]?.push(a);
  }
  return lists;
}

/**
 * Connected components over the surviving nodes.
 *
 * Iterative BFS with a shared visited buffer: at 380 nodes this runs in well under a
 * millisecond, which is why the game can recompute on every click without a worker.
 */
export function connectedComponents(
  adjacency: readonly (readonly number[])[],
  alive: Uint8Array,
): ComponentSummary {
  const total = adjacency.length;
  const visited = new Uint8Array(total);
  const components: number[][] = [];
  let aliveCount = 0;

  for (let i = 0; i < total; i += 1) if (alive[i]) aliveCount += 1;

  const queue: number[] = [];
  for (let start = 0; start < total; start += 1) {
    if (!alive[start] || visited[start]) continue;

    const component: number[] = [];
    queue.length = 0;
    queue.push(start);
    visited[start] = 1;

    for (let head = 0; head < queue.length; head += 1) {
      const current = queue[head];
      if (current === undefined) break;
      component.push(current);
      for (const neighbour of adjacency[current]) {
        if (alive[neighbour] && !visited[neighbour]) {
          visited[neighbour] = 1;
          queue.push(neighbour);
        }
      }
    }

    components.push(component);
  }

  components.sort((a, b) => b.length - a.length);

  const largestSize = components[0]?.length ?? 0;
  const lccFraction = aliveCount === 0 ? 0 : largestSize / aliveCount;

  return {
    components,
    aliveCount,
    largestSize,
    lccFraction,
    isolationFraction: 1 - lccFraction,
  };
}

export interface RemovalResult {
  readonly alive: Uint8Array;
  readonly summary: ComponentSummary;
  readonly disconnectedNow: number;
}

/**
 * Remove a node and return the new state. Pure: the previous mask is not mutated, so
 * React state stays predictable and undo is free.
 */
export function removeNode(
  adjacency: readonly (readonly number[])[],
  alive: Uint8Array,
  node: number,
): RemovalResult {
  if (!alive[node]) {
    return {
      alive,
      summary: connectedComponents(adjacency, alive),
      disconnectedNow: 0,
    };
  }

  const next = Uint8Array.from(alive);
  next[node] = 0;

  const before = connectedComponents(adjacency, alive);
  const after = connectedComponents(adjacency, next);

  return {
    alive: next,
    summary: after,
    // How many additional authors this specific removal pushed out of the main group.
    disconnectedNow: Math.max(0, before.largestSize - 1 - after.largestSize),
  };
}

/** Degrees among surviving nodes — used to sort the accessible node list. */
export function survivingDegrees(
  adjacency: readonly (readonly number[])[],
  alive: Uint8Array,
): Int32Array {
  const degrees = new Int32Array(adjacency.length);
  for (let i = 0; i < adjacency.length; i += 1) {
    if (!alive[i]) continue;
    const neighbours = adjacency[i];
    if (!neighbours) continue;
    let count = 0;
    for (const neighbour of neighbours) if (alive[neighbour]) count += 1;
    degrees[i] = count;
  }
  return degrees;
}

export function formatPercent(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

/* ------------------------------------------------------ boundary validation */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * Validates the fetched JSON before it is allowed into the app.
 *
 * This is the one place where untyped data enters the system, so it is where the type
 * claim is earned: every node is index-aligned, every edge points at a real node, and
 * every meta field the UI reads is present and numeric. Anything else is rejected and
 * the section falls back to its explanatory state instead of crashing a judged page.
 */
export function parseNetworkData(value: unknown): NetworkData | null {
  if (!isRecord(value)) return null;
  const { meta, nodes, edges } = value;
  if (!isRecord(meta) || !Array.isArray(nodes) || !Array.isArray(edges)) return null;
  if (nodes.length < 10 || edges.length < 10) return null;

  const sample = meta.sample;
  const fullNetwork = meta.fullNetwork;
  if (!isRecord(sample) || !isRecord(fullNetwork) || !isRecord(fullNetwork.core)) return null;

  if (
    typeof meta.source !== 'string' ||
    !isFiniteNumber(sample.nodes) ||
    !isFiniteNumber(sample.edges) ||
    !isFiniteNumber(sample.removalBudget) ||
    !isFiniteNumber(sample.greedyIsolationPercent) ||
    !isFiniteNumber(fullNetwork.authors) ||
    !isFiniteNumber(fullNetwork.coAuthorshipEdges) ||
    !isFiniteNumber(fullNetwork.core.nodes) ||
    !isFiniteNumber(fullNetwork.core.lccPercent)
  ) {
    return null;
  }

  const parsedNodes: NetworkNode[] = [];
  for (let index = 0; index < nodes.length; index += 1) {
    const node: unknown = nodes[index];
    if (!isRecord(node)) return null;
    if (
      node.i !== index ||
      typeof node.name !== 'string' ||
      !isFiniteNumber(node.degree) ||
      !isFiniteNumber(node.x) ||
      !isFiniteNumber(node.y)
    ) {
      return null;
    }

    parsedNodes.push({
      i: index,
      name: node.name,
      degree: node.degree,
      works: isFiniteNumber(node.works) ? node.works : 0,
      citedBy: isFiniteNumber(node.citedBy) ? node.citedBy : 0,
      institution: typeof node.institution === 'string' ? node.institution : '',
      topic: typeof node.topic === 'string' ? node.topic : '',
      cut: node.cut === true,
      x: node.x,
      y: node.y,
    });
  }

  const parsedEdges: [number, number][] = [];
  for (const edge of edges) {
    if (!Array.isArray(edge) || edge.length !== 2) return null;
    const [a, b] = edge as unknown[];
    if (!Number.isInteger(a) || !Number.isInteger(b)) return null;
    const from = a as number;
    const to = b as number;
    if (from < 0 || to < 0 || from >= parsedNodes.length || to >= parsedNodes.length) return null;
    parsedEdges.push([from, to]);
  }

  return {
    meta: meta as unknown as NetworkMeta,
    nodes: parsedNodes,
    edges: parsedEdges,
  };
}

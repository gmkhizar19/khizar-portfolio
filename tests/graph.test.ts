/**
 * Tests for the graph core of the creative feature.
 *
 * These are not decoration: the score the game reports *is* the output of these functions.
 * If `connectedComponents` were wrong, the page would still look finished and would
 * quietly lie about a real dataset. So the tests here pin down the two cases that matter —
 * a path graph that must fragment exactly one way, and the shipped dataset that must be
 * structurally valid — rather than asserting that a function returns "something".
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildAdjacency,
  connectedComponents,
  formatPercent,
  parseNetworkData,
  removeNode,
  survivingDegrees,
} from '@/components/sphere/graph';

/** Build an alive mask from node count, optionally excluding some indices. */
function mask(nodeCount: number, removed: readonly number[] = []): Uint8Array {
  const alive = new Uint8Array(nodeCount).fill(1);
  for (const index of removed) alive[index] = 0;
  return alive;
}

describe('buildAdjacency', () => {
  it('is symmetric and skips self-loops', () => {
    const adjacency = buildAdjacency(3, [
      [0, 1],
      [1, 2],
      [2, 2], // self-loop, must be ignored
    ]);

    expect(adjacency[0]).toEqual([1]);
    expect(adjacency[1]).toEqual([0, 2]);
    expect(adjacency[2]).toEqual([1]);
  });

  it('keeps duplicate edges as given, since the export deduplicates upstream', () => {
    // Documented behaviour, not an accident: `tools/export-network.mjs` emits each pair once.
    // If that ever changes, degree labels would double-count, so the fact is pinned here.
    const adjacency = buildAdjacency(2, [
      [0, 1],
      [0, 1],
    ]);
    expect(adjacency[0]).toEqual([1, 1]);
  });
});

describe('connectedComponents', () => {
  const path = buildAdjacency(4, [
    [0, 1],
    [1, 2],
    [2, 3],
  ]);

  it('reports one component and zero isolation for a connected graph', () => {
    const summary = connectedComponents(path, mask(4));
    expect(summary.aliveCount).toBe(4);
    expect(summary.largestSize).toBe(4);
    expect(summary.lccFraction).toBe(1);
    expect(summary.isolationFraction).toBe(0);
    expect(summary.components).toHaveLength(1);
  });

  it('splits a path in two when its only cut vertex is removed', () => {
    // 0-1-2-3 with 1 removed leaves {0} and {2,3}: the largest is 2 of 3 alive.
    const summary = connectedComponents(path, mask(4, [1]));
    expect(summary.aliveCount).toBe(3);
    expect(summary.largestSize).toBe(2);
    expect(summary.isolationFraction).toBeCloseTo(1 / 3, 10);
    expect(summary.components.map((component) => component.length)).toEqual([2, 1]);
  });

  it('orders components largest first', () => {
    const twoClumps = buildAdjacency(5, [
      [0, 1],
      [1, 2],
      [3, 4],
    ]);
    const summary = connectedComponents(twoClumps, mask(5));
    expect(summary.components.map((component) => component.length)).toEqual([3, 2]);
  });

  it('treats a fully removed graph as zero-alive rather than dividing by zero', () => {
    const summary = connectedComponents(path, mask(4, [0, 1, 2, 3]));
    expect(summary.aliveCount).toBe(0);
    expect(summary.largestSize).toBe(0);
    expect(summary.lccFraction).toBe(0);
    // Documented consequence: an empty board counts as fully isolated.
    expect(summary.isolationFraction).toBe(1);
  });

  it('ignores edges to removed nodes', () => {
    const summary = connectedComponents(path, mask(4, [2]));
    expect(summary.aliveCount).toBe(3);
    // 0-1 stay together, 3 is stranded: largest 2 of 3.
    expect(summary.largestSize).toBe(2);
  });
});

describe('removeNode', () => {
  const path = buildAdjacency(4, [
    [0, 1],
    [1, 2],
    [2, 3],
  ]);

  it('leaves the previous mask untouched', () => {
    const alive = mask(4);
    const result = removeNode(path, alive, 1);
    expect(alive[1]).toBe(1); // caller's array is still intact
    expect(result.alive[1]).toBe(0);
    expect(result.alive).not.toBe(alive);
  });

  it('counts the nodes detached by this removal', () => {
    const result = removeNode(path, mask(4), 1);
    // Before: 4 in one component. After: {0} and {2,3} — one node fell out of the main group.
    expect(result.disconnectedNow).toBe(1);
  });

  it('reports zero detachments for a leaf', () => {
    const result = removeNode(path, mask(4), 3);
    expect(result.summary.aliveCount).toBe(3);
    expect(result.summary.largestSize).toBe(3);
    expect(result.disconnectedNow).toBe(0);
  });

  it('is a no-op for a node that is already gone', () => {
    const removed = mask(4, [2]);
    const result = removeNode(path, removed, 2);
    expect(result.alive).toBe(removed);
    expect(result.disconnectedNow).toBe(0);
    expect(result.summary.largestSize).toBe(2);
  });
});

describe('survivingDegrees', () => {
  it('counts only neighbours that are still alive', () => {
    const adjacency = buildAdjacency(4, [
      [0, 1],
      [1, 2],
      [1, 3],
    ]);
    const degrees = survivingDegrees(adjacency, mask(4, [3]));
    expect(degrees[1]).toBe(2);
    expect(degrees[0]).toBe(1);
    // Removed nodes report zero, not their historical degree.
    expect(degrees[3]).toBe(0);
  });
});

describe('formatPercent', () => {
  it('formats one decimal by default and is stable for zero', () => {
    expect(formatPercent(0)).toBe('0.0%');
    expect(formatPercent(0.532)).toBe('53.2%');
    expect(formatPercent(1)).toBe('100.0%');
  });
});

describe('parseNetworkData (the shipped asset)', () => {
  const raw: unknown = JSON.parse(
    readFileSync('public/data/network.json', 'utf8') as string,
  );

  it('accepts the checked-in dataset and keeps it internally consistent', () => {
    const data = parseNetworkData(raw);
    expect(data).not.toBeNull();
    if (!data) return;

    // These are the numbers printed on the page. If the export changes size, this test
    // fails loudly instead of the site quietly advertising a stale figure.
    expect(data.nodes).toHaveLength(380);
    expect(data.meta.sample.nodes).toBe(380);
    expect(data.meta.sample.edges).toBe(1895);
    expect(data.edges).toHaveLength(1895);

    // Every edge must address a real node, or the canvas would draw a dangling line.
    for (const [from, to] of data.edges) {
      expect(from).toBeGreaterThanOrEqual(0);
      expect(to).toBeGreaterThanOrEqual(0);
      expect(from).toBeLessThan(data.nodes.length);
      expect(to).toBeLessThan(data.nodes.length);
    }

    // Indices are positional: the renderer assumes nodes[i].i === i.
    data.nodes.forEach((node, index) => expect(node.i).toBe(index));
  });

  it('rejects data whose node indices are out of alignment', () => {
    const tampered = structuredClone(raw) as { nodes: { i: number }[] };
    tampered.nodes[3]!.i = 99;
    expect(parseNetworkData(tampered)).toBeNull();
  });

  it('rejects an edge pointing outside the node array', () => {
    const tampered = structuredClone(raw) as { edges: number[][] };
    tampered.edges[0] = [0, 9999];
    expect(parseNetworkData(tampered)).toBeNull();
  });

  it('rejects shapes that are not the expected object', () => {
    expect(parseNetworkData(null)).toBeNull();
    expect(parseNetworkData([])).toBeNull();
    expect(parseNetworkData({ nodes: [], edges: [] })).toBeNull();
    expect(parseNetworkData({ meta: {}, nodes: 'x', edges: [] })).toBeNull();
  });

  it('rejects a dataset too small to be this dataset', () => {
    const tiny = {
      meta: (raw as { meta: unknown }).meta,
      nodes: (raw as { nodes: unknown[] }).nodes.slice(0, 5),
      edges: (raw as { edges: unknown[] }).edges.slice(0, 5),
    };
    expect(parseNetworkData(tiny)).toBeNull();
  });
});

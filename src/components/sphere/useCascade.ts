import { useCallback, useMemo, useState } from 'react';
import {
  buildAdjacency,
  connectedComponents,
  removeNode,
  type ComponentSummary,
  type NetworkData,
} from './graph';

export type CascadeStatus = 'idle' | 'playing' | 'complete';

interface CascadeState {
  readonly alive: Uint8Array;
  readonly order: readonly number[];
  /** Nodes cut off from the main component by the most recent removal. */
  readonly lastDisconnected: number;
}

export interface Cascade {
  readonly adjacency: readonly (readonly number[])[];
  readonly alive: Uint8Array;
  readonly summary: ComponentSummary;
  readonly order: readonly number[];
  readonly removalsLeft: number;
  readonly budget: number;
  readonly status: CascadeStatus;
  readonly lastDisconnected: number;
  remove(node: number): void;
  undo(): void;
  reset(): void;
}

const freshAlive = (count: number): Uint8Array => {
  const alive = new Uint8Array(count);
  alive.fill(1);
  return alive;
};

/**
 * Owns the removal state for the network game.
 *
 * Kept separate from rendering so the rules (budget, undo, completion) stay testable and
 * the canvas remains a pure view. Component recomputation is synchronous and cheap at
 * this graph size, which avoids a worker and keeps results deterministic.
 */
export function useCascade(data: NetworkData): Cascade {
  const adjacency = useMemo(
    () => buildAdjacency(data.nodes.length, data.edges),
    [data.nodes.length, data.edges],
  );

  const budget = data.meta.sample.removalBudget;

  const [state, setState] = useState<CascadeState>(() => ({
    alive: freshAlive(data.nodes.length),
    order: [],
    lastDisconnected: 0,
  }));

  const summary = useMemo(
    () => connectedComponents(adjacency, state.alive),
    [adjacency, state.alive],
  );

  const remove = useCallback(
    (node: number) => {
      setState((previous) => {
        if (previous.order.length >= budget) return previous;
        if (!previous.alive[node]) return previous;

        const result = removeNode(adjacency, previous.alive, node);

        return {
          alive: result.alive,
          order: [...previous.order, node],
          lastDisconnected: result.disconnectedNow,
        };
      });
    },
    [adjacency, budget],
  );

  const undo = useCallback(() => {
    setState((previous) => {
      if (previous.order.length === 0) return previous;
      const nextOrder = previous.order.slice(0, -1);
      const nextAlive = freshAlive(previous.alive.length);
      for (const node of nextOrder) nextAlive[node] = 0;
      return { alive: nextAlive, order: nextOrder, lastDisconnected: 0 };
    });
  }, []);

  const reset = useCallback(() => {
    setState({ alive: freshAlive(data.nodes.length), order: [], lastDisconnected: 0 });
  }, [data.nodes.length]);

  const removalsLeft = budget - state.order.length;
  const status: CascadeStatus =
    state.order.length === 0 ? 'idle' : removalsLeft === 0 ? 'complete' : 'playing';

  return {
    adjacency,
    alive: state.alive,
    summary,
    order: state.order,
    removalsLeft,
    budget,
    status,
    lastDisconnected: state.lastDisconnected,
    remove,
    undo,
    reset,
  };
}

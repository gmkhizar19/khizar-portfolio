import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentSummary, NetworkData } from './graph';

interface NetworkCanvasProps {
  readonly data: NetworkData;
  readonly alive: Uint8Array;
  readonly summary: ComponentSummary;
  readonly showCuts: boolean;
  readonly disabled: boolean;
  readonly onRemove: (node: number) => void;
  readonly onHoverChange?: (name: string | null) => void;
}

interface HoverState {
  readonly index: number;
  readonly x: number;
  readonly y: number;
}

const COLOURS = {
  live: 'rgba(159, 224, 210, 0.92)',
  isolated: 'rgba(255, 192, 154, 0.95)',
  removed: 'rgba(140, 140, 155, 0.45)',
  edgeLive: 'rgba(159, 224, 210, 0.12)',
  edgeSevered: 'rgba(255, 192, 154, 0.26)',
  hoverRing: 'rgba(245, 244, 250, 0.9)',
  cutRing: 'rgba(217, 255, 102, 0.85)',
} as const;

const DRIFT_SETTLE = 0.0025;

/** Radius in CSS pixels, sub-linear in degree so a hub does not swallow its cluster. */
function radiusFor(degree: number): number {
  return 1.9 + Math.min(4.6, Math.sqrt(Math.max(degree, 1)) * 0.72);
}

/**
 * Renders the network and handles pointer interaction.
 *
 * Rendering choices that matter:
 *  - Every removal is computed before painting, so the colours always describe the state
 *    that the visitor is looking at.
 *  - Severed edges turn vermilion, and whole components physically drift apart. The
 *    motion is the evidence of the break — it is not decoration.
 *  - Removed authors stay on screen as faint rings, so a visitor can see what they did
 *    rather than watching nodes silently vanish.
 */
export function NetworkCanvas({
  data,
  alive,
  summary,
  showCuts,
  disabled,
  onRemove,
  onHoverChange,
}: NetworkCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hover, setHover] = useState<HoverState | null>(null);

  const offsets = useRef<Float32Array>(new Float32Array(data.nodes.length * 2));
  const targets = useRef<Float32Array>(new Float32Array(data.nodes.length * 2));
  const frame = useRef<number | null>(null);
  const drawRef = useRef<() => void>(() => {});

  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const nodeCount = data.nodes.length;

  /** Which component each surviving node belongs to; -1 when removed. */
  const componentOf = useMemo(() => {
    const lookup = new Int16Array(nodeCount).fill(-1);
    summary.components.forEach((component, componentIndex) => {
      for (const node of component) lookup[node] = componentIndex;
    });
    return lookup;
  }, [summary, nodeCount]);

  /* --------------------------------------------------------------- resizing */

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box) return;
      setSize({ width: Math.round(box.width), height: Math.round(box.height) });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /* ------------------------------------------------------------ projection */

  const project = useCallback(
    (nodeIndex: number) => {
      const node = data.nodes[nodeIndex];
      const padding = Math.max(18, Math.min(size.width, size.height) * 0.045);
      const usableWidth = Math.max(1, size.width - padding * 2);
      const usableHeight = Math.max(1, size.height - padding * 2);

      const offsetIndex = nodeIndex * 2;
      return {
        x: padding + node.x * usableWidth + (offsets.current[offsetIndex] ?? 0) * usableWidth,
        y:
          padding +
          node.y * usableHeight +
          (offsets.current[offsetIndex + 1] ?? 0) * usableHeight,
      };
    },
    [data.nodes, size.height, size.width],
  );

  /* ------------------------------------------------------------------ draw */

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(size.width * dpr);
    const pixelHeight = Math.round(size.height * dpr);

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, size.width, size.height);

    // Edges are batched into two paths (intact / severed) — one stroke call each,
    // which keeps ~1,900 lines cheap on a mid-range phone.
    const serveredPath = new Path2D();
    const intactPath = new Path2D();

    for (const [a, b] of data.edges) {
      if (!alive[a] || !alive[b]) continue;

      const pointA = project(a);
      const pointB = project(b);
      const severed = componentOf[a] !== 0 || componentOf[b] !== 0;
      const path = severed ? serveredPath : intactPath;

      path.moveTo(pointA.x, pointA.y);
      path.lineTo(pointB.x, pointB.y);
    }

    context.lineWidth = 1;
    context.strokeStyle = COLOURS.edgeLive;
    context.stroke(intactPath);
    context.strokeStyle = COLOURS.edgeSevered;
    context.stroke(serveredPath);

    // Removed authors: faint rings, so the visitor can still see their own moves.
    context.beginPath();
    for (let index = 0; index < nodeCount; index += 1) {
      if (alive[index]) continue;
      const point = project(index);
      const radius = radiusFor(data.nodes[index].degree) * 0.75;
      context.moveTo(point.x + radius, point.y);
      context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    }
    context.strokeStyle = COLOURS.removed;
    context.lineWidth = 1;
    context.stroke();

    // Surviving nodes, batched by state.
    const mainPath = new Path2D();
    const isolatedPath = new Path2D();

    for (let index = 0; index < nodeCount; index += 1) {
      if (!alive[index]) continue;
      const point = project(index);
      const radius = radiusFor(data.nodes[index].degree);
      const path = componentOf[index] === 0 ? mainPath : isolatedPath;
      path.moveTo(point.x + radius, point.y);
      path.arc(point.x, point.y, radius, 0, Math.PI * 2);
    }

    context.fillStyle = COLOURS.live;
    context.fill(mainPath);
    context.fillStyle = COLOURS.isolated;
    context.fill(isolatedPath);

    if (showCuts) {
      context.beginPath();
      for (let index = 0; index < nodeCount; index += 1) {
        if (!alive[index] || !data.nodes[index].cut) continue;
        const point = project(index);
        const radius = radiusFor(data.nodes[index].degree) + 4;
        context.moveTo(point.x + radius, point.y);
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
      }
      context.strokeStyle = COLOURS.cutRing;
      context.lineWidth = 1;
      context.setLineDash([2, 3]);
      context.stroke();
      context.setLineDash([]);
    }

    if (hover) {
      const point = project(hover.index);
      const radius = radiusFor(data.nodes[hover.index].degree) + 5;
      context.beginPath();
      context.arc(point.x, point.y, radius, 0, Math.PI * 2);
      context.strokeStyle = COLOURS.hoverRing;
      context.lineWidth = 1.5;
      context.stroke();
    }
  }, [alive, componentOf, data.edges, data.nodes, hover, nodeCount, project, showCuts, size]);

  useEffect(() => {
    drawRef.current = draw;
    draw();
  }, [draw]);

  /* ------------------------------------------------------- drift on removal */

  useEffect(() => {
    const next = new Float32Array(nodeCount * 2);

    if (summary.components.length > 1 && summary.aliveCount > 0) {
      // Centroid of everything still alive — the anchor components drift away from.
      let centreX = 0;
      let centreY = 0;
      let counted = 0;
      for (let index = 0; index < nodeCount; index += 1) {
        if (!alive[index]) continue;
        centreX += data.nodes[index].x;
        centreY += data.nodes[index].y;
        counted += 1;
      }
      centreX /= Math.max(counted, 1);
      centreY /= Math.max(counted, 1);

      summary.components.forEach((component, componentIndex) => {
        if (componentIndex === 0) return; // the main component stays put

        let x = 0;
        let y = 0;
        for (const node of component) {
          x += data.nodes[node].x;
          y += data.nodes[node].y;
        }
        x /= component.length;
        y /= component.length;

        let dx = x - centreX;
        let dy = y - centreY;
        const magnitude = Math.hypot(dx, dy) || 1;
        dx /= magnitude;
        dy /= magnitude;

        // Small components visibly detach; large ones drift less so the frame holds.
        const strength = 0.012 + Math.min(0.035, (component.length / nodeCount) * 0.16);

        for (const node of component) {
          next[node * 2] = dx * strength;
          next[node * 2 + 1] = dy * strength;
        }
      });
    }

    targets.current = next;

    if (reducedMotion) {
      offsets.current = Float32Array.from(next);
      drawRef.current();
      return;
    }

    const step = () => {
      let settled = true;
      const current = offsets.current;

      for (let index = 0; index < current.length; index += 1) {
        const difference = next[index] - current[index];
        if (Math.abs(difference) > DRIFT_SETTLE) settled = false;
        current[index] += difference * 0.14;
      }

      drawRef.current();

      if (!settled) {
        frame.current = window.requestAnimationFrame(step);
      } else {
        frame.current = null;
      }
    };

    if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    frame.current = window.requestAnimationFrame(step);

    return () => {
      if (frame.current !== null) {
        window.cancelAnimationFrame(frame.current);
        frame.current = null;
      }
    };
  }, [summary, alive, data.nodes, nodeCount, reducedMotion]);

  /* ----------------------------------------------------------- interaction */

  const hitTest = useCallback(
    (clientX: number, clientY: number): number | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const box = canvas.getBoundingClientRect();
      const x = clientX - box.left;
      const y = clientY - box.top;

      let closest: number | null = null;
      let closestDistance = Number.POSITIVE_INFINITY;

      for (let index = 0; index < nodeCount; index += 1) {
        if (!alive[index]) continue;
        const point = project(index);
        const distance = Math.hypot(point.x - x, point.y - y);
        const threshold = radiusFor(data.nodes[index].degree) + 8;
        if (distance <= threshold && distance < closestDistance) {
          closest = index;
          closestDistance = distance;
        }
      }

      return closest;
    },
    [alive, data.nodes, nodeCount, project],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (event.pointerType === 'touch') return;
      const index = hitTest(event.clientX, event.clientY);
      if (index === null) {
        setHover(null);
        onHoverChange?.(null);
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const box = canvas.getBoundingClientRect();

      setHover({ index, x: event.clientX - box.left, y: event.clientY - box.top });
      onHoverChange?.(data.nodes[index].name);
    },
    [data.nodes, hitTest, onHoverChange],
  );

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (disabled) return;
      const index = hitTest(event.clientX, event.clientY);
      if (index === null) return;
      onRemove(index);
    },
    [disabled, hitTest, onRemove],
  );

  const hoveredNode = hover ? data.nodes[hover.index] : null;

  return (
    <div className="canvas-shell" ref={wrapperRef}>
      <canvas
        ref={canvasRef}
        className="canvas-shell__surface"
        role="img"
        aria-label={`Network of ${nodeCount} researchers. ${summary.largestSize} of ${summary.aliveCount} remain connected. Use the list of researchers below to remove one with the keyboard.`}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => {
          setHover(null);
          onHoverChange?.(null);
        }}
        onClick={handleClick}
      />

      {hoveredNode && hover ? (
        <div
          className="node-tip"
          style={{ left: hover.x, top: hover.y }}
          aria-hidden="true"
        >
          <strong>{hoveredNode.name}</strong>
          {hoveredNode.institution ? <span>{hoveredNode.institution}</span> : null}
          <span className="node-tip__meta">
            {hoveredNode.degree} co-authors · {hoveredNode.works} papers
          </span>
        </div>
      ) : null}
    </div>
  );
}

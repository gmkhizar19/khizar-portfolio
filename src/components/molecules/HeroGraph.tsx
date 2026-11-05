import { heroEdges, heroNodes } from '@/generated/hero';

/**
 * The hero constellation: a real slice of the network, drawn as inline SVG.
 *
 * Why inline rather than an image or a second fetch: it is ~2 KB of geometry, appears in
 * the first paint with no network round-trip, scales without layout shift, and stays
 * decorative (`aria-hidden`) so it never competes with the headline for attention.
 */
export function HeroGraph() {
  const highlighted = new Set([3, 11, 24, 37, 46]);

  return (
    <svg
      className="hero-graph"
      viewBox="-6 -6 112 112"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
    >
      <g className="hero-graph__edges">
        {heroEdges.map(([a, b], index) => {
          const from = heroNodes[a];
          const to = heroNodes[b];
          if (!from || !to) return null;
          return <line key={index} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
        })}
      </g>
      <g className="hero-graph__nodes">
        {heroNodes.map((node, index) => (
          <circle
            key={index}
            cx={node.x}
            cy={node.y}
            r={node.r}
            className={highlighted.has(index) ? 'hero-graph__node hero-graph__node--pulse' : 'hero-graph__node'}
            style={highlighted.has(index) ? { animationDelay: `${(index % 7) * 0.6}s` } : undefined}
          />
        ))}
      </g>
    </svg>
  );
}

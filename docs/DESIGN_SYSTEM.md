# Design System — "Field"

> The visual language is chosen to make one thing legible: **this person operates systems,
> carefully.** Not "developer dark mode".

---

## 1. Concept

The page is built as a **field of data with type on top of it**: a near-black violet ground,
a real graph rendered behind and inside the layout, and one high-energy accent reserved for
interaction and for broken state.

Four moves carry the identity:

1. **Geometric display type at scale**, with tight tracking, against a technical field.
2. **A real graph as the hero artefact**, not an illustration. The motif is the work.
3. **Lime as a semantic accent**, not decoration. It marks the visitor's own action and
   anything that has been severed, so colour always means something.
4. **Restraint everywhere else.** No glass cards, no gradient blobs, no tilt, no noise.

Deliberate rejections: terminal cosplay, glassmorphism, floating particles, emoji headings,
"Hello World 👋" hero copy, and any component-library default.

---

## 2. Colour

Dark-only. One theme executed with discipline beats two executed halfway, and a theme
toggle scores nothing under the rubric.

| Token | Value | Role |
|---|---|---|
| `--ink-950` | `#111118` | Page background |
| `--ink-900` | `#17171F` | Raised surface |
| `--ink-850` | `#1C1C25` | Card inset / media background |
| `--ink-800` | `#22222E` | Highest surface |
| `--line` | `rgba(245,244,250,0.16)` | Border |
| `--line-soft` | `rgba(245,244,250,0.09)` | Divider inside a card |
| `--bone-50` | `#F5F4FA` | Primary text |
| `--bone-200` | `#D3D2DE` | Body text on raised surfaces |
| `--bone-400` | `#9B9AAA` | Secondary text |
| `--bone-500` | `#85849B` | Tertiary / meta (4.9:1 on raised surfaces) |
| `--signal` | `#D9FF66` | Brand, interactive, "severed" state |
| `--signal-soft` | `#E9FF9E` | Accent text where lime would glare |
| `--live` | `#9FE0D2` | "Connected / alive" data state |
| `--alert` | `#FFC09A` | Warning and score emphasis |
| `--violet` | `#7047EB` | Depth only — glows and shadows, never a glyph |

**Semantic mapping (never inverted):**

- `--live` (mint) = a node still in the largest component.
- `--signal` (lime) = the visitor's interaction, and anything severed.
- `--bone-500` = removed from the network.

**Contrast is verified, not asserted.** `tools/check-contrast.mjs` parses the real values out
of `theme.css` and fails `npm run verify` if any of the 20 text/surface pairs drops below
WCAG AA (4.5:1). It caught a genuine failure during development — `--bone-500` was 4.39:1 on
`--ink-900` — which is exactly why it is a script and not a claim.

Colour is never the only signal: broken components also move position, and a text counter
states the percentage.

---

## 3. Typography

| Role | Family | Why |
|---|---|---|
| Display | **Space Grotesk** (variable 300–700) | Tight, geometric, confident at 80 px |
| UI / body | **Inter** (variable 100–900) | Neutral and excellent at 16–18 px |
| Data / labels | **JetBrains Mono** (variable 100–800) | Numbers and metrics read as instrument output |

All three are self-hosted via `@fontsource-variable`, subset to Latin, `font-display: swap`.
No Google Fonts request: one fewer connection, no third-party dependency, and the CSP stays
strict.

```
--text-display : clamp(2.6rem, 6vw, 5rem)      line-height 1.02  tracking -0.035em
--text-h2      : clamp(1.9rem, 3.4vw, 3rem)    line-height 1.05  tracking -0.02em
--text-h3      : clamp(1.18rem, 1.8vw, 1.45rem)
--text-body    : 1.0625rem (17px)              line-height 1.65  max 64ch
--text-meta    : 0.75rem (12px)                tracking 0.12em uppercase mono
```

Scale is fluid: no breakpoint where type jumps. Measure is capped at 64 characters so long
paragraphs stay readable on ultra-wide displays.

---

## 4. Space, grid, layout

- 4 px base unit; steps `4, 8, 12, 16, 24, 32, 48, 64, 96, 116`.
- Content column: `min(1200px, 100% - 2 * gutter)`; gutter `clamp(20px, 4vw, 56px)`.
- Section rhythm: `clamp(72px, 9vw, 116px)` vertical padding — generous, so each section
  reads as a chapter.
- **12-column dotted tick grid** behind the hero, echoing a measuring field.
- **Two-column section heads**: the mono index on the left, heading and body on the right.
  It is the page's one structural signature and it repeats at every section.
- Radius: `6 / 8 / 14 px`. Nothing larger — a big radius reads as a component library.

Breakpoints: `480 / 768 / 1024 / 1440`. Mobile-first; every layout verified at 375 px.

---

## 5. Motion

Motion exists to explain a change of state. Nothing loops for decoration except the hero
constellation, which signals "live data".

- `--t-fast` 140 ms, `--t-base` 240 ms, `--t-slow` 560 ms.
- Reveal on scroll: 12 px rise plus fade, once, via `IntersectionObserver`.
- Canvas drift is slow enough to read as breathing, not animation.
- `prefers-reduced-motion: reduce` disables the drift, the reveal and every transition.
  The graph still draws and the game still works — motion is never load-bearing.

---

## 6. Components

| Component | Notes |
|---|---|
| Nav | Six items, mono numerals, underline on hover, current section tracked by observer |
| Section head | Left index column + right heading; the only repeated layout device |
| Project card | Gradient surface, metric row in display type, stack list, live links |
| Certificate card | Real artwork on top, claim below, verify link at the bottom |
| Pipeline | Request path as a horizontal sequence, with optional stages visually muted |
| Build badges | `● live` in lime versus `○ ready to deploy` in grey — status is never implied |
| Game board | Canvas 2D, DOM controls above it, keyboard-reachable author list below |

---

## 7. Accessibility contract

- Skip link to `#main`, first element in the document.
- Visible focus ring on every interactive element (`:focus-visible`, 2 px lime outline).
- Heading order is strictly sequential; no `h3` without an `h2` above it.
- The game is playable without a mouse: the author list is a real list of buttons.
- Full text content exists in `<noscript>` for a JS-free reader or crawler.
- Contrast measured by script; motion respects the OS setting.

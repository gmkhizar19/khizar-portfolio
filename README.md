# Portfolio — Ghulam Muhammad Khizar

A one-page portfolio for a DevOps and cloud engineering role, built around a playable
slice of a real research network.

Everything on the page is either measured or verifiable: the network numbers come from an
OpenAlex pipeline whose outputs are checked in, and the credentials link to Coursera's own
verification pages. There are no invented percentages and no "trusted by" logos.

---

## What is on the page

| Section | Anchor | What it does |
|---|---|---|
| Hero | — | Name, positioning, three measured headline numbers, live network constellation |
| About | `#about` | Why DevOps, and the three principles the work is organised around |
| Skills | `#skills` | Five clusters, each with the evidence behind it |
| Work | `#work` | Four projects: the research platform, KHAKI, this site, PageRank |
| Certifications | `#certifications` | Three specialisations with the certificate artwork and verify links |
| The Lab | `#lab` | **The creative feature** — break the network |
| Build | `#build` | The AWS architecture, service by service, with live/deploy status |

## The creative feature — "Break the Network"

A cascade-failure game played on 380 real authors and 1,895 real co-authorship edges, cut
from the 42,774-author network that was built from the OpenAlex API.

- Pick an author, remove them, watch the network fragment.
- Eight removals per run. Articulation points are marked, because that is the lesson.
- The greedy adversarial baseline isolates **53.2%** of the region. Beating it means
  understanding which nodes are load-bearing rather than picking the biggest circles.
- A finished run can be submitted to a serverless leaderboard and shared as a link with
  the score in the query string.

The hint is visible above the board, the board never traps focus and does not sit in front
of navigation, and everything is optional: if the backend is unreachable the page says the
leaderboard is offline and keeps playing locally.

## Stack

- **Frontend:** React 19, TypeScript (strict), Vite 7, hand-authored CSS, Canvas 2D.
- **Fonts:** self-hosted via Fontsource, so the page makes no third-party requests.
- **Backend:** API Gateway HTTP API, one Node.js 20 Lambda, one DynamoDB table, declared
  in `infra/template.yaml` (AWS SAM).
- **Hosting:** AWS Amplify Hosting, connected to this repository.

## Run it locally

Requires Node 20 or newer.

```
npm ci
npm run dev          # http://localhost:5173
```

The leaderboard is optional. Without `VITE_API_URL` the game plays, saves your best run in
`localStorage` and reports that the leaderboard is offline — nothing breaks, and nothing
pretends to be connected. To point the site at a deployed backend, copy `.env.example` to
`.env` and set `VITE_API_URL`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Type-check, then build to `dist/` |
| `npm run preview` | Serve the built site on port 4173 |
| `npm run typecheck` | `tsc --noEmit` over the whole project |
| `npm run test` | Vitest unit tests (graph, cascade, storage, parsers) |
| `npm run data` | Rebuild `public/data/network.json` and the hero points from the checked-in dataset |
| `npm run lambda` | Contract checks for the leaderboard handler (validation, sort key, caller hashing) |
| `npm run og` | Regenerate `public/og.png` from the real hero constellation |
| `npm run verify` | Typecheck, tests, build, bundle budget, contrast audit and Lambda contract |

`npm run verify` is the gate: if it passes, the artefact is shippable.

## Deploying

Two independent halves — the site needs nothing else to work.

1. **Hosting (required).** In the Amplify console, connect this GitHub repository, accept
   the detected `amplify.yml`, and set `VITE_API_URL` as an environment variable if the
   backend exists. The build publishes `dist/`. Steps and failure modes are in
   [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).
2. **Leaderboard (optional).** `sam build && sam deploy --guided` in `infra/`, then copy
   the `ApiUrl` output into `VITE_API_URL` and rebuild. Everything it creates is
   pay-per-request, so the idle cost is $0.00.

## What is measured, and what is not

| Claim on the page | Where it comes from |
|---|---|
| 42,774 authors, 170,700 co-authorship edges | `researchers-network` Neo4j load counts |
| 26,627 records cleaned to 26,188 papers | `researchers-network` cleaning report |
| 14,574 / 81,793 core network, 92.6% LCC | `researchers-network` Stage 1 gate output |
| 92.6% → 76.3% LCC after targeted removal | `p1_fragility.py` output |
| 380 nodes, 1,895 edges, 9 articulation points, 53.2% baseline | `tools/export-network.mjs`, recorded in `network.json` meta |
| 20 routes, 17 API endpoints, 16 Prisma models | counted in the KHAKI repository |
| 3 specialisations, 20 course certificates | Coursera accomplishments page, each link opened and verified |

The Build section distinguishes **live** services from those that are **ready to deploy**,
because at the time of writing the leaderboard stack is written and packaged but not
provisioned. That distinction is deliberate.

## Data and licence

Co-authorship data derives from [OpenAlex](https://openalex.org) (CC0 1.0 Universal).
Cite: Priem, J., Piwowar, H., & Orr, R. (2022). *OpenAlex: A fully-open index of scholarly
works, authors, venues, institutions, and concepts.* arXiv:2205.01833.

The site source is © Ghulam Muhammad Khizar. The OpenAlex-derived network data in
`public/data/network.json` remains CC0.

## Repository layout

```
src/
  app/            content.ts (all copy and numbers), useReveal
  components/
    organisms/    Nav, Hero, About, Skills, Projects, Certifications, BuildNotes, Footer
    molecules/    ProjectCard, Leaderboard, StatBlock
    sphere/       the game: Sphere, NetworkCanvas, cascade model
  lib/            api.ts (AWS boundary), storage.ts, parseNetworkData.ts
  styles/         theme.css tokens, layout.css, components.css, game.css
public/
  data/           network.json — the shipped 380-node slice
  certificates/   three certificate images, 880px wide
infra/            SAM template + Lambda handler
tools/            dataset export, budget and contrast checks, screenshot helpers
docs/             product, architecture, design system, deployment, submission
```


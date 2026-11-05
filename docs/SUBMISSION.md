# Submission checklist

**AWS Student Builder Challenge — deadline 6 November 2026, 11:59 PM PST.**

Fill the two links at the top of this file before submitting, then work down the list. Every
item is something a judge can check in under a minute.

---

## Links to submit

| Field | Value |
|---|---|
| Live site (AWS Amplify) | `https://...amplifyapp.com` ← replace with the real domain |
| Public GitHub repository | `https://github.com/gmkhizar19/khizar-portfolio` ← confirm it is public |
| GitHub handle | `gmkhizar19` |

Verify both from a logged-out browser window, not from an account that owns them.

---

## Copy for the submission form

Paste these as-is once the URLs above are filled in.

**Project title**

> Break the Network — a DevOps portfolio built on a real research graph

**One-line summary**

> A DevOps portfolio whose centrepiece is a playable cascade-failure game on 380 real
> co-authorship edges, deployed on AWS Amplify.

**Short description (≈80 words)**

> Most portfolios describe what someone can do; this one lets you test it. "Break the
> Network" is a cascade simulation played on a real 380-author slice of Pakistan's
> computer-science research network, built from the OpenAlex API. Remove an author, watch
> connectivity collapse, and try to beat the greedy baseline of 53.2% isolation in eight
> moves. The site runs on AWS Amplify Hosting, with an optional API Gateway + Lambda +
> DynamoDB leaderboard that validates every score and falls back to offline instead of
> failing.

**Longer description (≈250 words)**

> I study computer science and want to work on the part of software that has to stay up, so
> I built a portfolio that demonstrates that rather than claiming it.
>
> The centrepiece is a game. Over a semester I built a co-authorship graph of Pakistan's
> computer-science research from the OpenAlex API: 26,627 records cleaned into 26,188
> papers, 42,774 authors and 170,700 edges, loaded into a containerised Neo4j instance and
> analysed with graph data science. A measured finding from that work is that 670
> articulation points and 660 bridges hold the network together, but removing 10% of
> authors by betweenness only takes the largest component from 92.6% to 76.3%. That gap is
> counter-intuitive, so instead of writing it in a bullet point I made it playable: 380 real
> authors, 1,895 real edges, eight removals, and a visible target of 53.2% isolation set by
> greedy adversarial play.
>
> Everything around it is engineering, not decoration. The bundle is static React deployed
> through Amplify Hosting from GitHub, so a push rebuilds and publishes atomically. The
> leaderboard is an API Gateway HTTP API in front of one Node.js Lambda and a DynamoDB
> table: scores are validated against the shipped dataset, callers are rate-limited by a
> salted hash rather than a stored address, and if the backend is unreachable the page says
> so and keeps playing.
>
> The whole pipeline is reproducible: `npm run verify` type-checks, runs 30 tests, builds,
> audits the bundle size, checks WCAG contrast on the real theme tokens, and verifies the
> leaderboard contract.

**AWS services used**

> AWS Amplify Hosting (build, CDN, HTTPS, atomic deploys) · Amazon API Gateway HTTP API
> (two routes, CORS locked to the site origin, stage throttling) · AWS Lambda (Node.js 20,
> arm64 — validation, ranking, rate limiting) · Amazon DynamoDB (single on-demand table,
> TTL for throttle counters) · Amazon CloudWatch Logs · AWS IAM (scoped policy).

---

## The three required sections

| Requirement | Where it is | How a judge sees it in ten seconds |
|---|---|---|
| **About me** | `#about` | Named, positioned for DevOps, with three stated principles |
| **Skills / tech superpowers** | `#skills` | Five clusters, each paired with the evidence behind it |
| **Projects & achievements** | `#work` and `#certifications` | Four projects with live links, three certificates with artwork and verify links |

## The creative feature

| Requirement | Status |
|---|---|
| Works, and is interactive | "Break the Network": click authors, watch the graph fragment, eight removals |
| Has a visible hint | Hint line sits above the board; the section states the goal in one sentence |
| Does not obstruct navigation | It is a normal section in the page flow; the board never opens a modal and never traps focus |
| Uses real data | 380 authors and 1,895 edges from the OpenAlex-derived research network |
| Has a reason to exist | The score is a real graph property (isolation), measured against a 53.2% greedy baseline |

## Rubric, mapped to evidence

**Creativity — 30%.** The feature is not a quiz or an animation: it is a cascade-failure
simulation on a real dataset, with a measurable objective and a published baseline. The
leaderboard is optional by design, so the feature works on a slow connection or with the
backend deleted.

**Working AWS implementation — 25%.** Amplify Hosting serves the site from a GitHub
connection with atomic deploys. Behind it: HTTP API → Lambda → DynamoDB, throttled,
validated and rate-limited by hashed caller. The Build section states plainly which services
are live and which are provisioned but not yet deployed — no judge should have to discover
that themselves.

**Communication — 25%.** Every claim on the page traces to a source: a repository, a
Coursera verification page, or a checked-in analysis output. The README has a table mapping
each figure to where it came from.

**Completeness and usability — 20%.** Keyboard navigable, skip link, visible focus, reduced
motion respected, WCAG AA contrast verified by script, works without JavaScript (readable
`<noscript>` content), no third-party requests, ~87 kB of gzipped JavaScript.

---

## Pre-submission checks

Run these in order; each one is fast.

1. ```
   npm ci
   npm run verify
   ```
   Must pass: typecheck, 30 unit tests, build, bundle budget, contrast audit.

2. **Open the deployed URL in a private window** and confirm:
   - the hero constellation renders,
   - each of the six nav links scrolls to the right section,
   - the certificates show images and each "Verify on Coursera" link opens the correct page,
   - the game can be played to the end and the score appears,
   - the page is usable at 375 px wide.

3. **Test with JavaScript disabled** — the content must still be readable.

4. **Run the game twice and submit a score**, to prove the leaderboard round-trip. If the
   backend is not deployed, confirm the page says so instead of failing silently.

5. **Check every outbound link** in a fresh browser: GitHub, Coursera ×3, KHAKI live site.

6. **Confirm the repository is public** and that `.env` is not in it. The `.gitignore`
   blocks it; verify with `git ls-files | findstr .env`.

---

## Known gaps, stated rather than hidden

- **The leaderboard backend is written and documented but not provisioned.** The site
  therefore reports it as "ready to deploy" in the Build section. Provisioning is
  `sam deploy --guided` in `infra/`; the exact steps are in `docs/DEPLOYMENT.md`.
- **The KHAKI repository is private**, so the project card links only to the live site. If
  the repository is made public, add the second link back in `src/app/content.ts`.
- **No LinkedIn URL** is shown because there is no verified public profile to link to. The
  UI hides the field rather than guessing a URL.
- **The game uses a 380-author sample**, not all 42,774 authors, because a browser cannot
  lay out and animate the full graph at 60 fps. The Build section states the sample size
  and the method used to choose it.

---

## Timing

The deadline is 11:59 PM PST on 6 November 2026, which is 12:59 PM PKT on 7 November 2026.
Submit at least a day early: DNS propagation and a first Amplify build are the two most
common causes of a missed deadline, and neither is under your control once the clock runs
out.

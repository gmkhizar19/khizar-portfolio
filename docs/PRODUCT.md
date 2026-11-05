# Product Discovery — Khizar Portfolio

> Phase 1–4 deliverable. Written before any implementation code, per the build brief.
> Every claim here is traceable to the real GitHub inventory (`gmkhizar19`) or the
> official AWS Student Builder Challenge brief.

---

## 1. The constraint that shapes everything

The judging rubric is public, so it is a design specification, not a guess:

| Criterion | Weight | What it actually rewards |
|---|---:|---|
| Creativity & memorability | **30%** | A distinctive, working, personal feature — not a decoration |
| Working AWS implementation | **25%** | Site loads at a live URL during judging; core links work; AWS usage documented |
| Communication quality | **25%** | Clarity of write-up, screenshots, and explanation of process and learning |
| Portfolio completeness & usability | **20%** | About / Skills / Projects present, navigation works on desktop and mobile |

Two consequences follow immediately.

1. **60% of the score is not the website.** It is the feature *and the story around it*.
   A beautiful site with a weak feature and thin documentation loses to a plainer site
   with a memorable, well-documented one.
2. **Gate 1 is AI + human scoring.** Machine-readable structure matters: semantic HTML,
   real text (not text baked into images), clear headings, structured data. A site that
   only *looks* impressive to a human screenshot fails the AI pass.

**Deadline: 6 November 2026, 11:59 PM PST.** Roughly 48 hours from the start of this build.

---

## 2. What average participants will build

Based on the brief's own suggestion list, the median submission is one of:

- a Windows 98 desktop with draggable windows,
- a retro arcade toggle,
- a digital scratch card,
- a command-line interface portfolio,
- a "fortune cookie" that prints a motto.

These are *given as examples*, which means hundreds of entrants will build them, and
judges will see them repeatedly. They also share a fatal weakness: **the feature is
disconnected from the person.** Swapping the name on a Windows 98 portfolio produces a
different, equally valid submission. That is the definition of non-distinctive, and
Creativity is the single heaviest criterion at 30%.

## 3. What the top 1% will build

The top submissions will have a feature that **could not be transplanted to another
person**. It will be built from the author's actual work, will be interactive in a way
that produces a *decision* from the visitor (not just a reveal), and will be
explainable in one sentence.

That is the gap this project attacks.

---

## 4. Product vision

> A portfolio that does not describe Khizar's work — it lets you **play** it.

The site treats a career as a network: people, skills, and projects are nodes, and the
interesting part is the edges. That metaphor is not decorative — it is literally what
Khizar spent a semester building, on real data, at national scale.

**Value proposition.** Most student portfolios ask a judge to trust a list of claims.
This one hands the judge an instrument: a slice of the real 42,774-author Pakistani
computer-science collaboration network, rendered live, that the visitor can break apart
to see how it fails. The claim "I can build and analyse large graphs" becomes something
the visitor verifies themselves in ten seconds.

**One-sentence pitch (for the submission write-up):**
> I built a knowledge graph of 42,774 Pakistani researchers in Neo4j — and a playable
> slice of it lives in my portfolio, so you can try to break it yourself.

---

## 5. Competitive advantage

| Advantage | Why it is hard to copy |
|---|---|
| Real, non-synthetic data at national scale | Requires an actual semester of crawling, cleaning and validation |
| Domain-appropriate interaction (network fragility) | The game *is* the research question, not a skin over it |
| Honest metrics with before/after cleaning | Fabricated numbers collapse under a single judge question |
| Accessibility for a canvas experience | Most graph demos are keyboard-inaccessible; this one is not |
| Documented AWS architecture | Matches the 25% criterion with evidence, not a service-name list |

**Deliberate non-goals** (each would add risk without adding score):

- No AI chatbot over the portfolio. It competes with the identity, costs money per
  visitor, adds a cold-start failure mode during judging, and scores under Creativity
  because every entrant can add one. *(Scored below, rejected on evidence.)*
- No three.js 3D world. Heavy bundle, poor mobile performance, and the visual payoff is
  weaker than the actual network.
- No 3D card tilt, particles, or cursor followers. Decoration that slows the page.
- No custom domain purchase. Amplify's provided domain is free and sufficient.

---

## 6. Personas

**P1 — The AWS judge (primary, 25% + 30%).**
Reviews 80+ submissions in a sitting. Skims: hero, a scroll, the feature, then the
write-up. Cares whether the AWS claim is real and whether the feature is memorable.
*Design implication:* the feature must be reachable in one click and understandable
without instructions; the AWS section must be on-site and specific.

**P2 — The AI rubric scorer (primary, gate 1).**
Extracts text and structure. Needs: correct landmark elements, one `h1`, ordered
headings, descriptive link text, alt text, `Person`/`CreativeWork` structured data,
and the three mandated sections identifiable by heading.
*Design implication:* no critical copy inside canvas or images; every section has a
literal, plain-language heading.

**P3 — The recruiter / internship reviewer (secondary).**
30–60 seconds, often on mobile. Wants: who is this, what can they do, proof, contact.
*Design implication:* contact is one tap; the strongest proof appears above the fold
and again in Projects.

**P4 — The fellow student (tertiary).**
Arrives from a shared link, plays the game, shares a result. Drives the only organic
distribution a student portfolio gets.
*Design implication:* results must be shareable as a URL with the score embedded.

---

## 7. User journey (P1, the judge)

1. **0–3 s.** Hero: name, one-line positioning, a single live network glyph breathing
   behind the type, and a visible pill: *"⚡ Try to break the network."* The pill is the
   brief's required "visible hint".
2. **3–15 s.** Scrolls About → Skills. Sees evidence attached to every skill claim
   (a repo, a number, a tool), not a logo wall.
3. **15–40 s.** Projects: the researchers-network card leads with four real numbers and
   links to the repo and the live feature.
4. **40–90 s.** Plays *Break the Network*. Removes a hub, watches the graph shatter,
   sees articulation points highlighted. Submits a score to the leaderboard.
5. **90–150 s.** "How this is built": the AWS diagram, the services, the cost (zero),
   the failure handling. Confidence in the 25%.
6. **Exit.** LinkedIn / GitHub / email, one tap each.

Every step has a defined job. Nothing exists "because portfolios have one".

---

## 8. Information architecture

Single page, anchored, with the game as an in-page section (the brief requires the
feature not to obstruct navigation, and a separate route creates a dead end for
skimmers).

```
/                       one page, six sections
├── #top                Hero — identity, positioning, hint pill
├── #about              About Me            (required section 1)
├── #skills             Tech Superpowers    (required section 2)
├── #work               Projects & Proof    (required section 3)
├── #lab                Break the Network   (creative feature)
├── #build              How this is built   (AWS, for the 25%)
└── #contact            Contact / footer
```

Secondary routes: `/result?r=<payload>` — a shareable, statically-rendered result card
(Open Graph metadata) so a shared link previews the score. No server needed.

---

## 9. Feature prioritisation

Scored as (judge impact × confidence) / effort, on a 1–5 scale. Only features that map
to a scored rubric line survive.

| Feature | Impact | Conf. | Effort | Verdict |
|---|---:|---:|---:|---|
| Break the Network (playable cascade) | 5 | 5 | 4 | **Build — centrepiece** |
| Three required sections, excellent typography | 5 | 5 | 2 | **Build** |
| On-site AWS architecture section | 4 | 5 | 2 | **Build** |
| Global leaderboard (Lambda + DynamoDB) | 4 | 4 | 3 | **Build, degrade gracefully** |
| Shareable result URL + OG card | 3 | 5 | 2 | **Build** |
| Projects with real metrics | 5 | 5 | 2 | **Build** |
| Accessibility layer for the canvas | 4 | 4 | 3 | **Build (differentiator)** |
| Structured data + OG/Twitter meta | 3 | 5 | 1 | **Build** |
| Dark/light theme toggle | 2 | 4 | 2 | Skip — one disciplined theme reads stronger |
| Blog / notes section | 2 | 3 | 3 | Skip — no real posts to show |
| Contact form with SES | 2 | 2 | 3 | Skip — needs domain verification; `mailto:` is honest |
| 3D / WebGL background | 3 | 2 | 5 | Skip — bundle cost, mobile risk |

---

## 10. The creative feature

### 10.1 Ten candidates, scored

Each criterion 1–10. Weighted total uses the rubric's own weights where they apply
(Creativity 30%, AWS 25%, Communication 25%, Completeness 20%), with Fun and Portfolio
value as tie-breakers.

| # | Concept | Innov. | Diff. | Judge | AWS | Fun | Portfolio | Total /60 |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | **Break My Network** — playable cascade on the real graph | 9 | 9 | 10 | 7 | 9 | 10 | **54** |
| 2 | Career shortest-path explorer (BFS between skills) | 8 | 7 | 7 | 8 | 7 | 8 | 45 |
| 3 | Ask-my-portfolio RAG on Bedrock | 6 | 8 | 7 | 9 | 6 | 7 | 43 |
| 4 | Time machine: scrub 2022→2026, watch skills appear | 7 | 6 | 7 | 5 | 7 | 7 | 39 |
| 5 | "Find the impostor paper" quiz on real OpenAlex data | 6 | 5 | 6 | 4 | 6 | 6 | 33 |
| 6 | Retro arcade theme toggle | 4 | 5 | 6 | 2 | 7 | 4 | 28 |
| 7 | Museum of unfinished projects | 6 | 3 | 6 | 2 | 5 | 6 | 28 |
| 8 | Superpower vending machine | 4 | 3 | 5 | 3 | 6 | 3 | 24 |
| 9 | Command-line portfolio | 3 | 4 | 5 | 2 | 5 | 4 | 23 |
| 10 | Digital scratch card reveal | 3 | 2 | 4 | 2 | 5 | 3 | 19 |

### 10.2 Why #1 wins

- **It is un-copyable.** It requires the dataset. No template, no tutorial, no other
  entrant can reproduce it without doing the same crawl and cleaning.
- **It inverts the portfolio contract.** Instead of *telling* a judge the work is hard,
  it lets them spend ten seconds discovering it. That is the strongest possible answer
  to "Creativity and memorability".
- **The interaction is a decision, not a reveal.** The visitor chooses *which* researcher
  to remove — and the choice is the actual research question (targeted vs random
  failure). The feature teaches the finding by making the visitor feel it.
- **It is the narrative spine.** Hero motif, section transitions, the AWS write-up and
  the submission story all hang off it. One idea, executed deeply, beats five ideas
  executed shallowly.
- **It fails safely.** It is a local computation over a static JSON file. No API, no
  cold start, no network dependency. The leaderboard is the only online part, and it
  degrades to local-only.

### 10.3 The one-sentence rule

> *"Remove the researchers who hold the network together — and watch it fall apart."*

If the feature cannot be explained in that sentence, it is too complicated for a judge
who is 40 submissions deep.

### 10.4 Honesty boundary (non-negotiable)

The game runs on a **real induced subgraph** of the core analysis network, exported
once from the submitted CSV. The UI states the sample size and the fact that it is a
sample, on screen, permanently. The full 14,574-node result stays in the docs. No
number in the game is invented; `LCC%` is computed live in the browser from the actual
edges.

---

## 11. Success metrics

| Metric | Target | How it is verified |
|---|---|---|
| Lighthouse Performance / A11y / Best practices / SEO | ≥ 95 each | Local production build, desktop + mobile preset |
| First contentful paint | < 1.2 s on a simulated 4G profile | Lighthouse trace |
| JS shipped on first paint | ≤ 120 KB gzip | Build output report |
| Time to first interaction with the game | ≤ 1 click from any scroll position | Manual test |
| Keyboard completeness | 100% of tasks without a mouse | Manual + axe |
| Console errors in production | 0 | Manual sweep of every section |
| Deployed and reachable at judging time | Yes | Amplify URL re-checked on deadline day |

---

## 12. Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Amplify deploy fails near the deadline | Medium | Push a known-good build early; keep the GitHub-connected build as the source of truth; verify the URL daily |
| Leaderboard API misconfigured (CORS/region) | Medium | Feature is optional at runtime; a failed fetch renders "local best" with no error toast |
| Canvas game unreadable on small screens | Medium | Purpose-built mobile mode (fewer nodes, larger radii, tap targets ≥ 44 px) |
| Judge does not find the feature | Low | Persistent hint pill + prominent section + in-hero teaser |
| Writing the write-up at the last hour | High | Draft the submission text as the build proceeds, in `docs/SUBMISSION.md` |

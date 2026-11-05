import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchLeaderboard,
  leaderboardConfigured,
  submitRun,
  type LeaderboardEntry,
} from '@/lib/api';
import {
  getPersonalBest,
  getPlayerName,
  recordPersonalBest,
  setPlayerName,
} from '@/lib/storage';
import { Leaderboard } from '../molecules/Leaderboard';
import { fragility } from '@/app/content';
import { NetworkCanvas } from './NetworkCanvas';
import { survivingDegrees, parseNetworkData, type NetworkData } from './graph';
import { useCascade } from './useCascade';

type LoadState =
  | { readonly status: 'idle' | 'loading' }
  | { readonly status: 'ready'; readonly data: NetworkData }
  | { readonly status: 'error' };

type SubmitState = 'idle' | 'sending' | 'sent' | 'offline';

/** Reads a shared score from the query string, if one is present. */
function readSharedScore(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('score');
  if (!raw) return null;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

/**
 * Shell for the creative feature.
 *
 * The dataset is fetched only when the section approaches the viewport, so the first
 * paint never waits on it. Once loaded, the game is handed to `NetworkLab`, which keeps
 * the game's hooks free of null checks and makes the loading states explicit.
 */
export function Sphere() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [load, setLoad] = useState<LoadState>({ status: 'idle' });
  const [sharedScore] = useState<number | null>(readSharedScore);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element || load.status !== 'idle') return;

    const observer = new IntersectionObserver(
      (records) => {
        if (!records.some((record) => record.isIntersecting)) return;
        observer.disconnect();
        setLoad({ status: 'loading' });

        fetch('/data/network.json')
          .then((response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json() as Promise<unknown>;
          })
          .then((payload) => {
            const parsed = parseNetworkData(payload);
            if (!parsed) throw new Error('Invalid network payload');
            setLoad({ status: 'ready', data: parsed });
          })
          .catch(() => setLoad({ status: 'error' }));
      },
      { rootMargin: '400px 0px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [load.status]);

  return (
    <section id="lab" className="section lab" aria-labelledby="lab-title" ref={sectionRef}>
      <div className="container">
        <header className="section-head">
          <p className="mono">05 — The Lab</p>
          <h2 id="lab-title">Break the network.</h2>
          <p>
            This is a real region of Pakistan's computer-science collaboration network:
            researchers are nodes, shared papers are edges. Remove the eight people who hold
            it together and watch how much of the network falls away from the rest.
          </p>
          <p className="lab__hint">
            <span aria-hidden="true">⚡</span> Hover to inspect a researcher, click to remove
            them. Undo is free.
          </p>
        </header>

        {sharedScore !== null ? (
          <p className="lab__shared" role="status">
            Someone shared a run that isolated <strong>{sharedScore.toFixed(1)}%</strong> of
            this network. See if you can do better.
          </p>
        ) : null}

        {load.status === 'ready' ? (
          <NetworkLab data={load.data} />
        ) : load.status === 'error' ? (
          <div className="lab__fallback" role="status">
            <p>
              The network data could not load. The dataset and the script that exports it are
              in the repository — the rest of this page works without it.
            </p>
            <a className="button button--ghost" href="https://github.com/gmkhizar19">
              View the source
            </a>
          </div>
        ) : (
          <div className="lab__stage lab__stage--loading">
            <div className="skeleton skeleton--canvas" aria-hidden="true" />
            <p className="mono">loading 380 researchers…</p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------- */

interface NetworkLabProps {
  readonly data: NetworkData;
}

/** The game itself. Receives loaded data, owns interaction, scoring and persistence. */
function NetworkLab({ data }: NetworkLabProps) {
  const cascade = useCascade(data);
  const [showCuts, setShowCuts] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [entries, setEntries] = useState<readonly LeaderboardEntry[] | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(leaderboardConfigured);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [name, setName] = useState(() => getPlayerName());
  const [best, setBest] = useState(() => getPersonalBest());
  const [copied, setCopied] = useState(false);

  const isolationPercent = cascade.summary.isolationFraction * 100;
  const complete = cascade.status === 'complete';
  const allDone = cascade.removalsLeft === 0;

  useEffect(() => {
    if (!leaderboardConfigured) return;
    let active = true;
    fetchLeaderboard()
      .then((result) => {
        if (active) setEntries(result);
      })
      .finally(() => {
        if (active) setLeaderboardLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleRemove = useCallback(
    (node: number) => {
      if (cascade.removalsLeft <= 0 || !cascade.alive[node]) return;
      cascade.remove(node);
      setAnnouncement(`${data.nodes[node]?.name ?? 'Researcher'} removed.`);
    },
    [cascade, data.nodes],
  );

  useEffect(() => {
    if (!complete) return;
    setBest(
      recordPersonalBest({
        isolationPercent,
        removals: cascade.order.length,
        at: new Date().toISOString(),
      }),
    );
  }, [complete, cascade.order.length, isolationPercent]);

  const submitScore = useCallback(async () => {
    const trimmed = name.trim().slice(0, 24);
    if (trimmed.length === 0) return;

    setPlayerName(trimmed);
    setSubmitState('sending');

    const result = await submitRun({
      name: trimmed,
      isolationPercent: Number(isolationPercent.toFixed(1)),
      removals: cascade.order.length,
      sampleSize: data.meta.sample.nodes,
    });

    if (result.ok) {
      setSubmitState('sent');
      setEntries(await fetchLeaderboard());
    } else {
      setSubmitState('offline');
    }
  }, [cascade.order.length, data.meta.sample.nodes, isolationPercent, name]);

  const share = useCallback(async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('score', isolationPercent.toFixed(1));
    url.hash = 'lab';

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Break the network',
          text: `I isolated ${isolationPercent.toFixed(1)}% of a real research network in ${cascade.order.length} moves.`,
          url: url.toString(),
        });
        return;
      }
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Sharing is optional; a blocked clipboard must not produce a visible error.
    }
  }, [cascade.order.length, isolationPercent]);

  const keyboardNodes = useMemo(() => {
    const degrees = survivingDegrees(cascade.adjacency, cascade.alive);
    return data.nodes
      .filter((node) => cascade.alive[node.i] === 1)
      .map((node) => ({ node, degree: degrees[node.i] ?? 0 }))
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 20);
  }, [cascade.adjacency, cascade.alive, data.nodes]);

  const componentRows = useMemo(
    () =>
      cascade.summary.components.slice(0, 5).map((component, index) => ({
        index,
        size: component.length,
        sample: component
          .slice(0, 3)
          .map((node) => data.nodes[node]?.name ?? '')
          .join(', '),
      })),
    [cascade.summary.components, data.nodes],
  );

  const groups = cascade.summary.components.length;
  const liveSummary = `${isolationPercent.toFixed(1)} percent isolated across ${groups} ${
    groups === 1 ? 'group' : 'groups'
  }. ${cascade.removalsLeft} ${cascade.removalsLeft === 1 ? 'removal' : 'removals'} left.`;

  return (
    <>
      <div className="lab__grid">
        <div className="lab__stage">
          <div className="hud" role="group" aria-label="Network state">
            <div className="hud__cell">
              <span className="hud__label">Removals left</span>
              <span className="hud__value num">
                {cascade.removalsLeft}
                <span className="hud__suffix">/{cascade.budget}</span>
              </span>
            </div>
            <div className="hud__cell">
              <span className="hud__label">Still connected</span>
              <span className="hud__value num">
                {(cascade.summary.lccFraction * 100).toFixed(1)}
                <span className="hud__suffix">%</span>
              </span>
            </div>
            <div className="hud__cell">
              <span className="hud__label">Cut off</span>
              <span className="hud__value num hud__value--signal">
                {isolationPercent.toFixed(1)}
                <span className="hud__suffix">%</span>
              </span>
            </div>
          </div>

          <NetworkCanvas
            data={data}
            alive={cascade.alive}
            summary={cascade.summary}
            showCuts={showCuts}
            disabled={allDone}
            onRemove={handleRemove}
          />

          <div className="lab__controls">
            <button
              type="button"
              className="button button--ghost"
              onClick={cascade.undo}
              disabled={cascade.order.length === 0}
            >
              Undo
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={cascade.reset}
              disabled={cascade.order.length === 0}
            >
              Reset
            </button>
            <button
              type="button"
              className={`button button--ghost${showCuts ? ' is-active' : ''}`}
              onClick={() => setShowCuts((value) => !value)}
              aria-pressed={showCuts}
            >
              {showCuts ? 'Hide weak points' : 'Show weak points'}
            </button>
          </div>

          <div className="canvas-legend" aria-hidden="true">
            <span className="canvas-legend__item canvas-legend__item--live">connected</span>
            <span className="canvas-legend__item canvas-legend__item--cut">cut off</span>
            <span className="canvas-legend__item canvas-legend__item--gone">removed</span>
            <span className="canvas-legend__note">node size = co-authors</span>
          </div>

          <p className="lab__status" aria-live="polite">
            {announcement} {liveSummary}
          </p>
        </div>

        <aside className="lab__panel">
          {complete ? (
            <div className="result">
              <p className="mono">Your run</p>
              <p className="result__score num">{isolationPercent.toFixed(1)}%</p>
              <p className="result__line">
                isolated in {cascade.order.length} removals · {groups} groups remain
              </p>

              <label className="field">
                <span className="field__label">Name for the leaderboard</span>
                <input
                  className="field__input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={24}
                  autoComplete="nickname"
                  placeholder="Your name"
                />
              </label>

              <div className="result__actions">
                <button
                  type="button"
                  className="button button--solid"
                  onClick={submitScore}
                  disabled={
                    name.trim().length === 0 || submitState === 'sending' || submitState === 'sent'
                  }
                >
                  {submitState === 'sending'
                    ? 'Submitting…'
                    : submitState === 'sent'
                      ? 'Submitted'
                      : 'Submit score'}
                </button>
                <button type="button" className="button button--ghost" onClick={share}>
                  {copied ? 'Link copied' : 'Share'}
                </button>
              </div>

              {submitState === 'sent' ? (
                <p className="result__note" role="status">
                  Saved to the global board.
                </p>
              ) : null}
              {submitState === 'offline' ? (
                <p className="result__note result__note--quiet" role="status">
                  The board is unreachable, so this run is saved on your device only.
                </p>
              ) : null}

              <button type="button" className="link-button" onClick={cascade.reset}>
                Play again
              </button>
            </div>
          ) : (
            <div className="lab__brief">
              <p className="mono">How scoring works</p>
              <p>
                Every removal is permanent for the round. Your score is the share of surviving
                researchers no longer connected to the largest group. Higher is better — and
                the best possible result is not obvious.
              </p>
              <ul>
                <li>Node size shows how many co-authors a researcher has.</li>
                <li>Removing a leaf does almost nothing. Removing a bridge can split the map.</li>
                <li>
                  Best on this device:{' '}
                  <strong className="num">
                    {best ? `${best.isolationPercent.toFixed(1)}%` : '—'}
                  </strong>
                </li>
              </ul>
            </div>
          )}

          <Leaderboard
            entries={entries}
            loading={leaderboardLoading}
            configured={leaderboardConfigured}
            highlightName={name.trim()}
          />

          <details className="a11y-panel">
            <summary>Play without a mouse</summary>
            <p className="a11y-panel__intro">
              The map is also available as a list and a table. The buttons below remove a
              researcher, and the result is announced after each change.
            </p>

            <h4>Remove a researcher</h4>
            <ul className="a11y-panel__list">
              {keyboardNodes.map(({ node, degree }) => (
                <li key={node.i}>
                  <button
                    type="button"
                    className="a11y-panel__node"
                    onClick={() => handleRemove(node.i)}
                    disabled={allDone}
                  >
                    <span>{node.name}</span>
                    <span className="mono">{degree} co-authors</span>
                  </button>
                </li>
              ))}
            </ul>

            <h4>Groups remaining</h4>
            <table className="a11y-panel__table">
              <caption className="sr-only">Connected groups after {cascade.order.length} removals</caption>
              <thead>
                <tr>
                  <th scope="col">Group</th>
                  <th scope="col">Researchers</th>
                  <th scope="col">Includes</th>
                </tr>
              </thead>
              <tbody>
                {componentRows.map((row) => (
                  <tr key={row.index}>
                    <td>{row.index === 0 ? 'Largest' : `Group ${row.index + 1}`}</td>
                    <td className="num">{row.size}</td>
                    <td>{row.sample}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </aside>
      </div>

      <p className="lab__provenance">
        <strong>Where this comes from.</strong> {data.meta.source}. Shown here is a{' '}
        {data.meta.sample.nodes}-author region of a{' '}
        {data.meta.fullNetwork.authors.toLocaleString()}-author network (
        {data.meta.fullNetwork.coAuthorshipEdges.toLocaleString()} edges), selected from 80
        candidates for measured fragility: greedy adversarial play isolates{' '}
        {data.meta.sample.greedyIsolationPercent.toFixed(1)}% within{' '}
        {data.meta.sample.removalBudget} removals. The network as a whole is far more robust —
        on the {fragility.coreNodes.toLocaleString()}-author core, removing 10% of authors by
        betweenness only takes the largest component from {fragility.lccBefore}% to{' '}
        {fragility.lccAfterTargeted}% (random removal: {fragility.lccAfterRandom}%). The
        contrast is the finding, not a trick.
      </p>
    </>
  );
}

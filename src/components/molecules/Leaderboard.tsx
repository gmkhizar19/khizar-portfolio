import type { LeaderboardEntry } from '@/lib/api';

interface LeaderboardProps {
  readonly entries: readonly LeaderboardEntry[] | null;
  readonly loading: boolean;
  readonly configured: boolean;
  readonly highlightName?: string;
}

/**
 * Global leaderboard, ranked by how much of the network a player isolated.
 *
 * Every non-happy path is a designed state rather than an error: the feature is optional
 * infrastructure, so "not configured", "loading" and "unreachable" all read as normal.
 */
export function Leaderboard({ entries, loading, configured, highlightName }: LeaderboardProps) {
  return (
    <section className="leaderboard" aria-labelledby="leaderboard-title">
      <div className="leaderboard__head">
        <h3 id="leaderboard-title">Highest isolation</h3>
        <p className="mono">Top 10 · all visitors</p>
      </div>

      {!configured ? (
        <p className="leaderboard__note">
          The global board is not connected in this build. Your best run is saved on this device.
        </p>
      ) : loading ? (
        <ul className="leaderboard__list" aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index} className="leaderboard__row leaderboard__row--skeleton" />
          ))}
        </ul>
      ) : entries === null ? (
        <p className="leaderboard__note">
          The board is unreachable right now — your result still counts on this device.
        </p>
      ) : entries.length === 0 ? (
        <p className="leaderboard__note">
          No runs yet. The first submitted score takes the top row.
        </p>
      ) : (
        <ol className="leaderboard__list">
          {entries.map((entry, index) => {
            const isYou = highlightName !== undefined && entry.name === highlightName;
            return (
              <li
                key={`${entry.createdAt}-${entry.name}-${index}`}
                className={`leaderboard__row${isYou ? ' leaderboard__row--you' : ''}`}
              >
                <span className="leaderboard__rank mono">{String(index + 1).padStart(2, '0')}</span>
                <span className="leaderboard__name">{entry.name}</span>
                <span className="leaderboard__score num">{entry.isolationPercent.toFixed(1)}%</span>
                <span className="leaderboard__moves mono">{entry.removals}×</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

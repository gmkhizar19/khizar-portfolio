/**
 * storage.ts — versioned localStorage helpers.
 *
 * A portfolio must never crash because a browser has stale data from a previous build,
 * so every read validates its shape and every write is wrapped. The version prefix makes
 * a future schema change a clean break instead of a migration bug.
 */

const PREFIX = 'gmk.portfolio.v1';

export interface PersonalBest {
  readonly isolationPercent: number;
  readonly removals: number;
  readonly at: string;
}

function read<T>(key: string, validate: (value: unknown) => value is T): T | null {
  try {
    const raw = window.localStorage.getItem(`${PREFIX}.${key}`);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(`${PREFIX}.${key}`, JSON.stringify(value));
  } catch {
    // Private browsing or a full quota: the feature still works, it just forgets.
  }
}

const isPersonalBest = (value: unknown): value is PersonalBest => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<PersonalBest>;
  return (
    typeof candidate.isolationPercent === 'number' &&
    typeof candidate.removals === 'number' &&
    typeof candidate.at === 'string'
  );
};

export function getPersonalBest(): PersonalBest | null {
  return read('best', isPersonalBest);
}

/** Store a result only if it beats the stored one. Returns the result that is now best. */
export function recordPersonalBest(next: PersonalBest): PersonalBest {
  const current = getPersonalBest();
  if (current && current.isolationPercent >= next.isolationPercent) return current;
  write('best', next);
  return next;
}

export function getPlayerName(): string {
  return read('name', (value): value is string => typeof value === 'string' && value.length <= 24) ?? '';
}

export function setPlayerName(name: string): void {
  write('name', name.slice(0, 24));
}

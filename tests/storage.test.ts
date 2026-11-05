/**
 * Tests for the localStorage layer.
 *
 * The failure this guards against is not "a score was lost" — it is "the page crashes
 * because a previous build wrote a different shape under the same key". Every read path
 * here must survive garbage, and every write path must survive a browser that refuses to
 * store anything (private mode, full quota).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getPersonalBest,
  getPlayerName,
  recordPersonalBest,
  setPlayerName,
} from '@/lib/storage';

/** Minimal in-memory stand-in for Storage; only the methods storage.ts uses. */
class FakeStorage {
  private readonly map = new Map<string, string>();
  public mayThrow = false;

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.mayThrow) throw new DOMException('QuotaExceededError');
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  seed(key: string, value: string): void {
    this.map.set(key, value);
  }
}

let store: FakeStorage;

beforeEach(() => {
  store = new FakeStorage();
  vi.stubGlobal('window', { localStorage: store });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('personal best', () => {
  it('returns null when nothing has been stored', () => {
    expect(getPersonalBest()).toBeNull();
  });

  it('stores the first result', () => {
    const stored = recordPersonalBest({
      isolationPercent: 40,
      removals: 8,
      at: '2026-11-04T00:00:00.000Z',
    });
    expect(stored.isolationPercent).toBe(40);
    expect(getPersonalBest()).toEqual(stored);
  });

  it('keeps the better score and ignores a worse one', () => {
    recordPersonalBest({ isolationPercent: 55, removals: 8, at: 'first' });
    const kept = recordPersonalBest({ isolationPercent: 12, removals: 1, at: 'second' });

    expect(kept.isolationPercent).toBe(55);
    expect(kept.at).toBe('first');
    expect(getPersonalBest()?.at).toBe('first');
  });

  it('replaces the stored score when it is beaten', () => {
    recordPersonalBest({ isolationPercent: 20, removals: 8, at: 'first' });
    const kept = recordPersonalBest({ isolationPercent: 61.5, removals: 8, at: 'second' });

    expect(getPersonalBest()?.at).toBe('second');
    expect(kept.isolationPercent).toBe(61.5);
  });

  it('does not replace on an equal score, even with fewer removals', () => {
    // Documented limitation: ranking here is isolation-only. The server-side leaderboard
    // breaks ties by removals; the personal best does not, and this test says so.
    recordPersonalBest({ isolationPercent: 50, removals: 8, at: 'first' });
    recordPersonalBest({ isolationPercent: 50, removals: 3, at: 'second' });
    expect(getPersonalBest()?.at).toBe('first');
  });

  it('survives corrupt JSON in storage', () => {
    store.seed('gmk.portfolio.v1.best', '{not json');
    expect(getPersonalBest()).toBeNull();
  });

  it('survives a valid JSON value with the wrong shape', () => {
    store.seed('gmk.portfolio.v1.best', JSON.stringify({ isolationPercent: 'high' }));
    expect(getPersonalBest()).toBeNull();
  });

  it('survives a browser that refuses to write', () => {
    store.mayThrow = true;
    // recordPersonalBest must still return the value so the UI can show it for this visit.
    const result = recordPersonalBest({ isolationPercent: 70, removals: 5, at: 'now' });
    expect(result.isolationPercent).toBe(70);
    expect(getPersonalBest()).toBeNull();
  });
});

describe('player name', () => {
  it('round-trips a normal name', () => {
    setPlayerName('Khizar');
    expect(getPlayerName()).toBe('Khizar');
  });

  it('truncates to 24 characters, matching the server-side limit', () => {
    setPlayerName('a'.repeat(40));
    expect(getPlayerName()).toHaveLength(24);
  });

  it('ignores a stored name that is too long', () => {
    // A name written by an older build must not be trusted just because it parses.
    store.seed('gmk.portfolio.v1.name', JSON.stringify('b'.repeat(25)));
    expect(getPlayerName()).toBe('');
  });

  it('ignores a stored value that is not a string', () => {
    store.seed('gmk.portfolio.v1.name', JSON.stringify({ name: 'x' }));
    expect(getPlayerName()).toBe('');
  });
});

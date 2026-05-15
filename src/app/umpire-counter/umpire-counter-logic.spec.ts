import { describe, expect, it } from 'vitest';
import {
  buildOverHistory,
  computeChaseStatus,
  computeRunRate,
  deriveExtrasBreakdown,
  deriveScoreTotals,
  deriveState,
  formatExtrasBreakdown,
  formatScorecardShare,
  isBetweenOversPause,
  newEventId,
  oversDecimalToFloat
} from './umpire-counter-logic';
import type { UmpireEvent } from './umpire-counter.model';

const limits = { ballsPerOver: 6, maxWickets: 10, maxOvers: 20 };

function runs(n: number): UmpireEvent {
  return { id: newEventId(), t: Date.now(), kind: 'runs', runs: n };
}

function wide(extra = 0): UmpireEvent {
  return { id: newEventId(), t: Date.now(), kind: 'wd', extraRuns: extra };
}

describe('oversDecimalToFloat', () => {
  it('parses whole and partial overs', () => {
    expect(oversDecimalToFloat('4', 6)).toBe(4);
    expect(oversDecimalToFloat('4.3', 6)).toBeCloseTo(4.5);
  });
});

describe('computeRunRate', () => {
  it('returns null before any balls', () => {
    expect(computeRunRate(0, '0', 6)).toBeNull();
  });

  it('computes RR after balls', () => {
    expect(computeRunRate(30, '4.3', 6)).toBe('6.67');
  });
});

describe('buildOverHistory / between overs', () => {
  it('rolls over after six legal balls', () => {
    const events = [0, 1, 2, 3, 4, 5].map(runs);
    const h = buildOverHistory(events, limits, null);
    expect(h.length).toBe(2);
    expect(h[0]!.isComplete).toBe(true);
    expect(h[0]!.events.length).toBe(6);
    expect(h[1]!.events.length).toBe(0);
    expect(isBetweenOversPause(h)).toBe(true);
  });

  it('wide does not complete an over alone', () => {
    const events = [runs(0), runs(0), runs(0), runs(0), runs(0), wide()];
    const h = buildOverHistory(events, limits, null);
    expect(h[0]!.isComplete).toBe(false);
    expect(h[0]!.events.length).toBe(6);
  });
});

describe('deriveState / undo shape', () => {
  it('counts wickets and decimal overs', () => {
    const events = [runs(4), runs(6), { id: newEventId(), t: 1, kind: 'w' as const }];
    const d = deriveState(events, limits, null);
    expect(d.wickets).toBe(1);
    expect(d.oversDecimal).toBe('0.3');
    expect(deriveScoreTotals(events).battingRuns).toBe(10);
  });
});

describe('computeChaseStatus', () => {
  it('computes runs needed and RRR', () => {
    const derived = { completedFullOvers: 10, legalBallsThisOver: 0 };
    const chase = computeChaseStatus(180, 120, derived, 20, 6)!;
    expect(chase.runsNeeded).toBe(60);
    expect(chase.ballsRemaining).toBe(60);
    expect(chase.requiredRunRate).toBe('6.00');
  });

  it('returns null when no chase target', () => {
    expect(computeChaseStatus(0, 50, { completedFullOvers: 1, legalBallsThisOver: 0 }, 20, 6)).toBeNull();
  });
});

describe('formatExtrasBreakdown', () => {
  it('lists wide and no-ball counts', () => {
    const events = [wide(), wide(), wide(), wide(), wide(), { id: 'n', t: 1, kind: 'nb' as const, extraRuns: 0 }, { id: 'n2', t: 2, kind: 'nb' as const, extraRuns: 0 }];
    expect(formatExtrasBreakdown(deriveExtrasBreakdown(events))).toBe('7 (5WD,2NB)');
  });

  it('shows 0 when no extras', () => {
    expect(formatExtrasBreakdown(deriveExtrasBreakdown([]))).toBe('0');
  });
});

describe('formatScorecardShare', () => {
  it('includes team and overs', () => {
    const events = [runs(4), runs(1)];
    const overs = buildOverHistory(events, limits, null).filter(s => s.events.length > 0);
    const text = formatScorecardShare({
      teamName: 'Home XI',
      totals: deriveScoreTotals(events),
      oversDecimal: '0.2',
      wickets: 0,
      maxOvers: 20,
      ballsPerOver: 6,
      overs
    });
    expect(text).toContain('Home XI');
    expect(text).toContain('Score: 5/0');
    expect(text).toContain('1st:');
  });
});

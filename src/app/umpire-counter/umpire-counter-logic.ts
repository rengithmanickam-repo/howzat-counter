import type { UmpireCarry, UmpireEvent, UmpireEventKind, UmpireKeypad, UmpireLimits } from './umpire-counter.model';

/** One row in the full-over history (derived from `events` only). */
export interface UmpireOverSlice {
  /** 1-based over number */
  overNumber: number;
  events: UmpireEvent[];
  /** False for the in-progress over at the end */
  isComplete: boolean;
}

export interface UmpireScoreTotals {
  /** Runs off the bat (0–6 taps only). */
  battingRuns: number;
  /** Wides/no-balls (1 + extra per chip), leg-byes, byes (1 each). */
  extrasRuns: number;
  battingRunsPlusExtras: number;
}

export interface UmpireDerivedState {
  /** e.g. "4.3" */
  oversDecimal: string;
  completedFullOvers: number;
  legalBallsThisOver: number;
  wickets: number;
  previousOver: UmpireEvent[];
  currentOver: UmpireEvent[];
  /** 1-based over index for the current strip */
  currentOverNumber: number;
  /** 1-based; null when there is no completed over to show */
  previousOverNumber: number | null;
  /** Block wicket button */
  wicketsCapped: boolean;
}

export function newEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `e-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function isLegalConsumer(kind: UmpireEventKind): boolean {
  return kind === 'runs' || kind === 'w' || kind === 'lb' || kind === 'bye';
}

export function chipLabel(e: UmpireEvent): string {
  switch (e.kind) {
    case 'runs':
      return String(e.runs ?? 0);
    case 'w': {
      const r = clampRun(e.runs);
      return r === 0 ? 'W' : `W+${r}`;
    }
    case 'wd': {
      const x = clampExtra(e.extraRuns);
      const base = `Wd+${x}`;
      return e.wicketOnDelivery ? `${base}+W` : base;
    }
    case 'nb': {
      const x = clampExtra(e.extraRuns);
      const base = `Nb+${x}`;
      return e.wicketOnDelivery ? `${base}+W` : base;
    }
    case 'lb': {
      const x = clampExtra(e.extraRuns);
      return x === 0 ? 'Lb' : `Lb+${x}`;
    }
    case 'bye': {
      const x = clampExtra(e.extraRuns);
      return x === 0 ? 'B' : `B+${x}`;
    }
    default:
      return '?';
  }
}

function clampExtra(n: number | undefined): number {
  const x = typeof n === 'number' && !Number.isNaN(n) ? Math.trunc(n) : 0;
  return Math.min(6, Math.max(0, x));
}

function clampRun(n: number | undefined): number {
  const x = typeof n === 'number' && !Number.isNaN(n) ? Math.trunc(n) : 0;
  return Math.min(6, Math.max(0, x));
}

/**
 * Batting runs: sum of 0–6 taps + runs completed before a wicket (e.g. run out after crossing).
 * Extras: wide/no-ball as **1 + extraRuns** each; leg-bye / bye as **extraRuns** (min 1).
 */
export function deriveScoreTotals(events: readonly UmpireEvent[]): UmpireScoreTotals {
  let battingRuns = 0;
  let extrasRuns = 0;
  for (const e of events) {
    switch (e.kind) {
      case 'runs':
        battingRuns += clampRun(e.runs);
        break;
      case 'w':
        battingRuns += clampRun(e.runs);
        break;
      case 'wd':
      case 'nb':
        extrasRuns += 1 + clampExtra(e.extraRuns);
        break;
      case 'lb':
      case 'bye':
        extrasRuns += Math.max(1, clampExtra(e.extraRuns));
        break;
      default:
        break;
    }
  }
  return {
    battingRuns,
    extrasRuns,
    battingRunsPlusExtras: battingRuns + extrasRuns
  };
}

/**
 * Completed overs plus the current (possibly empty) over, in order.
 * Over numbers align with decimal overs / carry (first logged ball continues the carried over).
 */
export function buildOverHistory(
  events: readonly UmpireEvent[],
  limits: UmpireLimits,
  carry: UmpireCarry | null | undefined
): UmpireOverSlice[] {
  const bpo = Math.max(1, Math.min(12, Math.trunc(limits.ballsPerOver)));
  let fullOvers = carry?.fullOvers ?? 0;
  let legalInOver = carry?.legalBalls ?? 0;
  let curOverNum = fullOvers + 1;
  const cur: UmpireEvent[] = [];
  const out: UmpireOverSlice[] = [];

  for (const e of events) {
    cur.push(e);
    if (isLegalConsumer(e.kind)) {
      legalInOver++;
      if (legalInOver >= bpo) {
        out.push({ overNumber: curOverNum, events: cur.slice(), isComplete: true });
        cur.length = 0;
        legalInOver = 0;
        fullOvers++;
        curOverNum++;
      }
    }
  }
  out.push({ overNumber: curOverNum, events: cur.slice(), isComplete: false });
  return out;
}

/** Same ordinals as live scoring (1st, 2nd, 3rd, 11th, …). */
export function formatOrdinalOver(num: number): string {
  const suffix = ['th', 'st', 'nd', 'rd'];
  const v = num % 100;
  return num + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
}

/** Last `max` overs (most recent last in `history`), reversed for display; use a large `max` to list all overs in a scroll panel. */
export function getRecentOverBarSlices(history: readonly UmpireOverSlice[], max = 5): UmpireOverSlice[] {
  if (!history.some(s => s.events.length > 0)) return [];
  const tail = history.slice(-max);
  return [...tail].reverse();
}

export interface UmpireOverBallCell {
  key: string;
  text: string;
  /** e.g. "3.4" — over number and legal ball in that over */
  deliveryLabel: string;
  boxClass: string;
}

/**
 * One column per delivery (label + score box), most recent first.
 */
export function umpireOverSliceToBallCells(
  events: readonly UmpireEvent[],
  overNumber: number
): UmpireOverBallCell[] {
  let legalInOver = 0;
  const cells: UmpireOverBallCell[] = [];

  for (const e of events) {
    const legalBefore = legalInOver;
    if (isLegalConsumer(e.kind)) {
      legalInOver++;
    }
    const ballInOver = isLegalConsumer(e.kind) ? legalInOver : Math.max(1, legalBefore + 1);
    const deliveryLabel = `${overNumber}.${ballInOver}`;

    cells.push({
      key: e.id,
      text: umpireEventBallText(e),
      deliveryLabel,
      boxClass: umpireEventBallClass(e)
    });
  }

  return cells.reverse();
}

function umpireEventBallClass(e: UmpireEvent): string {
  if (e.kind === 'w') return 'wicket';
  if ((e.kind === 'wd' || e.kind === 'nb') && e.wicketOnDelivery) return 'wicket';
  if (e.kind === 'wd' || e.kind === 'nb' || e.kind === 'lb' || e.kind === 'bye') return 'extras';
  if (e.kind === 'runs') {
    const r = clampRun(e.runs);
    if (r === 4) return 'runs-4';
    if (r === 6) return 'runs-6';
    if (r > 0) return '';
  }
  return '';
}

function umpireEventBallText(e: UmpireEvent): string {
  switch (e.kind) {
    case 'runs': {
      const r = clampRun(e.runs);
      return r === 0 ? '.' : String(r);
    }
    case 'w': {
      const r = clampRun(e.runs);
      return r === 0 ? 'W' : `W+${r}`;
    }
    case 'wd': {
      const x = clampExtra(e.extraRuns);
      const base = x === 0 ? 'WD' : `WD+${x}`;
      return e.wicketOnDelivery ? `${base}+W` : base;
    }
    case 'nb': {
      const x = clampExtra(e.extraRuns);
      const base = x === 0 ? 'NB' : `NB+${x}`;
      return e.wicketOnDelivery ? `${base}+W` : base;
    }
    case 'lb': {
      const x = clampExtra(e.extraRuns);
      return x <= 1 ? 'LB' : `LB+${x}`;
    }
    case 'bye': {
      const x = clampExtra(e.extraRuns);
      return x <= 1 ? 'B' : `B+${x}`;
    }
    default:
      return '?';
  }
}

/**
 * Replays `events` after optional migrated `carry` to derive totals and over strips.
 */
export function deriveState(
  events: readonly UmpireEvent[],
  limits: UmpireLimits,
  carry: UmpireCarry | null | undefined
): UmpireDerivedState {
  const bpo = Math.max(1, Math.min(12, Math.trunc(limits.ballsPerOver)));

  let fullOvers = carry?.fullOvers ?? 0;
  let legalInOver = carry?.legalBalls ?? 0;
  let wkts = carry?.wickets ?? 0;

  let prev: UmpireEvent[] = [];
  let cur: UmpireEvent[] = [];

  for (const e of events) {
    cur = [...cur, e];

    if (e.kind === 'w') {
      wkts++;
    }
    if ((e.kind === 'wd' || e.kind === 'nb') && e.wicketOnDelivery) {
      wkts++;
    }

    if (isLegalConsumer(e.kind)) {
      legalInOver++;
      if (legalInOver >= bpo) {
        prev = cur;
        cur = [];
        legalInOver = 0;
        fullOvers++;
      }
    }
  }

  const oversDecimal = formatDecimalOvers(fullOvers, legalInOver, bpo);
  const wicketsCapped = wkts >= limits.maxWickets;

  const currentOverNumber = fullOvers + 1;
  const previousOverNumber = prev.length > 0 ? fullOvers : null;

  return {
    oversDecimal,
    completedFullOvers: fullOvers,
    legalBallsThisOver: legalInOver,
    wickets: wkts,
    previousOver: prev,
    currentOver: cur,
    currentOverNumber,
    previousOverNumber,
    wicketsCapped
  };
}

/**
 * Cricket overs string: `15.5` means 15 complete overs and 5 legal balls in the current over
 * (the digit after the dot is the ball count, not a fraction of one over).
 */
export function formatDecimalOvers(fullOvers: number, legalBalls: number, bpo: number): string {
  const f = Math.max(0, fullOvers);
  const l = Math.max(0, Math.min(bpo, legalBalls));
  if (l === 0) {
    return String(f);
  }
  return `${f}.${l}`;
}

export function defaultKeypadForPreset(preset: 'leather' | 'tennis' | 'custom'): UmpireKeypad {
  if (preset === 'tennis') {
    return {
      preset: 'tennis',
      showLb: false,
      showBye: true,
      showWide: true,
      showNoBall: true
    };
  }
  return {
    preset: 'leather',
    showLb: true,
    showBye: true,
    showWide: true,
    showNoBall: true
  };
}

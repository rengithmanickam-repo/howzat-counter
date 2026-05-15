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

export interface UmpireExtrasBreakdown {
  wides: number;
  noBalls: number;
  legByes: number;
  byes: number;
}

export function deriveExtrasBreakdown(events: readonly UmpireEvent[]): UmpireExtrasBreakdown {
  let wides = 0;
  let noBalls = 0;
  let legByes = 0;
  let byes = 0;
  for (const e of events) {
    switch (e.kind) {
      case 'wd':
        wides++;
        break;
      case 'nb':
        noBalls++;
        break;
      case 'lb':
        legByes++;
        break;
      case 'bye':
        byes++;
        break;
      default:
        break;
    }
  }
  return { wides, noBalls, legByes, byes };
}

/** e.g. `2 (1WD,1NB)` or `0` when no extras logged. */
export function formatExtrasBreakdown(b: UmpireExtrasBreakdown): string {
  const total = b.wides + b.noBalls + b.legByes + b.byes;
  if (total === 0) return '0';

  const parts: string[] = [];
  if (b.wides > 0) parts.push(`${b.wides}WD`);
  if (b.noBalls > 0) parts.push(`${b.noBalls}NB`);
  if (b.legByes > 0) parts.push(`${b.legByes}LB`);
  if (b.byes > 0) parts.push(`${b.byes}B`);
  return `${total} (${parts.join(',')})`;
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

/** Decimal overs for run-rate (e.g. `4.3` with 6 bpo → 4.5). */
export function oversDecimalToFloat(oversDecimal: string, ballsPerOver: number): number {
  const bpo = Math.max(1, Math.min(12, Math.trunc(ballsPerOver)));
  const dot = oversDecimal.indexOf('.');
  if (dot === -1) {
    const f = parseInt(oversDecimal, 10);
    return Number.isFinite(f) ? Math.max(0, f) : 0;
  }
  const full = parseInt(oversDecimal.slice(0, dot), 10) || 0;
  const balls = parseInt(oversDecimal.slice(dot + 1), 10) || 0;
  return full + Math.min(bpo, Math.max(0, balls)) / bpo;
}

/** Current run rate, or null when no balls bowled. */
export function computeRunRate(
  totalRuns: number,
  oversDecimal: string,
  ballsPerOver: number
): string | null {
  const overs = oversDecimalToFloat(oversDecimal, ballsPerOver);
  if (overs <= 0) return null;
  return (totalRuns / overs).toFixed(2);
}

/** True when the bar shows a finished over and the next over has no balls yet. */
export function isBetweenOversPause(history: readonly UmpireOverSlice[]): boolean {
  if (history.length < 2) return false;
  const last = history[history.length - 1]!;
  const prev = history[history.length - 2]!;
  return last.events.length === 0 && prev.isComplete && prev.events.length > 0;
}

/** Chase / second-innings target helpers. */
export interface ChaseStatus {
  target: number;
  runsNeeded: number;
  ballsRemaining: number | null;
  requiredRunRate: string | null;
  targetReached: boolean;
}

export function legalBallsBowled(
  derived: Pick<UmpireDerivedState, 'completedFullOvers' | 'legalBallsThisOver'>,
  ballsPerOver: number
): number {
  const bpo = Math.max(1, Math.min(12, Math.trunc(ballsPerOver)));
  return derived.completedFullOvers * bpo + derived.legalBallsThisOver;
}

export function ballsRemainingInInnings(
  derived: Pick<UmpireDerivedState, 'completedFullOvers' | 'legalBallsThisOver'>,
  maxOvers: number,
  ballsPerOver: number
): number | null {
  if (maxOvers <= 0) return null;
  const bpo = Math.max(1, Math.min(12, Math.trunc(ballsPerOver)));
  const total = maxOvers * bpo;
  const bowled = legalBallsBowled(derived, bpo);
  return Math.max(0, total - bowled);
}

/** Runs still needed to reach `chaseTarget`, or null when not chasing. */
export function computeChaseStatus(
  chaseTarget: number,
  currentRuns: number,
  derived: Pick<UmpireDerivedState, 'completedFullOvers' | 'legalBallsThisOver'>,
  maxOvers: number,
  ballsPerOver: number
): ChaseStatus | null {
  const target = Math.trunc(chaseTarget);
  if (target <= 0) return null;

  const current = Math.max(0, Math.trunc(currentRuns));
  const runsNeeded = Math.max(0, target - current);
  const targetReached = current >= target;
  const ballsRemaining = ballsRemainingInInnings(derived, maxOvers, ballsPerOver);

  let requiredRunRate: string | null = null;
  if (!targetReached && ballsRemaining !== null && ballsRemaining > 0) {
    const bpo = Math.max(1, Math.min(12, Math.trunc(ballsPerOver)));
    const oversLeft = ballsRemaining / bpo;
    requiredRunRate = (runsNeeded / oversLeft).toFixed(2);
  }

  return {
    target,
    runsNeeded,
    ballsRemaining,
    requiredRunRate,
    targetReached
  };
}

export interface ScorecardShareInput {
  teamName?: string;
  totals: UmpireScoreTotals;
  oversDecimal: string;
  wickets: number;
  maxOvers: number;
  ballsPerOver: number;
  overs: readonly UmpireOverSlice[];
  chaseStatus?: ChaseStatus | null;
}

/** Plain-text scorecard for clipboard / share. */
export function formatScorecardShare(input: ScorecardShareInput): string {
  const lines: string[] = [];
  const title = input.teamName?.trim();
  if (title) lines.push(title);
  const cap =
    input.maxOvers > 0 ? ` (${input.oversDecimal}/${input.maxOvers} overs)` : ` (${input.oversDecimal} overs)`;
  lines.push(
    `Score: ${input.totals.battingRunsPlusExtras}/${input.wickets}${cap}`,
    `Extras: ${formatExtrasBreakdown(deriveExtrasBreakdown(
      input.overs.flatMap(s => s.events)
    ))} (${input.totals.extrasRuns} runs)`
  );
  const rr = computeRunRate(
    input.totals.battingRunsPlusExtras,
    input.oversDecimal,
    input.ballsPerOver
  );
  if (rr) lines.push(`Run rate: ${rr}`);
  const chase = input.chaseStatus;
  if (chase) {
    if (chase.targetReached) {
      lines.push(`Chase target ${chase.target}: reached`);
    } else {
      const balls =
        chase.ballsRemaining !== null ? ` from ${chase.ballsRemaining} balls` : '';
      const rrr = chase.requiredRunRate ? ` | RRR ${chase.requiredRunRate}` : '';
      lines.push(`Need ${chase.runsNeeded} to win${balls}${rrr} (target ${chase.target})`);
    }
  }
  const logged = input.overs.filter(s => s.events.length > 0);
  if (logged.length > 0) {
    lines.push('', 'Overs:');
    for (const slice of logged) {
      const cells = umpireOverSliceToBallCells(slice.events, slice.overNumber);
      const balls = [...cells].reverse().map(c => c.text).join(' ');
      const runs = deriveScoreTotals(slice.events).battingRunsPlusExtras;
      lines.push(
        `${formatOrdinalOver(slice.overNumber)}: ${runs} run${runs === 1 ? '' : 's'} — ${balls}`
      );
    }
  }
  return lines.join('\n');
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

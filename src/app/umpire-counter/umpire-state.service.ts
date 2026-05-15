import { Injectable, computed, signal } from '@angular/core';
import {
  UMPIRE_STORAGE_V1,
  UMPIRE_STORAGE_V2,
  UMPIRE_SETUP_DEFAULTS,
  type UmpireCarry,
  type UmpireCounterV1Payload,
  type UmpireCounterV2Payload,
  type UmpireEvent,
  type UmpireKeypad,
  type UmpireSetupConfig,
  type KeypadPreset
} from './umpire-counter.model';
import {
  buildOverHistory,
  defaultKeypadForPreset,
  deriveScoreTotals,
  deriveState,
  newEventId
} from './umpire-counter-logic';

const LIMIT_DEFAULTS = { ballsPerOver: 6, maxWickets: 11, maxOvers: 0 };
const OVERS_HARD_CAP = 999;

const SETUP_DEFAULTS: UmpireSetupConfig = {
  overs: 20,
  ballsPerOver: 6,
  wickets: 11,
  showWide: true,
  showNoBall: true,
  showLb: false,
  showBye: false
};

function clampInt(n: unknown, min: number, max: number): number {
  const x = typeof n === 'number' && !Number.isNaN(n) ? Math.trunc(n) : min;
  return Math.min(max, Math.max(min, x));
}

function sanitizeEvents(raw: unknown): UmpireEvent[] {
  if (!Array.isArray(raw)) return [];
  const out: UmpireEvent[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const kind = r['kind'];
    if (kind !== 'runs' && kind !== 'w' && kind !== 'wd' && kind !== 'nb' && kind !== 'lb' && kind !== 'bye') continue;
    const id = typeof r['id'] === 'string' ? r['id'] : newEventId();
    const t = typeof r['t'] === 'number' ? r['t'] : Date.now();
    if (kind === 'runs') {
      out.push({ id, t, kind: 'runs', runs: clampInt(r['runs'] ?? 0, 0, 6) });
    } else if (kind === 'wd' || kind === 'nb') {
      const wk = Boolean(r['wicketOnDelivery']);
      out.push({ id, t, kind, extraRuns: clampInt(r['extraRuns'], 0, 6), ...(wk ? { wicketOnDelivery: true as const } : {}) });
    } else if (kind === 'lb' || kind === 'bye') {
      out.push({ id, t, kind, extraRuns: clampInt(r['extraRuns'] ?? 1, 0, 6) });
    } else if (kind === 'w') {
      const runs = clampInt(r['runs'] ?? 0, 0, 6);
      out.push({ id, t, kind, ...(runs > 0 ? { runs } : {}) });
    } else {
      out.push({ id, t, kind });
    }
  }
  return out;
}

@Injectable({ providedIn: 'root' })
export class UmpireStateService {
  readonly ballsPerOver = signal(LIMIT_DEFAULTS.ballsPerOver);
  readonly maxWickets = signal(LIMIT_DEFAULTS.maxWickets);
  readonly maxOvers = signal(LIMIT_DEFAULTS.maxOvers);

  readonly events = signal<UmpireEvent[]>([]);
  readonly redoStack = signal<UmpireEvent[]>([]);
  readonly carry = signal<UmpireCarry | null>(null);
  readonly keypad = signal<UmpireKeypad>(defaultKeypadForPreset('leather'));
  readonly noHistoryBannerDismissed = signal(false);
  readonly sessionActive = signal(false);

  readonly limitsSig = computed(() => ({
    ballsPerOver: this.ballsPerOver(),
    maxWickets: this.maxWickets(),
    maxOvers: this.maxOvers()
  }));

  readonly derived = computed(() => deriveState(this.events(), this.limitsSig(), this.carry()));
  readonly scoreTotals = computed(() => deriveScoreTotals(this.events()));
  readonly overHistory = computed(() => buildOverHistory(this.events(), this.limitsSig(), this.carry()));

  /**
   * Home tab over strip: in-progress over, or the just-finished over while the next
   * over is still empty (until the scorer logs the first ball via the keypad).
   */
  readonly currentOverBarSlice = computed(() => {
    const h = this.overHistory();
    if (h.length === 0) return null;
    const last = h[h.length - 1]!;
    if (last.events.length > 0) return last;
    if (h.length < 2) return null;
    const prev = h[h.length - 2]!;
    return prev.isComplete && prev.events.length > 0 ? prev : null;
  });

  /** History tab: every over that has at least one logged ball, oldest first. */
  readonly historyOversChronological = computed(() =>
    this.overHistory().filter(s => s.events.length > 0)
  );

  readonly canRedo = computed(() => this.redoStack().length > 0);

  readonly oversCapped = computed(() => {
    const mo = this.maxOvers();
    if (mo <= 0) return false;
    const d = this.derived();
    return d.completedFullOvers >= mo && d.legalBallsThisOver === 0;
  });

  readonly matchCapped = computed(() => {
    return this.oversCapped() || this.derived().wicketsCapped;
  });

  private loaded = false;

  ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.load();
  }

  startSession(config: UmpireSetupConfig): void {
    this.ballsPerOver.set(clampInt(config.ballsPerOver, 1, 12));
    this.maxWickets.set(clampInt(config.wickets, 1, 20));
    this.maxOvers.set(clampInt(config.overs, 1, OVERS_HARD_CAP));
    this.keypad.set({
      preset: 'custom',
      showWide: config.showWide,
      showNoBall: config.showNoBall,
      showLb: config.showLb,
      showBye: config.showBye
    });
    this.events.set([]);
    this.redoStack.set([]);
    this.carry.set(null);
    this.noHistoryBannerDismissed.set(false);
    this.sessionActive.set(true);
    this.persist();
    this.saveSetupDefaults(config);
  }

  loadSetupDefaults(): UmpireSetupConfig {
    try {
      const raw = localStorage.getItem(UMPIRE_SETUP_DEFAULTS);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UmpireSetupConfig>;
        return {
          overs: clampInt(parsed.overs ?? SETUP_DEFAULTS.overs, 1, OVERS_HARD_CAP),
          ballsPerOver: clampInt(parsed.ballsPerOver ?? SETUP_DEFAULTS.ballsPerOver, 1, 12),
          wickets: clampInt(parsed.wickets ?? SETUP_DEFAULTS.wickets, 1, 20),
          showWide: parsed.showWide ?? SETUP_DEFAULTS.showWide,
          showNoBall: parsed.showNoBall ?? SETUP_DEFAULTS.showNoBall,
          showLb: parsed.showLb ?? SETUP_DEFAULTS.showLb,
          showBye: parsed.showBye ?? SETUP_DEFAULTS.showBye
        };
      }
    } catch { /* ignore */ }
    return { ...SETUP_DEFAULTS };
  }

  private saveSetupDefaults(config: UmpireSetupConfig): void {
    try {
      localStorage.setItem(UMPIRE_SETUP_DEFAULTS, JSON.stringify(config));
    } catch { /* ignore */ }
  }

  pushEvent(e: UmpireEvent): void {
    this.redoStack.set([]);
    this.events.update(arr => [...arr, e]);
    this.persist();
  }

  undoEvent(): UmpireEvent | null {
    const arr = this.events();
    if (arr.length === 0) return null;
    const last = arr[arr.length - 1]!;
    this.redoStack.update(s => [...s, last]);
    this.events.update(a => a.slice(0, -1));
    this.persist();
    return last;
  }

  redo(): void {
    const stack = this.redoStack();
    if (stack.length === 0) return;
    const e = stack[stack.length - 1]!;
    this.redoStack.set(stack.slice(0, -1));
    this.events.update(a => [...a, e]);
    this.persist();
  }

  resetAll(): void {
    this.events.set([]);
    this.redoStack.set([]);
    this.carry.set(null);
    this.noHistoryBannerDismissed.set(false);
    this.sessionActive.set(false);
    this.persist();
  }

  dismissMigrationBanner(): void {
    this.noHistoryBannerDismissed.set(true);
    this.persist();
  }

  applyPreset(p: KeypadPreset): void {
    if (p === 'custom') {
      this.keypad.update(k => ({ ...k, preset: 'custom' }));
    } else {
      this.keypad.set(defaultKeypadForPreset(p));
    }
    this.persist();
  }

  updateKeypad(patch: Partial<UmpireKeypad>): void {
    this.keypad.update(k => ({ ...k, ...patch, preset: 'custom' as KeypadPreset }));
    this.persist();
  }

  applyMatchLimits(data: { ballsPerOver: string; maxWickets: string; maxOvers: string }): void {
    const bpoN = parseInt(data.ballsPerOver.replace(/\D/g, ''), 10);
    const mwN = parseInt(data.maxWickets.replace(/\D/g, ''), 10);
    const moN = parseInt(data.maxOvers.replace(/\D/g, ''), 10);

    this.ballsPerOver.set(Number.isFinite(bpoN) ? clampInt(bpoN, 1, 12) : LIMIT_DEFAULTS.ballsPerOver);
    this.maxWickets.set(Number.isFinite(mwN) ? clampInt(mwN, 1, 20) : LIMIT_DEFAULTS.maxWickets);
    this.maxOvers.set(!data.maxOvers.trim() || !Number.isFinite(moN) ? 0 : clampInt(moN, 0, OVERS_HARD_CAP));

    this.clampCarryToLimits();
    this.persist();
  }

  persist(): void {
    const payload: UmpireCounterV2Payload = {
      schemaVersion: 2,
      limits: this.limitsSig(),
      keypad: this.keypad(),
      events: this.events(),
      carry: this.carry(),
      noHistoryBannerDismissed: this.noHistoryBannerDismissed(),
      sessionActive: this.sessionActive()
    };
    try {
      localStorage.setItem(UMPIRE_STORAGE_V2, JSON.stringify(payload));
    } catch { /* ignore */ }
  }

  private load(): void {
    try {
      const rawV2 = localStorage.getItem(UMPIRE_STORAGE_V2);
      if (rawV2) {
        this.applyV2Payload(JSON.parse(rawV2) as UmpireCounterV2Payload);
        return;
      }
      const rawV1 = localStorage.getItem(UMPIRE_STORAGE_V1);
      if (rawV1) {
        this.migrateFromV1(JSON.parse(rawV1) as UmpireCounterV1Payload);
        this.persist();
      }
    } catch { /* ignore */ }
  }

  private applyV2Payload(p: UmpireCounterV2Payload): void {
    if (p.schemaVersion !== 2) return;
    const lim = p.limits ?? {};
    this.ballsPerOver.set(clampInt(lim.ballsPerOver ?? LIMIT_DEFAULTS.ballsPerOver, 1, 12));
    this.maxWickets.set(clampInt(lim.maxWickets ?? LIMIT_DEFAULTS.maxWickets, 1, 20));
    this.maxOvers.set(clampInt(lim.maxOvers ?? LIMIT_DEFAULTS.maxOvers, 0, OVERS_HARD_CAP));

    const kp = p.keypad;
    if (kp && typeof kp === 'object') {
      const preset: KeypadPreset =
        kp.preset === 'tennis' || kp.preset === 'custom' || kp.preset === 'leather' ? kp.preset : 'leather';
      this.keypad.set({ preset, showLb: !!kp.showLb, showBye: !!kp.showBye, showWide: kp.showWide !== false, showNoBall: kp.showNoBall !== false });
    } else {
      this.keypad.set(defaultKeypadForPreset('leather'));
    }

    this.events.set(sanitizeEvents(p.events));
    this.redoStack.set([]);
    const c = p.carry;
    if (c && typeof c === 'object') {
      this.carry.set({ fullOvers: clampInt(c.fullOvers, 0, OVERS_HARD_CAP), legalBalls: clampInt(c.legalBalls, 0, 11), wickets: clampInt(c.wickets, 0, 30) });
      this.clampCarryToLimits();
    } else {
      this.carry.set(null);
    }
    this.noHistoryBannerDismissed.set(!!p.noHistoryBannerDismissed);
    this.sessionActive.set(!!p.sessionActive);
  }

  private migrateFromV1(v1: UmpireCounterV1Payload): void {
    const bpo = clampInt(v1.ballsPerOver ?? LIMIT_DEFAULTS.ballsPerOver, 1, 12);
    const mxw = clampInt(v1.maxWickets ?? LIMIT_DEFAULTS.maxWickets, 1, 20);
    const mxo = clampInt(v1.maxOvers ?? LIMIT_DEFAULTS.maxOvers, 0, OVERS_HARD_CAP);
    this.ballsPerOver.set(bpo);
    this.maxWickets.set(mxw);
    this.maxOvers.set(mxo);

    const capB = Math.max(0, bpo - 1);
    const capO = mxo > 0 ? mxo : OVERS_HARD_CAP;
    this.carry.set({ fullOvers: clampInt(v1.overs ?? 0, 0, capO), legalBalls: clampInt(v1.balls ?? 0, 0, capB), wickets: clampInt(v1.wickets ?? 0, 0, mxw) });
    this.events.set([]);
    this.redoStack.set([]);
    this.keypad.set(defaultKeypadForPreset('leather'));
    this.noHistoryBannerDismissed.set(false);
    this.sessionActive.set(false);
  }

  private clampCarryToLimits(): void {
    const c = this.carry();
    if (!c) return;
    const bpo = this.ballsPerOver();
    const capB = Math.max(0, bpo - 1);
    const capO = this.maxOvers() > 0 ? this.maxOvers() : OVERS_HARD_CAP;
    this.carry.set({
      fullOvers: clampInt(c.fullOvers, 0, capO),
      legalBalls: clampInt(c.legalBalls, 0, capB),
      wickets: clampInt(c.wickets, 0, this.maxWickets())
    });
  }
}

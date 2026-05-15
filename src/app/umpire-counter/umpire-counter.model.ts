export type UmpireEventKind = 'runs' | 'w' | 'wd' | 'nb' | 'lb' | 'bye';

export type KeypadPreset = 'leather' | 'tennis' | 'custom';

export interface UmpireEvent {
  id: string;
  t: number;
  kind: UmpireEventKind;
  /** For kind `runs`, 0–6. For `w`, completed runs before dismissal (e.g. run out after crossing). */
  runs?: number;
  /** For `wd` / `nb`, extras off the delivery, 0–6 */
  extraRuns?: number;
  /** With `wd` / `nb`: wicket on the same delivery (e.g. run out on a wide). */
  wicketOnDelivery?: boolean;
}

export interface UmpireLimits {
  ballsPerOver: number;
  maxWickets: number;
  maxOvers: number;
}

export interface UmpireKeypad {
  showLb: boolean;
  showBye: boolean;
  showWide: boolean;
  showNoBall: boolean;
  preset: KeypadPreset;
}

/** Totals carried from v1 migration when we have no fabricated ball history */
export interface UmpireCarry {
  fullOvers: number;
  legalBalls: number;
  wickets: number;
}

export interface UmpireCounterV2Payload {
  schemaVersion: 2;
  limits: UmpireLimits;
  keypad: UmpireKeypad;
  events: UmpireEvent[];
  carry?: UmpireCarry | null;
  noHistoryBannerDismissed?: boolean;
  sessionActive?: boolean;
}

export interface UmpireSetupConfig {
  overs: number;
  ballsPerOver: number;
  wickets: number;
  showWide: boolean;
  showNoBall: boolean;
  showLb: boolean;
  showBye: boolean;
}

export const UMPIRE_STORAGE_V1 = 'umpireCounterV1';
export const UMPIRE_STORAGE_V2 = 'umpireCounterV2';
export const UMPIRE_SETUP_DEFAULTS = 'umpireSetupDefaults';

export interface UmpireCounterV1Payload {
  balls: number;
  overs: number;
  wickets: number;
  ballsPerOver?: number;
  maxWickets?: number;
  maxOvers?: number;
}

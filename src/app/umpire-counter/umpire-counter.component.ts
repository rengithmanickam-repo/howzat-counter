import { Component, OnInit, computed, signal, viewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonButton,
  IonNote,
  ToastController
} from '@ionic/angular/standalone';
import {
  chipLabel as umpireFormatChip,
  deriveScoreTotals,
  formatOrdinalOver,
  newEventId,
  type UmpireOverBallCell,
  type UmpireOverSlice,
  umpireOverSliceToBallCells
} from './umpire-counter-logic';
import type { UmpireEvent } from './umpire-counter.model';
import { UmpireStateService } from './umpire-state.service';

@Component({
  selector: 'app-umpire-counter',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonButton,
    IonNote
  ],
  template: `
    <ion-content [fullscreen]="false" class="umpire-ion-content">
      <div class="umpire-page">
        <div class="top-stack">
          @if (showMigrationBanner()) {
            <div class="migrate-banner" role="status">
              <ion-note>
                Imported match position from the old counter. No ball-by-ball history before this session. Runs and
                extras below count only from balls you log from here.
              </ion-note>
              <ion-button size="small" fill="clear" (click)="state.dismissMigrationBanner()">Dismiss</ion-button>
            </div>
          }

          <div
            class="summary-card summary-card--mega"
            role="status"
            aria-live="polite"
            [attr.aria-label]="summaryAriaLabel()"
          >
            <div class="summary-mega summary-mega--single">
              <span class="summary-mega-rw">
                <span class="summary-mega-runs">{{ state.scoreTotals().battingRunsPlusExtras }}</span>
                <span class="summary-mega-slash" aria-hidden="true">/</span>
                <span class="summary-mega-wkts">{{ state.derived().wickets }}</span>
              </span>
              <span class="summary-mega-parens">
                (<span class="summary-mega-decimal">{{ state.derived().oversDecimal }}</span>
                @if (state.maxOvers() > 0) {
                  <span class="summary-mega-target">/{{ state.maxOvers() }} overs</span>
                }
                <span class="summary-mega-paren-close">)</span>
              </span>
            </div>
          </div>

          @if (pendingWicket()) {
            <div class="pending-banner" role="status">
              <ion-note>
                Wicket — tap <strong>0–6</strong> for runs completed before dismissal (e.g. run out after crossing),
                or <strong>Done (+0)</strong> for no runs (bowled, caught, LBW, etc.).
              </ion-note>
            </div>
          } @else if (pendingWideNb()) {
            <div class="pending-banner" role="status">
              @if (pendingWideAwaitingWicket()) {
                <ion-note>
                  {{ pendingExtraLabel() }} + {{ pendingWideExtraRuns() }} runs. Wicket on
                  the same delivery (e.g. run out)? Tap <strong>W</strong>, or <strong>No wicket</strong> (Done).
                </ion-note>
              } @else if (pendingWideNb() === 'lb') {
                <ion-note>
                  Leg bye — tap <strong>1–4</strong> for runs, or <strong>Done (+1)</strong> for a single leg bye.
                </ion-note>
              } @else if (pendingWideNb() === 'bye') {
                <ion-note>
                  Bye — tap <strong>1–4</strong> for runs, or <strong>Done (+1)</strong> for a single bye.
                </ion-note>
              } @else if (pendingWideNb() === 'wd') {
                <ion-note>
                  Wide — tap <strong>0–6</strong> for runs off the wide, <strong>W</strong> for a wicket on this wide
                  (e.g. run out, 0 runs off bat), or <strong>Done (+0)</strong> for wide only.
                </ion-note>
              } @else {
                <ion-note>
                  No-ball — tap <strong>0–6</strong> for runs off the no-ball, <strong>W</strong> for a wicket on this
                  no-ball, or <strong>Done (+0)</strong> for no-ball only.
                </ion-note>
              }
            </div>
          }
        </div>

        @if (state.events().length > 0) {
          <div class="recent-overs-grow">
            <div class="recent-overs-section">
              <div
                class="overs-scroll-container"
                #recentOversScroll
                role="region"
                aria-label="Recent overs, scroll vertically when needed"
              >
                @for (slice of state.recentOverBar(); track recentOverBarTrack(slice); let last = $last) {
                  <div class="over-item">
                    <div class="over-content">
                      <div class="over-number-col">
                        <span class="over-number">{{ ordinalOver(slice.overNumber) }}</span>
                        @if (!slice.isComplete) {
                          <span class="over-current-pill">Current</span>
                        }
                      </div>
                      <div class="over-runs-inline">
                        <span class="runs-number-inline">{{ sliceTotalRuns(slice) }}</span>
                        <span class="runs-label-inline">RUNS</span>
                      </div>
                      <div class="over-balls-clip">
                        <div class="over-balls-container">
                          @for (cell of sliceBallCells(slice); track cell.key) {
                            <div
                              class="over-ball-box"
                              [class.runs-4]="cell.boxClass === 'runs-4'"
                              [class.runs-6]="cell.boxClass === 'runs-6'"
                              [class.wicket]="cell.boxClass === 'wicket'"
                              [class.extras]="cell.boxClass === 'extras'"
                            >
                              {{ cell.text }}
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                  @if (!last) {
                    <div class="over-separator" aria-hidden="true"></div>
                  }
                }
              </div>
            </div>
          </div>
        }

        <div class="live-region" aria-live="assertive" aria-atomic="true">
          {{ liveAnnouncement() }}
        </div>

        <div class="keypad-panel">
          <div class="keypad-row">
            @for (n of runKeysRow1; track n) {
              <ion-button
                class="keypad-btn"
                expand="block"
                [attr.aria-label]="'Log ' + n + ' runs'"
                (click)="logRuns(n)"
              >
                {{ n }}
              </ion-button>
            }
          </div>
          <div class="keypad-row">
            @for (n of runKeysRow2; track n) {
              <ion-button
                class="keypad-btn"
                expand="block"
                [attr.aria-label]="'Log ' + n + ' runs'"
                (click)="logRuns(n)"
              >
                {{ n }}
              </ion-button>
            }
            <ion-button
              class="keypad-btn"
              color="danger"
              expand="block"
              [disabled]="keyDisabledW()"
              aria-label="Log wicket"
              (click)="logWicket()"
            >
              W
            </ion-button>
          </div>
          <div class="keypad-row keypad-row--extras">
            @if (state.keypad().showWide) {
              <ion-button
                class="keypad-btn keypad-btn--warn"
                expand="block"
                [disabled]="keyDisabledExtrasStart()"
                aria-label="Log wide"
                (click)="startWide()"
              >
                Wd
              </ion-button>
            }
            @if (state.keypad().showNoBall) {
              <ion-button
                class="keypad-btn keypad-btn--warn"
                expand="block"
                [disabled]="keyDisabledExtrasStart()"
                aria-label="Log no-ball"
                (click)="startNoBall()"
              >
                Nb
              </ion-button>
            }
            @if (state.keypad().showLb) {
              <ion-button
                class="keypad-btn"
                expand="block"
                [disabled]="keyDisabledLegalExtras()"
                aria-label="Log leg bye"
                (click)="logLegBye()"
              >
                Lb
              </ion-button>
            }
            @if (state.keypad().showBye) {
              <ion-button
                class="keypad-btn"
                expand="block"
                [disabled]="keyDisabledLegalExtras()"
                aria-label="Log bye"
                (click)="logBye()"
              >
                Bye
              </ion-button>
            }
          </div>
          <div class="keypad-row keypad-row--meta">
            <div class="keypad-meta-primary">
              <ion-button
                fill="outline"
                expand="block"
                class="meta-btn"
                aria-label="Undo last ball"
                [disabled]="!canUndo()"
                (click)="undo()"
              >
                Undo
              </ion-button>
              <ion-button
                fill="outline"
                expand="block"
                class="meta-btn"
                aria-label="Redo last undone ball"
                [disabled]="!state.canRedo()"
                (click)="state.redo(); queueScrollStrip()"
              >
                Redo
              </ion-button>
            </div>
            @if (pendingWicket()) {
              <ion-button
                color="tertiary"
                expand="block"
                class="meta-btn meta-btn--done"
                aria-label="Wicket with no runs"
                (click)="completeWicketPending(0)"
              >
                Done (+0)
              </ion-button>
            } @else if (pendingWideNb()) {
              <ion-button
                color="tertiary"
                expand="block"
                class="meta-btn meta-btn--done"
                [attr.aria-label]="pendingDoneAriaLabel()"
                (click)="completePendingZero()"
              >
                {{ pendingDoneLabel() }}
              </ion-button>
            }
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [
    `
      :host {
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        max-width: 100%;
      }

      .umpire-ion-content {
        --background: var(--ion-background-color, #f4f5f8);
        --padding-top: 8px;
        height: 100%;
      }

      .umpire-page {
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: calc(100dvh - 168px);
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
      }

      .top-stack {
        flex: 0 0 auto;
        padding: 0 14px 8px;
        box-sizing: border-box;
      }

      .migrate-banner {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
        padding: 10px 12px;
        margin-bottom: 10px;
        border-radius: 12px;
        background: var(--ion-color-warning-tint, #fff3cd);
        border: 1px solid var(--ion-color-warning-shade, #e0ac08);
      }

      .migrate-banner ion-note {
        flex: 1;
        font-size: 0.8rem;
        line-height: 1.4;
        color: var(--ion-text-color);
      }

      .summary-card {
        background: var(--ion-card-background, #fff);
        border-radius: 16px;
        margin-bottom: 10px;
        box-shadow: 0 2px 12px rgba(15, 23, 42, 0.06);
      }

      .summary-card--mega {
        margin-left: -14px;
        margin-right: -14px;
        width: calc(100% + 28px);
        max-width: none;
        border-radius: 0;
        padding: 14px 16px 16px;
        box-sizing: border-box;
      }

      .summary-mega--single {
        display: flex;
        flex-wrap: nowrap;
        align-items: baseline;
        justify-content: center;
        column-gap: 0.12em;
        white-space: nowrap;
        row-gap: 0.08em;
        width: 100%;
        text-align: center;
        font-variant-numeric: tabular-nums;
        line-height: 1.05;
        font-size: clamp(2rem, 12vw, 5.85rem);
        font-weight: 800;
        letter-spacing: -0.04em;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .summary-mega--single .summary-mega-rw {
        display: inline-flex;
        align-items: baseline;
        font-size: inherit;
        font-weight: inherit;
        letter-spacing: inherit;
      }

      .summary-mega-parens {
        display: inline;
        margin-left: 0.06em;
        font-weight: 800;
        color: var(--ion-text-color);
        letter-spacing: -0.03em;
      }

      .summary-mega-decimal {
        font-weight: 800;
        color: var(--ion-text-color);
      }

      .summary-mega-target {
        font-weight: 700;
        font-size: 0.58em;
        letter-spacing: -0.02em;
        color: var(--ion-color-medium-shade, #5f6368);
      }

      .summary-mega-paren-close {
        font-weight: 800;
      }

      .summary-mega--single .summary-mega-runs {
        color: var(--ion-color-primary-shade, #4854e0);
      }

      .summary-mega--single .summary-mega-slash {
        margin: 0 0.03em;
        font-weight: 800;
        opacity: 0.45;
        color: var(--ion-text-color);
      }

      .summary-mega--single .summary-mega-wkts {
        color: var(--ion-text-color);
      }

      .pending-banner {
        padding: 8px 12px 12px;
        margin-bottom: 4px;
      }

      .pending-banner ion-note {
        font-size: 0.82rem;
        line-height: 1.45;
      }

      .recent-overs-grow {
        flex: 1 1 0;
        min-height: 0;
        display: flex;
        flex-direction: column;
        margin: 0 14px 8px;
        box-sizing: border-box;
      }

      .recent-overs-section {
        flex: 1 1 0;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding: 10px 6px 10px;
        background: #ffffff;
        border-radius: 12px;
        border: 1px solid var(--border-color, #e2e8f0);
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
        box-sizing: border-box;
      }

      .recent-overs-section .overs-scroll-container {
        flex: 1 1 0;
        min-height: 0;
        height: 0;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        flex-wrap: nowrap;
        gap: 0;
        overflow-x: hidden;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: 4px 2px 8px;
        scrollbar-gutter: stable;
        scrollbar-width: thin;
        scrollbar-color: var(--border-color, #e2e8f0) transparent;
      }

      .recent-overs-section .over-item {
        display: flex;
        flex-shrink: 0;
        width: 100%;
        box-sizing: border-box;
        padding: 4px 8px;
      }

      .recent-overs-section .over-content {
        display: grid;
        grid-template-columns: auto auto minmax(0, 1fr);
        align-items: center;
        column-gap: 10px;
        width: 100%;
        min-width: 0;
        box-sizing: border-box;
      }

      .recent-overs-section .over-balls-clip {
        min-width: 0;
        overflow: hidden;
      }

      .recent-overs-section .over-balls-container {
        display: flex;
        gap: 4px;
        flex-wrap: nowrap;
        align-items: center;
        justify-content: flex-start;
        overflow-x: auto;
        overflow-y: hidden;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
        scrollbar-color: var(--border-color, #e2e8f0) transparent;
        padding: 2px 0 6px;
      }

      .recent-overs-section .over-balls-container::-webkit-scrollbar {
        height: 4px;
      }
      .recent-overs-section .over-balls-container::-webkit-scrollbar-track {
        background: transparent;
      }
      .recent-overs-section .over-balls-container::-webkit-scrollbar-thumb {
        background: var(--border-color, #cbd5e1);
        border-radius: 4px;
      }

      .recent-overs-section .over-number-col {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }

      .recent-overs-section .over-number {
        font-size: clamp(13px, 2.8vmin, 18px);
        font-weight: 700;
        color: var(--ion-color-medium-shade, #5f6368);
        font-variant-numeric: tabular-nums;
        line-height: 1.1;
        white-space: nowrap;
      }

      .recent-overs-section .over-current-pill {
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        padding: 2px 6px;
        border-radius: 999px;
        background: rgba(var(--ion-color-primary-rgb, 56, 128, 255), 0.12);
        color: var(--ion-color-primary-shade, #4854e0);
        white-space: nowrap;
        flex-shrink: 0;
      }

      .recent-overs-section .over-runs-inline {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: baseline;
        gap: 5px;
        white-space: nowrap;
      }

      .recent-overs-section .runs-number-inline {
        font-size: clamp(15px, 3.5vmin, 22px);
        font-weight: 800;
        color: var(--ion-text-color);
        font-variant-numeric: tabular-nums;
        line-height: 1.2;
        text-align: left;
      }

      .recent-overs-section .runs-label-inline {
        font-size: clamp(9px, 2vmin, 11px);
        color: var(--ion-color-medium-shade, #5f6368);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        line-height: 1.2;
      }

      .recent-overs-section .over-separator {
        flex-shrink: 0;
        align-self: stretch;
        width: auto;
        height: 1px;
        min-height: 1px;
        margin: 6px 10px;
        background: #e2e8f0;
      }

      .recent-overs-section .over-ball-box {
        flex-shrink: 0;
        min-width: clamp(26px, 7.5vmin, 44px);
        height: clamp(28px, 7.5vmin, 48px);
        padding: 0 clamp(3px, 1vmin, 6px);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: 6px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: clamp(8px, 2.1vmin, 12px);
        font-weight: 700;
        color: var(--ion-text-color);
        background: #f8fafc;
        line-height: 1;
        box-sizing: border-box;
        white-space: nowrap;
      }

      .recent-overs-section .over-ball-box.runs-4 {
        background: var(--success-green, var(--ion-color-success));
        color: white;
        border-color: var(--success-green, var(--ion-color-success));
      }

      .recent-overs-section .over-ball-box.runs-6 {
        background: #9333ea;
        color: white;
        border-color: #9333ea;
      }

      .recent-overs-section .over-ball-box.wicket {
        background: var(--error-red, var(--ion-color-danger));
        color: white;
        border-color: var(--error-red, var(--ion-color-danger));
      }

      .recent-overs-section .over-ball-box.extras {
        background: #fef3c7;
        color: #78350f;
        border-color: #d97706;
        font-weight: 800;
      }

      .live-region {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      .keypad-panel {
        flex-shrink: 0;
        padding: 12px 12px 12px;
        margin-top: 0;
        background: linear-gradient(180deg, rgba(244, 245, 248, 0) 0%, var(--ion-background-color, #f4f5f8) 14px);
        border-top: 1px solid var(--ion-color-light-shade, rgba(0, 0, 0, 0.06));
      }

      .keypad-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-bottom: 10px;
      }

      .keypad-row--extras {
        grid-template-columns: repeat(4, 1fr);
      }

      .keypad-row--meta {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: stretch;
        gap: 8px;
        margin-bottom: 0;
      }

      .keypad-meta-primary {
        display: flex;
        flex: 1 1 0;
        min-width: 0;
        gap: 8px;
      }

      .keypad-meta-primary .meta-btn {
        flex: 1 1 0;
        min-width: 0;
      }

      .keypad-row--meta .meta-btn--done {
        flex: 0 1 7.5rem;
        min-width: 0;
      }

      .keypad-btn {
        min-height: clamp(52px, 11dvh, 80px);
        margin: 0;
        font-weight: 700;
        font-size: clamp(1rem, 2.8dvh, 1.35rem);
      }

      .keypad-btn--warn {
        --background: #fcd34d;
        --color: #422006;
        --border-width: 2px;
        --border-style: solid;
        --border-color: #b45309;
        font-weight: 800;
      }

      .meta-btn {
        margin: 0;
        min-height: clamp(46px, 9dvh, 64px);
      }
    `
  ]
})
export class UmpireCounterComponent implements OnInit {
  readonly formatUmpireChip = umpireFormatChip;
  readonly state = inject(UmpireStateService);
  private readonly toastController = inject(ToastController);

  readonly runKeysRow1 = [0, 1, 2, 3] as const;
  readonly runKeysRow2 = [4, 5, 6] as const;

  readonly pendingWideNb = signal<'wd' | 'nb' | 'lb' | 'bye' | null>(null);
  readonly pendingWideExtraRuns = signal<number | null>(null);
  readonly pendingWicket = signal(false);

  private readonly recentOversScroll = viewChild<ElementRef<HTMLElement>>('recentOversScroll');

  readonly summaryAriaLabel = computed(() => {
    const runs = this.state.scoreTotals().battingRunsPlusExtras;
    const wkts = this.state.derived().wickets;
    const overs = this.state.derived().oversDecimal;
    const cap = this.state.maxOvers();
    if (cap > 0) return `${runs} for ${wkts}, ${overs} of ${cap} overs`;
    return `${runs} for ${wkts}, ${overs} overs`;
  });

  readonly showMigrationBanner = computed(
    () => this.state.carry() !== null && !this.state.noHistoryBannerDismissed() && this.state.events().length === 0
  );

  readonly liveAnnouncement = computed(() => {
    const evs = this.state.events();
    if (evs.length === 0) return '';
    return this.formatUmpireChip(evs[evs.length - 1]!);
  });

  readonly pendingWideAwaitingWicket = computed(
    () => this.pendingWideNb() !== null && this.pendingWideExtraRuns() !== null
  );

  readonly keyDisabledW = computed(
    () => this.state.derived().wicketsCapped || this.pendingWicket()
  );

  readonly keyDisabledExtrasStart = computed(
    () => this.pendingWideNb() !== null || this.pendingWicket()
  );

  readonly keyDisabledLegalExtras = computed(
    () => this.pendingWideNb() !== null || this.pendingWicket()
  );

  readonly pendingIsLegalExtra = computed(() => {
    const p = this.pendingWideNb();
    return p === 'lb' || p === 'bye';
  });

  readonly pendingExtraLabel = computed(() => {
    switch (this.pendingWideNb()) {
      case 'wd': return 'Wide';
      case 'nb': return 'No-ball';
      case 'lb': return 'Leg bye';
      case 'bye': return 'Bye';
      default: return '';
    }
  });

  readonly pendingDoneLabel = computed(() => {
    if (this.pendingWideAwaitingWicket()) return 'No wicket';
    return this.pendingIsLegalExtra() ? 'Done (+1)' : 'Done (+0)';
  });

  readonly pendingDoneAriaLabel = computed(() => {
    if (this.pendingWideAwaitingWicket()) return 'Confirm no wicket on this delivery';
    return this.pendingIsLegalExtra()
      ? 'Log single leg bye or bye'
      : 'Complete extra with no runs off bat';
  });

  readonly canUndo = computed(
    () => this.pendingWideNb() !== null || this.pendingWicket() || this.state.events().length > 0
  );

  ngOnInit(): void {
    this.state.ensureLoaded();
    this.queueScrollStrip();
  }

  ordinalOver(n: number): string {
    return formatOrdinalOver(n);
  }

  sliceTotalRuns(slice: UmpireOverSlice): number {
    return deriveScoreTotals(slice.events).battingRunsPlusExtras;
  }

  sliceBallCells(slice: UmpireOverSlice): UmpireOverBallCell[] {
    return umpireOverSliceToBallCells(slice.events);
  }

  recentOverBarTrack(slice: UmpireOverSlice): string {
    return `${slice.overNumber}-${slice.isComplete ? 'c' : 'o'}-${slice.events.map(e => e.id).join('.')}`;
  }

  logRuns(n: number): void {
    if (this.pendingWicket()) {
      this.completeWicketPending(clampInt(n, 0, 6));
      return;
    }
    const p = this.pendingWideNb();
    if (p !== null) {
      if (p === 'lb' || p === 'bye') {
        this.completeExtra(clampInt(n, 0, 6), false);
      } else {
        this.pendingWideExtraRuns.set(clampInt(n, 0, 6));
      }
      return;
    }
    this.pushEvent({ id: newEventId(), t: Date.now(), kind: 'runs', runs: clampInt(n, 0, 6) });
  }

  logWicket(): void {
    if (this.pendingWideNb() !== null) {
      if (this.state.derived().wicketsCapped) {
        void this.toast('Max wickets reached.');
        return;
      }
      const p = this.pendingWideNb()!;
      const defaultRuns = (p === 'lb' || p === 'bye') ? 1 : 0;
      const ex = this.pendingWideExtraRuns();
      this.completeExtra(ex !== null ? ex : defaultRuns, true);
      return;
    }
    if (this.state.derived().wicketsCapped) {
      void this.toast('Max wickets reached.');
      return;
    }
    this.pendingWicket.set(true);
  }

  completeWicketPending(runs: number): void {
    const r = clampInt(runs, 0, 6);
    const ev: UmpireEvent = { id: newEventId(), t: Date.now(), kind: 'w' };
    if (r > 0) ev.runs = r;
    this.pushEvent(ev);
    this.pendingWicket.set(false);
  }

  startWide(): void {
    if (this.pendingWideNb() === 'nb') { void this.toast('Finish the no-ball first.'); return; }
    if (this.pendingWideNb() === 'wd') { void this.toast('Wide already in progress.'); return; }
    this.pendingWideExtraRuns.set(null);
    this.pendingWideNb.set('wd');
  }

  startNoBall(): void {
    if (this.pendingWideNb() === 'wd') { void this.toast('Finish the wide first.'); return; }
    if (this.pendingWideNb() === 'nb') { void this.toast('No-ball already in progress.'); return; }
    this.pendingWideExtraRuns.set(null);
    this.pendingWideNb.set('nb');
  }

  completePendingZero(): void {
    const p = this.pendingWideNb();
    const ex = this.pendingWideExtraRuns();
    if (ex !== null) {
      this.completeExtra(ex, false);
    } else {
      const defaultRuns = (p === 'lb' || p === 'bye') ? 1 : 0;
      this.completeExtra(defaultRuns, false);
    }
  }

  logLegBye(): void {
    if (this.pendingWideNb() !== null) { void this.toast('Finish the current extra first.'); return; }
    this.pendingWideExtraRuns.set(null);
    this.pendingWideNb.set('lb');
  }

  logBye(): void {
    if (this.pendingWideNb() !== null) { void this.toast('Finish the current extra first.'); return; }
    this.pendingWideExtraRuns.set(null);
    this.pendingWideNb.set('bye');
  }

  undo(): void {
    if (this.pendingWicket()) { this.pendingWicket.set(false); return; }
    if (this.pendingWideNb() !== null) {
      if (this.pendingWideExtraRuns() !== null) { this.pendingWideExtraRuns.set(null); return; }
      this.pendingWideNb.set(null);
      this.pendingWideExtraRuns.set(null);
      return;
    }
    this.state.undoEvent();
    this.queueScrollStrip();
  }

  queueScrollStrip(): void {
    requestAnimationFrame(() => this.scrollRecentOversBar());
  }

  private scrollRecentOversBar(): void {
    const el = this.recentOversScroll()?.nativeElement;
    if (el) el.scrollTop = 0;
  }

  private completeExtra(extra: number, wicketOnDelivery: boolean): void {
    const p = this.pendingWideNb();
    if (!p) return;
    const er = clampInt(extra, 0, 6);
    const ev: UmpireEvent = { id: newEventId(), t: Date.now(), kind: p, extraRuns: er };
    if (wicketOnDelivery) ev.wicketOnDelivery = true;
    this.pushEvent(ev);
    this.pendingWideNb.set(null);
    this.pendingWideExtraRuns.set(null);
  }

  private pushEvent(e: UmpireEvent): void {
    this.state.pushEvent(e);
    this.queueScrollStrip();
  }

  private async toast(message: string): Promise<void> {
    const t = await this.toastController.create({ message, duration: 2000, position: 'bottom', cssClass: 'umpire-toast' });
    await t.present();
  }
}

function clampInt(n: unknown, min: number, max: number): number {
  const x = typeof n === 'number' && !Number.isNaN(n) ? Math.trunc(n) : min;
  return Math.min(max, Math.max(min, x));
}

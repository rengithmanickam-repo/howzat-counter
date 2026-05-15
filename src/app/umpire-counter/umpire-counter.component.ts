import { Component, OnInit, computed, signal, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonNote,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { refreshOutline } from 'ionicons/icons';
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
    IonIcon,
    IonNote
  ],
  template: `
    <ion-content [fullscreen]="false" class="umpire-ion-content">
      <div class="umpire-page">
        <div class="umpire-score-head">
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

          @if (state.matchCapped()) {
            <div class="match-complete-banner" role="status">
              <div class="match-complete-text">Match Complete</div>
              <ion-note>
                @if (state.oversCapped()) {
                  All {{ state.maxOvers() }} overs bowled.
                } @else {
                  All {{ state.maxWickets() }} wickets fallen.
                }
              </ion-note>
            </div>
          }
        </div>

        <div class="umpire-mid">
          <div class="umpire-pending-area">
            @if (!state.matchCapped()) {
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
            }
          </div>

          @if (state.currentOverBarSlice(); as slice) {
            <div
              class="current-over-strip"
              role="region"
              [attr.aria-label]="slice.isComplete ? 'Completed over' : 'Current over'"
            >
              <div class="current-over-section">
                <div class="over-item">
                  <div class="over-content">
                    <div class="over-number-col">
                      <span class="over-number">{{ ordinalOver(slice.overNumber) }}</span>
                      @if (!slice.isComplete) {
                        <span class="over-current-pill">Current</span>
                      }
                    </div>
                    <div class="over-runs-col">
                      <span class="runs-number-inline">{{ sliceTotalRuns(slice) }}</span>
                      <span class="runs-label-inline">RUNS</span>
                    </div>
                    <div class="over-balls-clip">
                      <div class="over-balls-container">
                        @for (cell of sliceBallCells(slice); track cell.key) {
                          <div class="over-ball-column">
                            <span class="over-ball-label">{{ cell.deliveryLabel }}</span>
                            <div
                              class="over-ball-box"
                              [class.runs-4]="cell.boxClass === 'runs-4'"
                              [class.runs-6]="cell.boxClass === 'runs-6'"
                              [class.wicket]="cell.boxClass === 'wicket'"
                              [class.extras]="cell.boxClass === 'extras'"
                            >
                              {{ cell.text }}
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }

          <div class="live-region" aria-live="assertive" aria-atomic="true">
            {{ liveAnnouncement() }}
          </div>
        </div>
      </div>

      <div slot="fixed" class="keypad-panel">
        <div class="keypad-row">
            @for (n of runKeysRow1; track n) {
              <ion-button
                class="keypad-btn"
                expand="block"
                [disabled]="state.matchCapped()"
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
                [disabled]="state.matchCapped()"
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
              [disabled]="keyDisabledW() || state.matchCapped()"
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
                [disabled]="keyDisabledExtrasStart() || state.matchCapped()"
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
                [disabled]="keyDisabledExtrasStart() || state.matchCapped()"
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
                [disabled]="keyDisabledLegalExtras() || state.matchCapped()"
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
                [disabled]="keyDisabledLegalExtras() || state.matchCapped()"
                aria-label="Log bye"
                (click)="logBye()"
              >
                Bye
              </ion-button>
            }
          </div>
          <div
            class="keypad-row keypad-row--meta"
            [class.keypad-row--meta-four]="showMetaDoneRow()"
          >
            <ion-button
              fill="outline"
              expand="block"
              size="small"
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
              size="small"
              class="meta-btn"
              aria-label="Redo last undone ball"
              [disabled]="!state.canRedo()"
              (click)="state.redo()"
            >
              Redo
            </ion-button>
            <ion-button
              fill="outline"
              expand="block"
              size="small"
              class="meta-btn meta-btn--reset"
              color="danger"
              aria-label="Reset match"
              (click)="confirmReset()"
            >
              <ion-icon name="refresh-outline" slot="icon-only"></ion-icon>
            </ion-button>
            @if (pendingWicket()) {
              <ion-button
                color="tertiary"
                expand="block"
                size="small"
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
                size="small"
                class="meta-btn meta-btn--done"
                [attr.aria-label]="pendingDoneAriaLabel()"
                (click)="completePendingZero()"
              >
                {{ pendingDoneLabel() }}
              </ion-button>
            }
          </div>
      </div>
    </ion-content>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }

      .umpire-ion-content {
        --background: var(--ion-background-color, #f4f5f8);
        --padding-top: var(--app-safe-top, max(env(safe-area-inset-top, 0px), 12px));
        --padding-start: 0;
        --padding-end: 0;
        --padding-bottom: var(
          --umpire-keypad-offset,
          calc(248px + var(--app-safe-bottom, max(env(safe-area-inset-bottom, 0px), 12px)))
        );
      }

      .umpire-page {
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
        padding-bottom: 8px;
      }

      .umpire-score-head {
        flex: 0 0 auto;
        padding: 8px 14px 0;
        box-sizing: border-box;
      }

      .umpire-mid {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: stretch;
      }

      .umpire-pending-area {
        flex: 0 0 auto;
        max-height: min(32vh, 280px);
        overflow-x: hidden;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }

      .current-over-strip {
        margin: 0 14px 10px;
        box-sizing: border-box;
      }

      .keypad-panel {
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        z-index: 10;
        pointer-events: auto;
        padding: 8px 10px calc(12px + var(--app-safe-bottom, max(env(safe-area-inset-bottom, 0px), 12px)));
        background: var(--ion-background-color, #f4f5f8);
        border-top: 1px solid var(--ion-color-light-shade, rgba(0, 0, 0, 0.06));
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
        padding: 16px 16px 18px;
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
        font-size: clamp(2.35rem, 10vw, 5.25rem);
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
        padding: 0 14px 10px;
        margin-bottom: 0;
      }

      .pending-banner ion-note {
        font-size: 0.82rem;
        line-height: 1.45;
      }

      .current-over-section {
        display: flex;
        flex-direction: column;
        padding: 10px 6px 10px;
        background: #ffffff;
        border-radius: 12px;
        border: 1px solid var(--border-color, #e2e8f0);
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
        box-sizing: border-box;
      }

      .current-over-section .over-item {
        display: flex;
        flex-shrink: 0;
        width: 100%;
        box-sizing: border-box;
        padding: 4px 8px;
      }

      .current-over-section .over-content {
        display: grid;
        grid-template-columns: auto auto minmax(0, 1fr);
        align-items: center;
        column-gap: 12px;
        width: 100%;
        min-width: 0;
        box-sizing: border-box;
      }

      .current-over-section .over-balls-clip {
        min-width: 0;
        overflow: hidden;
      }

      .current-over-section .over-balls-container {
        display: flex;
        gap: 6px;
        flex-wrap: nowrap;
        align-items: flex-end;
        justify-content: flex-start;
        overflow-x: auto;
        overflow-y: hidden;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
        scrollbar-color: var(--border-color, #e2e8f0) transparent;
        padding: 2px 0 6px;
      }

      .current-over-section .over-balls-container::-webkit-scrollbar {
        height: 4px;
      }
      .current-over-section .over-balls-container::-webkit-scrollbar-track {
        background: transparent;
      }
      .current-over-section .over-balls-container::-webkit-scrollbar-thumb {
        background: var(--border-color, #cbd5e1);
        border-radius: 4px;
      }

      .current-over-section .over-number-col {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        gap: 4px;
        min-width: 0;
      }

      .current-over-section .over-number {
        font-size: clamp(13px, 2.8vmin, 18px);
        font-weight: 700;
        color: var(--ion-color-medium-shade, #5f6368);
        font-variant-numeric: tabular-nums;
        line-height: 1.1;
        white-space: nowrap;
      }

      .current-over-section .over-current-pill {
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

      .current-over-section .over-runs-col {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        white-space: nowrap;
      }

      .current-over-section .runs-number-inline {
        font-size: clamp(15px, 3.5vmin, 22px);
        font-weight: 800;
        color: var(--ion-text-color);
        font-variant-numeric: tabular-nums;
        line-height: 1.2;
        text-align: left;
      }

      .current-over-section .runs-label-inline {
        font-size: clamp(9px, 2vmin, 11px);
        color: var(--ion-color-medium-shade, #5f6368);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        line-height: 1.2;
      }

      .current-over-section .over-ball-column {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
      }

      .current-over-section .over-ball-label {
        font-size: clamp(8px, 2vmin, 10px);
        font-weight: 600;
        color: var(--ion-color-medium-shade, #5f6368);
        font-variant-numeric: tabular-nums;
        line-height: 1;
        white-space: nowrap;
      }

      .current-over-section .over-ball-box {
        flex-shrink: 0;
        min-width: clamp(28px, 7.5vmin, 44px);
        height: clamp(28px, 7.5vmin, 44px);
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

      .current-over-section .over-ball-box.runs-4 {
        background: var(--success-green, var(--ion-color-success));
        color: white;
        border-color: var(--success-green, var(--ion-color-success));
      }

      .current-over-section .over-ball-box.runs-6 {
        background: #9333ea;
        color: white;
        border-color: #9333ea;
      }

      .current-over-section .over-ball-box.wicket {
        background: var(--error-red, var(--ion-color-danger));
        color: white;
        border-color: var(--error-red, var(--ion-color-danger));
      }

      .current-over-section .over-ball-box.extras {
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

      .keypad-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-bottom: 8px;
        justify-items: center;
      }

      .keypad-row--extras {
        grid-template-columns: repeat(4, 1fr);
      }

      .keypad-row--meta {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 0;
        align-items: stretch;
        justify-items: stretch;
      }

      .keypad-row--meta.keypad-row--meta-four {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .keypad-row--meta .meta-btn {
        width: 100%;
        margin: 0;
        min-width: 0;
      }

      .keypad-btn {
        margin: 0;
        width: 100%;
        max-width: 72px;
        aspect-ratio: 1;
        min-height: 0;
        height: auto;
        --border-radius: 50%;
        --padding-top: 0;
        --padding-bottom: 0;
        font-weight: 400;
        font-size: clamp(1.5rem, 5vw, 1.75rem);
      }

      .keypad-btn--warn {
        --background: #fcd34d;
        --color: #422006;
        --border-width: 2px;
        --border-style: solid;
        --border-color: #b45309;
        font-weight: 600;
        font-size: clamp(0.95rem, 3.2vw, 1.1rem);
      }

      .meta-btn {
        margin: 0;
        min-height: 36px;
        max-height: 38px;
        font-size: 0.75rem;
        --border-radius: 10px;
        --padding-top: 4px;
        --padding-bottom: 4px;
      }

      .meta-btn--reset {
        min-width: 0;
        max-width: none;
      }

      .meta-btn--reset ion-icon {
        font-size: 1.15rem;
      }

      .match-complete-banner {
        padding: 14px 16px;
        margin-bottom: 8px;
        border-radius: 12px;
        background: rgba(var(--ion-color-success-rgb, 45, 211, 111), 0.12);
        border: 1px solid var(--ion-color-success-shade, #28ba62);
        text-align: center;
      }

      .match-complete-text {
        font-size: 1.1rem;
        font-weight: 800;
        color: var(--ion-color-success-shade, #28ba62);
        margin-bottom: 4px;
      }

      .match-complete-banner ion-note {
        font-size: 0.85rem;
        color: var(--ion-color-medium-shade, #5f6368);
      }
    `
  ]
})
export class UmpireCounterComponent implements OnInit {
  readonly formatUmpireChip = umpireFormatChip;
  readonly state = inject(UmpireStateService);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);

  readonly resetDone = output<void>();

  readonly runKeysRow1 = [0, 1, 2, 3] as const;
  readonly runKeysRow2 = [4, 5, 6] as const;

  readonly pendingWideNb = signal<'wd' | 'nb' | 'lb' | 'bye' | null>(null);
  readonly pendingWideExtraRuns = signal<number | null>(null);
  readonly pendingWicket = signal(false);

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

  readonly showMetaDoneRow = computed(() => this.pendingWicket() || this.pendingWideNb() !== null);

  constructor() {
    addIcons({ refreshOutline });
  }

  ngOnInit(): void {
    this.state.ensureLoaded();
  }

  ordinalOver(n: number): string {
    return formatOrdinalOver(n);
  }

  sliceTotalRuns(slice: UmpireOverSlice): number {
    return deriveScoreTotals(slice.events).battingRunsPlusExtras;
  }

  sliceBallCells(slice: UmpireOverSlice): UmpireOverBallCell[] {
    return umpireOverSliceToBallCells(slice.events, slice.overNumber);
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
  }

  async confirmReset(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Reset match?',
      message: 'All scoring data will be cleared and you will return to the start screen.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reset',
          role: 'destructive',
          handler: () => {
            this.pendingWideNb.set(null);
            this.pendingWideExtraRuns.set(null);
            this.pendingWicket.set(false);
            this.state.resetAll();
            this.resetDone.emit();
          }
        }
      ]
    });
    await alert.present();
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

import {
  Component,
  OnInit,
  computed,
  signal,
  inject,
  output,
  viewChild,
  ElementRef,
  afterNextRender,
  DestroyRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonNote,
  ActionSheetController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowRedoOutline, arrowUndoOutline } from 'ionicons/icons';
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
import { HapticService } from '../services/haptic.service';
import { WicketSoundService } from '../services/wicket-sound.service';
import { PageHeaderComponent } from '../components/page-header.component';

@Component({
  selector: 'app-umpire-counter',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonButton,
    IonIcon,
    IonNote,
    PageHeaderComponent
  ],
  template: `
    <app-page-header title="Live Scoring" />
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
            [class.summary-card--flash-4]="scoreFlash() === '4'"
            [class.summary-card--flash-6]="scoreFlash() === '6'"
            [class.summary-card--flash-w]="scoreFlash() === 'w'"
          >
            @if (state.teamName()) {
              <div class="summary-team">{{ state.teamName() }}</div>
            }
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
            <div class="score-meta">
              <span>Extras: {{ state.extrasBreakdownLabel() }}</span>
              @if (state.runRate(); as rr) {
                <span class="score-meta-sep">|</span>
                <span>RR {{ rr }}</span>
              }
            </div>
            @if (state.chaseStatus(); as chase) {
              @if (!chase.targetReached) {
                <div class="chase-line" role="status">
                  <span class="chase-line-main">
                    Need <strong>{{ chase.runsNeeded }}</strong> to win
                    @if (chase.ballsRemaining !== null) {
                      from <strong>{{ chase.ballsRemaining }}</strong> balls
                    }
                  </span>
                  @if (chase.requiredRunRate) {
                    <span class="chase-line-rrr">RRR {{ chase.requiredRunRate }}</span>
                  }
                  <span class="chase-line-target">Target {{ chase.target }}</span>
                </div>
              }
            }
            @if (lastBallChip(); as chip) {
              <div class="last-ball-chip">Last ball: {{ chip }}</div>
            }
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
          } @else if (state.chaseTargetReached()) {
            <div class="match-complete-banner match-complete-banner--chase" role="status">
              <div class="match-complete-text">Target Reached</div>
              <ion-note>
                Chase complete — {{ state.chaseTarget() }} runs. Scoring is locked.
              </ion-note>
            </div>
          }
        </div>

        <div class="umpire-mid">
          <div class="umpire-pending-area">
            @if (!state.scoringLocked()) {
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

          @if (state.betweenOversPause() && !state.scoringLocked()) {
            <div class="between-over-hint" role="status">
              <ion-note>Over complete — log the first ball of the next over on the keypad.</ion-note>
            </div>
          }

          @if (state.currentOverBarSlice(); as slice) {
            <div
              class="current-over-strip"
              role="region"
              [attr.aria-label]="slice.isComplete ? 'Completed over' : 'Current over'"
            >
              <div
                class="current-over-section over-strip"
                [class.over-strip--between]="state.betweenOversPause()"
                [class.over-strip--complete]="slice.isComplete"
              >
                <div class="over-item">
                  <div class="over-content">
                    <div class="over-number-col">
                      <span class="over-number">{{ ordinalOver(slice.overNumber) }}</span>
                      @if (slice.isComplete && state.betweenOversPause()) {
                        <span class="over-complete-pill">Complete</span>
                      } @else if (!slice.isComplete) {
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

      <div #keypadPanel slot="fixed" class="keypad-panel">
        <div class="keypad-row">
            @for (n of runKeysRow1; track n) {
              <ion-button
                class="keypad-btn"
                expand="block"
                [disabled]="state.scoringLocked()"
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
                [disabled]="state.scoringLocked()"
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
              [disabled]="keyDisabledW() || state.scoringLocked()"
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
                [disabled]="keyDisabledExtrasStart() || state.scoringLocked()"
                aria-label="Log wide"
                (click)="startWide()"
              >
                WD
              </ion-button>
            }
            @if (state.keypad().showNoBall) {
              <ion-button
                class="keypad-btn keypad-btn--warn"
                expand="block"
                [disabled]="keyDisabledExtrasStart() || state.scoringLocked()"
                aria-label="Log no-ball"
                (click)="startNoBall()"
              >
                NB
              </ion-button>
            }
            @if (state.keypad().showLb) {
              <ion-button
                class="keypad-btn"
                expand="block"
                [disabled]="keyDisabledLegalExtras() || state.scoringLocked()"
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
                [disabled]="keyDisabledLegalExtras() || state.scoringLocked()"
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
              class="meta-btn meta-btn--icon"
              aria-label="Undo last ball"
              [disabled]="!canUndo()"
              (click)="undo()"
            >
              <ion-icon name="arrow-undo-outline" slot="icon-only" />
            </ion-button>
            <ion-button
              fill="outline"
              expand="block"
              size="small"
              class="meta-btn meta-btn--icon"
              aria-label="Redo last undone ball"
              [disabled]="!state.canRedo()"
              (click)="state.redo()"
            >
              <ion-icon name="arrow-redo-outline" slot="icon-only" />
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
              Reset
            </ion-button>
            @if (pendingWicket() && !state.scoringLocked()) {
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
            } @else if (pendingWideNb() && !state.scoringLocked()) {
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
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        min-height: 0;
        --umpire-keypad-offset: 208px;
      }

      ion-header {
        flex-shrink: 0;
      }

      app-page-header {
        flex-shrink: 0;
      }

      .umpire-ion-content {
        flex: 1 1 auto;
        min-height: 0;
        --background: var(--ion-background-color, #f4f5f8);
        --padding-top: 0;
        --padding-start: 0;
        --padding-end: 0;
        --padding-bottom: calc(var(--umpire-keypad-offset, 208px) + var(--umpire-tab-bar-clearance, var(--app-tab-bar-float-offset, 86px)));
      }

      .umpire-ion-content::part(scroll) {
        display: flex;
        flex-direction: column;
        min-height: 100%;
      }

      .umpire-page {
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        flex-direction: column;
        padding-bottom: 4px;
      }

      .umpire-score-head {
        flex: 0 0 auto;
        padding: 2px 14px 0;
        box-sizing: border-box;
      }

      .umpire-mid {
        position: relative;
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-end;
        overflow-x: hidden;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }

      .umpire-pending-area {
        flex: 0 0 auto;
        flex-shrink: 0;
      }

      .current-over-strip {
        margin: 0 14px 6px;
        box-sizing: border-box;
        flex-shrink: 0;
      }

      .keypad-panel {
        left: 0;
        right: 0;
        bottom: var(--umpire-tab-bar-clearance, var(--app-tab-bar-float-offset, 86px));
        width: 100%;
        z-index: 10;
        pointer-events: auto;
        padding: clamp(4px, 1vh, 8px) clamp(6px, 2vw, 10px) 6px;
        background: var(--ion-background-color, #f4f5f8);
        border-top: 1px solid var(--border-color, rgba(0, 0, 0, 0.06));
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
        margin-bottom: 8px;
        box-shadow: var(--app-shadow-card);
      }

      .summary-card--mega {
        margin-left: -14px;
        margin-right: -14px;
        width: calc(100% + 28px);
        max-width: none;
        border-radius: 0;
        padding: clamp(6px, 1.6vh, 14px) 14px clamp(8px, 2vh, 14px);
        box-sizing: border-box;
      }

      .summary-mega--single {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        justify-content: center;
        column-gap: 0.12em;
        row-gap: 0.08em;
        width: 100%;
        text-align: center;
        font-variant-numeric: tabular-nums;
        line-height: 1.05;
        font-size: clamp(1.5rem, 4.8vh + 0.45rem, 4.75rem);
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

      .summary-team {
        text-align: center;
        font-size: 0.82rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--ion-color-medium-shade, #5f6368);
        margin-bottom: 6px;
      }

      .score-meta {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 6px 10px;
        margin-top: 8px;
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--ion-color-medium-shade, #5f6368);
        font-variant-numeric: tabular-nums;
      }

      .score-meta-sep {
        opacity: 0.35;
      }

      .last-ball-chip {
        text-align: center;
        margin-top: 6px;
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--ion-color-primary-shade, #4854e0);
      }

      .chase-line {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 4px 10px;
        margin-top: clamp(4px, 1vh, 10px);
        padding: clamp(5px, 1.2vh, 8px) 10px;
        border-radius: 10px;
        background: rgba(var(--ion-color-warning-rgb, 255, 196, 9), 0.14);
        border: 1px solid rgba(var(--ion-color-warning-rgb, 255, 196, 9), 0.35);
        text-align: center;
      }

      .chase-line-main {
        font-size: clamp(0.78rem, 2.2vh, 0.88rem);
        font-weight: 600;
        color: var(--ion-text-color);
        line-height: 1.3;
      }

      .chase-line-main--won {
        color: var(--ion-color-success-shade, #28ba62);
        font-weight: 800;
      }

      .chase-line-rrr {
        font-size: clamp(0.85rem, 2.5vh, 1rem);
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        color: var(--app-chase-accent, #b45309);
      }

      .chase-line-target {
        font-size: 0.68rem;
        font-weight: 600;
        color: var(--ion-color-medium-shade, #5f6368);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        width: 100%;
      }

      @media (min-width: 380px) {
        .chase-line-target {
          width: auto;
        }
      }

      .summary-card--flash-4 {
        animation: score-flash-green 0.45s ease;
      }

      .summary-card--flash-6 {
        animation: score-flash-purple 0.45s ease;
      }

      .summary-card--flash-w {
        animation: score-flash-red 0.45s ease;
      }

      @keyframes score-flash-green {
        0%, 100% { background: var(--ion-card-background, #fff); }
        40% { background: rgba(var(--ion-color-success-rgb, 45, 211, 111), 0.2); }
      }

      @keyframes score-flash-purple {
        0%, 100% { background: var(--ion-card-background, #fff); }
        40% { background: rgba(147, 51, 234, 0.18); }
      }

      @keyframes score-flash-red {
        0%, 100% { background: var(--ion-card-background, #fff); }
        40% { background: rgba(var(--ion-color-danger-rgb, 235, 68, 90), 0.18); }
      }

      .between-over-hint {
        padding: 0 14px 6px;
        text-align: center;
        flex-shrink: 0;
      }

      .between-over-hint ion-note {
        font-size: 0.8rem;
        line-height: 1.4;
        color: var(--ion-color-success-shade, #28ba62);
        font-weight: 600;
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
        box-sizing: border-box;
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
        gap: clamp(4px, 1.2vw, 8px);
        margin-bottom: clamp(4px, 1vh, 8px);
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
        max-width: min(72px, 21vw, 16vh);
        min-width: 40px;
        min-height: 40px;
        max-height: min(72px, 16vh);
        aspect-ratio: 1;
        height: auto;
        --border-radius: 50%;
        --padding-top: 0;
        --padding-bottom: 0;
        font-weight: 400;
        font-size: clamp(1.25rem, 4.5vw, 1.75rem);
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

      .meta-btn--icon ion-icon {
        font-size: 1.2rem;
      }

      .meta-btn--reset {
        min-width: 0;
        max-width: none;
        font-weight: 700;
        font-size: 0.72rem;
        letter-spacing: 0.01em;
      }

      .match-complete-banner {
        padding: 12px 14px;
        margin-bottom: 6px;
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

      .match-complete-banner--chase {
        background: rgba(var(--ion-color-warning-rgb, 255, 196, 9), 0.14);
        border-color: var(--ion-color-warning-shade, #e0ac08);
      }

      .match-complete-banner--chase .match-complete-text {
        color: var(--app-chase-accent, #b45309);
      }

      @media (max-height: 780px) {
        :host {
          --umpire-keypad-offset: 196px;
        }

        .summary-mega--single {
          font-size: clamp(1.45rem, 4.2vh + 0.4rem, 3.5rem);
        }

        .score-meta,
        .last-ball-chip {
          margin-top: 4px;
        }

        .match-complete-banner {
          padding: 10px 12px;
          margin-bottom: 4px;
        }

        .match-complete-text {
          font-size: 1rem;
        }

        .current-over-strip {
          margin-bottom: 6px;
        }

        .current-over-section {
          padding: 8px 4px 8px;
        }

        .keypad-row {
          margin-bottom: clamp(3px, 0.8vh, 6px);
        }

        .keypad-btn {
          max-width: min(64px, 20vw, 15vh);
          min-width: 38px;
          min-height: 38px;
          max-height: min(64px, 15vh);
        }

        .meta-btn {
          min-height: 32px;
          max-height: 34px;
        }
      }

      @media (max-height: 700px) {
        .summary-team {
          margin-bottom: 2px;
          font-size: 0.75rem;
        }

        .score-meta,
        .last-ball-chip {
          margin-top: 4px;
          font-size: 0.75rem;
        }

        .match-complete-banner {
          padding: 10px 12px;
          margin-bottom: 6px;
        }

        .match-complete-text {
          font-size: 0.95rem;
        }

        .current-over-section {
          padding: 6px 4px 6px;
        }

        .between-over-hint {
          padding: 0 14px 4px;
        }

        .between-over-hint ion-note {
          font-size: 0.75rem;
        }
      }

      @media (max-height: 600px) {
        .summary-mega--single {
          font-size: clamp(1.45rem, 8vw, 2.5rem);
        }

        .keypad-btn {
          max-width: min(56px, 19vw, 14vh);
          min-width: 36px;
          min-height: 36px;
          max-height: 56px;
          font-size: clamp(1.1rem, 4vw, 1.4rem);
        }

        .meta-btn {
          min-height: 30px;
          max-height: 32px;
          font-size: 0.7rem;
        }
      }
    `
  ]
})
export class UmpireCounterComponent implements OnInit {
  readonly formatUmpireChip = umpireFormatChip;
  readonly state = inject(UmpireStateService);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly toastController = inject(ToastController);
  private readonly haptics = inject(HapticService);
  private readonly wicketSound = inject(WicketSoundService);

  readonly scoreFlash = signal<'4' | '6' | 'w' | null>(null);
  private flashClearId: ReturnType<typeof setTimeout> | null = null;

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

  readonly lastBallChip = computed(() => {
    const evs = this.state.events();
    if (evs.length === 0) return null;
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

  private readonly keypadPanel = viewChild<ElementRef<HTMLElement>>('keypadPanel');
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    addIcons({ arrowUndoOutline, arrowRedoOutline });
    afterNextRender(() => this.bindKeypadResizeObserver());
  }

  ngOnInit(): void {
    this.state.ensureLoaded();
  }

  private bindKeypadResizeObserver(): void {
    const panel = this.keypadPanel()?.nativeElement;
    if (!panel) return;

    const tabBarClearance = (): number => {
      const tabBar = document.querySelector('ion-tab-bar.app-tab-bar-float');
      if (!tabBar) return 86;
      const rect = tabBar.getBoundingClientRect();
      const gap = 8;
      return Math.ceil(window.innerHeight - rect.top) + gap;
    };

    const apply = (): void => {
      const clearance = tabBarClearance();
      const clearancePx = `${clearance}px`;
      panel.style.bottom = clearancePx;

      const h = Math.ceil(panel.getBoundingClientRect().height);
      const host = panel.closest('app-umpire-counter') as HTMLElement | null;
      const content = panel.closest('ion-content') as HTMLElement | null;
      host?.style.setProperty('--umpire-keypad-offset', `${h}px`);
      host?.style.setProperty('--umpire-tab-bar-clearance', clearancePx);
      content?.style.setProperty('--umpire-tab-bar-clearance', clearancePx);
      content?.style.setProperty('--padding-bottom', `${h + clearance}px`);
    };

    apply();
    setTimeout(apply, 150);

    const ro = new ResizeObserver(() => apply());
    ro.observe(panel);
    const tabBar = document.querySelector('ion-tab-bar.app-tab-bar-float');
    if (tabBar) ro.observe(tabBar);

    const onResize = (): void => apply();
    window.addEventListener('resize', onResize, { passive: true });

    this.destroyRef.onDestroy(() => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
    });
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
    if (this.state.scoringLocked()) return;
    this.tapKey();
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
    if (this.state.scoringLocked()) return;
    this.tapKey();
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
    if (this.state.scoringLocked()) return;
    this.tapKey();
    if (this.pendingWideNb() === 'nb') { void this.toast('Finish the no-ball first.'); return; }
    if (this.pendingWideNb() === 'wd') { void this.toast('Wide already in progress.'); return; }
    this.pendingWideExtraRuns.set(null);
    this.pendingWideNb.set('wd');
  }

  startNoBall(): void {
    if (this.state.scoringLocked()) return;
    this.tapKey();
    if (this.pendingWideNb() === 'wd') { void this.toast('Finish the wide first.'); return; }
    if (this.pendingWideNb() === 'nb') { void this.toast('No-ball already in progress.'); return; }
    this.pendingWideExtraRuns.set(null);
    this.pendingWideNb.set('nb');
  }

  completePendingZero(): void {
    if (this.state.scoringLocked()) return;
    this.tapKey();
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
    if (this.state.scoringLocked()) return;
    this.tapKey();
    if (this.pendingWideNb() !== null) { void this.toast('Finish the current extra first.'); return; }
    this.pendingWideExtraRuns.set(null);
    this.pendingWideNb.set('lb');
  }

  logBye(): void {
    if (this.state.scoringLocked()) return;
    this.tapKey();
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
    const sheet = await this.actionSheetController.create({
      header: 'Reset match?',
      subHeader: 'All scoring data will be cleared and you will return to the start screen.',
      buttons: [
        {
          text: 'Reset match',
          role: 'destructive',
          handler: () => {
            this.pendingWideNb.set(null);
            this.pendingWideExtraRuns.set(null);
            this.pendingWicket.set(false);
            this.state.resetAll();
            this.resetDone.emit();
          }
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });
    await sheet.present();
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
    this.feedbackForEvent(e);
  }

  private tapKey(): void {
    if (this.state.hapticEnabled()) void this.haptics.lightTap();
  }

  private feedbackForEvent(e: UmpireEvent): void {
    const isWicket =
      e.kind === 'w' ||
      ((e.kind === 'wd' || e.kind === 'nb') && e.wicketOnDelivery);
    if (e.kind === 'runs' && e.runs === 4) {
      this.flashScore('4', 'Four!');
    } else if (e.kind === 'runs' && e.runs === 6) {
      this.flashScore('6', 'Six!');
    } else if (isWicket) {
      this.flashScore('w', 'Wicket!');
      if (this.state.wicketSoundEnabled()) this.wicketSound.play();
      if (this.state.hapticEnabled()) void this.haptics.mediumTap();
    }
  }

  private flashScore(kind: '4' | '6' | 'w', message: string): void {
    this.scoreFlash.set(kind);
    if (this.flashClearId !== null) clearTimeout(this.flashClearId);
    this.flashClearId = setTimeout(() => {
      this.scoreFlash.set(null);
      this.flashClearId = null;
    }, 450);
    if (this.state.scoreToastEnabled()) {
      void this.scoreToast(message, 900);
    }
  }

  private async scoreToast(message: string, duration = 900): Promise<void> {
    const t = await this.toastController.create({
      message,
      duration,
      position: 'top',
      cssClass: 'umpire-toast umpire-toast--score'
    });
    await t.present();
  }

  private async toast(message: string, duration = 2000): Promise<void> {
    const t = await this.toastController.create({ message, duration, position: 'bottom', cssClass: 'umpire-toast' });
    await t.present();
  }
}

function clampInt(n: unknown, min: number, max: number): number {
  const x = typeof n === 'number' && !Number.isNaN(n) ? Math.trunc(n) : min;
  return Math.min(max, Math.max(min, x));
}

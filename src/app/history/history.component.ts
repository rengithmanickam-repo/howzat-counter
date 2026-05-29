import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonContent, IonNote, ToastController } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { UmpireStateService } from '../umpire-counter/umpire-state.service';
import { PageHeaderComponent } from '../components/page-header.component';
import {
  deriveScoreTotals,
  formatOrdinalOver,
  umpireOverSliceToBallCells,
  type UmpireOverBallCell,
  type UmpireOverSlice
} from '../umpire-counter/umpire-counter-logic';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, IonContent, IonNote, IonButton, PageHeaderComponent],
  template: `
    <app-page-header title="History" />
    <ion-content [fullscreen]="false" class="history-ion-content app-safe-content">
      <div class="history-page">
        @if (allOvers().length === 0) {
          <div class="empty-state">
            <ion-note>No overs logged yet. Start scoring on the Home tab.</ion-note>
          </div>
        } @else {
          @if (state.teamName()) {
            <div class="history-team">{{ state.teamName() }}</div>
          }
          <div class="score-summary">
            <span class="score-total">{{ scoreTotals().battingRunsPlusExtras }}/{{ derived().wickets }}</span>
            <span class="score-overs">({{ derived().oversDecimal }} overs)</span>
          </div>
          <div class="score-breakdown">
            <span class="breakdown-item">Extras: {{ state.extrasBreakdownLabel() }}</span>
            @if (state.runRate(); as rr) {
              <span class="breakdown-sep">|</span>
              <span class="breakdown-item">RR {{ rr }}</span>
            }
          </div>
          @if (state.chaseStatus(); as chase) {
            <div class="chase-summary">
              @if (chase.targetReached) {
                Target {{ chase.target }} reached
              } @else {
                Need {{ chase.runsNeeded }} to win
                @if (chase.ballsRemaining !== null) {
                  from {{ chase.ballsRemaining }} balls
                }
                @if (chase.requiredRunRate) {
                  · RRR {{ chase.requiredRunRate }}
                }
              }
            </div>
          }
          <ion-button expand="block" fill="outline" size="small" class="share-btn" (click)="shareScorecard()">
            Share scorecard
          </ion-button>
          <div class="overs-list over-strip">
            @for (slice of allOvers(); track overTrack(slice); let last = $last) {
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
              @if (!last) {
                <div class="over-separator" aria-hidden="true"></div>
              }
            }
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .history-ion-content {
      --background: var(--ion-background-color, #f4f5f8);
      --padding-start: 0;
      --padding-end: 0;
      --padding-top: 0;
    }

    .history-page {
      padding: 16px 14px;
    }

    .history-team {
      text-align: center;
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ion-color-medium-shade, #5f6368);
      margin-bottom: 8px;
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 200px;
      text-align: center;
    }

    .empty-state ion-note {
      font-size: 0.95rem;
      color: var(--ion-color-medium-shade, #5f6368);
    }

    .score-summary {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 0.3em;
      margin-bottom: 4px;
    }

    .score-total {
      font-size: clamp(1.8rem, 8vw, 3rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      font-variant-numeric: tabular-nums;
      color: var(--ion-color-primary-shade, #4854e0);
    }

    .score-overs {
      font-size: clamp(1rem, 4vw, 1.4rem);
      font-weight: 700;
      color: var(--ion-color-medium-shade, #5f6368);
    }

    .score-breakdown {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px 10px;
      margin-bottom: 12px;
      font-size: 0.85rem;
      color: var(--ion-color-medium-shade, #5f6368);
    }

    .breakdown-sep {
      opacity: 0.4;
    }

    .chase-summary {
      text-align: center;
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--app-chase-accent, #b45309);
      margin: -4px 0 12px;
      line-height: 1.4;
    }

    .share-btn {
      margin-bottom: 14px;
      --border-radius: 10px;
    }

    .overs-list {
      margin-left: -14px;
      margin-right: -14px;
      width: calc(100% + 28px);
      max-width: 100vw;
      border-radius: 0;
      border-left: none;
      border-right: none;
      box-shadow: none;
      padding: 10px 8px;
    }

    .overs-list .over-separator {
      margin-left: 8px;
      margin-right: 8px;
    }
  `]
})
export class HistoryComponent implements OnInit {
  readonly state = inject(UmpireStateService);
  private readonly toastController = inject(ToastController);

  /** History tab: logged overs, most recent first. */
  readonly allOvers = computed(() => [...this.state.historyOversChronological()].reverse());
  readonly derived = computed(() => this.state.derived());
  readonly scoreTotals = computed(() => this.state.scoreTotals());

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

  overTrack(slice: UmpireOverSlice): string {
    return `${slice.overNumber}-${slice.isComplete ? 'c' : 'o'}-${slice.events.map(e => e.id).join('.')}`;
  }

  async shareScorecard(): Promise<void> {
    const text = this.state.scorecardShareText();
    try {
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import('@capacitor/share');
        await Share.share({ title: 'Scorecard', text, dialogTitle: 'Share scorecard' });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: 'Scorecard', text });
        return;
      }
      await navigator.clipboard.writeText(text);
      await this.toast('Scorecard copied to clipboard');
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(text);
        await this.toast('Scorecard copied to clipboard');
      } catch {
        await this.toast('Could not share scorecard');
      }
    }
  }

  private async toast(message: string): Promise<void> {
    const t = await this.toastController.create({ message, duration: 2000, position: 'bottom' });
    await t.present();
  }
}

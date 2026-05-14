import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonNote } from '@ionic/angular/standalone';
import { UmpireStateService } from '../umpire-counter/umpire-state.service';
import {
  chipLabel,
  deriveScoreTotals,
  formatOrdinalOver,
  umpireOverSliceToBallCells,
  type UmpireOverBallCell,
  type UmpireOverSlice
} from '../umpire-counter/umpire-counter-logic';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, IonToolbar, IonTitle, IonNote],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>History</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="false" class="history-ion-content">
      <div class="history-page">
        @if (allOvers().length === 0) {
          <div class="empty-state">
            <ion-note>No overs logged yet. Start scoring on the Home tab.</ion-note>
          </div>
        } @else {
          <div class="score-summary">
            <span class="score-total">{{ scoreTotals().battingRunsPlusExtras }}/{{ derived().wickets }}</span>
            <span class="score-overs">({{ derived().oversDecimal }} overs)</span>
          </div>
          <div class="score-breakdown">
            <span class="breakdown-item">Bat: {{ scoreTotals().battingRuns }}</span>
            <span class="breakdown-sep">|</span>
            <span class="breakdown-item">Extras: {{ scoreTotals().extrasRuns }}</span>
          </div>
          <div class="overs-list">
            @for (slice of allOvers(); track overTrack(slice); let last = $last) {
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
        }
      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
    }

    .history-ion-content {
      --background: var(--ion-background-color, #f4f5f8);
    }

    .history-page {
      padding: 16px 14px calc(16px + env(safe-area-inset-bottom, 0px));
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
      justify-content: center;
      gap: 10px;
      margin-bottom: 16px;
      font-size: 0.85rem;
      color: var(--ion-color-medium-shade, #5f6368);
    }

    .breakdown-sep {
      opacity: 0.4;
    }

    .overs-list {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid var(--border-color, #e2e8f0);
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      padding: 10px 6px;
    }

    .over-item {
      display: flex;
      flex-shrink: 0;
      width: 100%;
      box-sizing: border-box;
      padding: 4px 8px;
    }

    .over-content {
      display: grid;
      grid-template-columns: auto auto minmax(0, 1fr);
      align-items: center;
      column-gap: 10px;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .over-balls-clip {
      min-width: 0;
      overflow: hidden;
    }

    .over-balls-container {
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

    .over-balls-container::-webkit-scrollbar { height: 4px; }
    .over-balls-container::-webkit-scrollbar-track { background: transparent; }
    .over-balls-container::-webkit-scrollbar-thumb { background: var(--border-color, #cbd5e1); border-radius: 4px; }

    .over-number-col {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }

    .over-number {
      font-size: clamp(13px, 2.8vmin, 18px);
      font-weight: 700;
      color: var(--ion-color-medium-shade, #5f6368);
      font-variant-numeric: tabular-nums;
      line-height: 1.1;
      white-space: nowrap;
    }

    .over-current-pill {
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

    .over-runs-inline {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: baseline;
      gap: 5px;
      white-space: nowrap;
    }

    .runs-number-inline {
      font-size: clamp(15px, 3.5vmin, 22px);
      font-weight: 800;
      color: var(--ion-text-color);
      font-variant-numeric: tabular-nums;
      line-height: 1.2;
      text-align: left;
    }

    .runs-label-inline {
      font-size: clamp(9px, 2vmin, 11px);
      color: var(--ion-color-medium-shade, #5f6368);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      line-height: 1.2;
    }

    .over-separator {
      flex-shrink: 0;
      align-self: stretch;
      width: auto;
      height: 1px;
      min-height: 1px;
      margin: 6px 10px;
      background: #e2e8f0;
    }

    .over-ball-box {
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

    .over-ball-box.runs-4 {
      background: var(--success-green, var(--ion-color-success));
      color: white;
      border-color: var(--success-green, var(--ion-color-success));
    }

    .over-ball-box.runs-6 {
      background: #9333ea;
      color: white;
      border-color: #9333ea;
    }

    .over-ball-box.wicket {
      background: var(--error-red, var(--ion-color-danger));
      color: white;
      border-color: var(--error-red, var(--ion-color-danger));
    }

    .over-ball-box.extras {
      background: #fef3c7;
      color: #78350f;
      border-color: #d97706;
      font-weight: 800;
    }
  `]
})
export class HistoryComponent implements OnInit {
  private readonly state = inject(UmpireStateService);

  readonly allOvers = computed(() => this.state.allOversBar());
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
    return umpireOverSliceToBallCells(slice.events);
  }

  overTrack(slice: UmpireOverSlice): string {
    return `${slice.overNumber}-${slice.isComplete ? 'c' : 'o'}-${slice.events.map(e => e.id).join('.')}`;
  }
}

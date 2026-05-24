import { Component, Input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  appsOutline,
  arrowForwardCircleOutline,
  arrowUndoOutline,
  chatbubbleEllipsesOutline,
  checkmarkCircleOutline,
  checkmarkDoneOutline,
  closeCircleOutline,
  expandOutline,
  eyeOutline,
  flagOutline,
  helpCircleOutline,
  homeOutline,
  keypadOutline,
  listOutline,
  lockClosedOutline,
  moonOutline,
  optionsOutline,
  playOutline,
  returnDownForwardOutline,
  settingsOutline,
  speedometerOutline,
  sunnyOutline,
  trophyOutline
} from 'ionicons/icons';
import type { HelpGuide, HelpGuideStep } from './help-guides';

@Component({
  selector: 'app-help-visual-guide',
  standalone: true,
  imports: [IonIcon],
  template: `
    @switch (guide.layout) {
      @case ('row') {
        <div class="guide-row" role="list">
          @for (step of guide.steps; track step.label; let last = $last) {
            <div class="guide-row-item" role="listitem">
              <div class="step-card" [class]="toneClass(step)">
                @if (step.icon) {
                  <span class="step-icon-wrap"><ion-icon [name]="step.icon" aria-hidden="true" /></span>
                }
                <span class="step-label">{{ step.label }}</span>
                @if (step.sublabel) {
                  <span class="step-sublabel">{{ step.sublabel }}</span>
                }
              </div>
              @if (!last) {
                <span class="row-arrow" aria-hidden="true">→</span>
              }
            </div>
          }
        </div>
      }
      @case ('fork') {
        <div class="guide-fork">
          @for (step of guide.steps; track step.label; let last = $last) {
            <div class="step-card step-card--wide" [class]="toneClass(step)">
              @if (step.icon) {
                <span class="step-icon-wrap"><ion-icon [name]="step.icon" aria-hidden="true" /></span>
              }
              <div class="step-copy">
                <span class="step-label">{{ step.label }}</span>
                @if (step.sublabel) {
                  <span class="step-sublabel">{{ step.sublabel }}</span>
                }
              </div>
            </div>
            @if (!last) {
              <div class="pipe" aria-hidden="true"></div>
            }
          }
          @if (guide.branches?.length) {
            <div class="fork-grid">
              @for (branch of guide.branches; track branch.label) {
                <div class="fork-branch">
                  <span class="fork-label">{{ branch.label }}</span>
                  @for (bStep of branch.steps; track bStep.label) {
                    <div class="step-card step-card--compact" [class]="toneClass(bStep)">
                      @if (bStep.icon) {
                        <span class="step-icon-wrap step-icon-wrap--sm">
                          <ion-icon [name]="bStep.icon" aria-hidden="true" />
                        </span>
                      }
                      <span class="step-label">{{ bStep.label }}</span>
                    </div>
                  }
                </div>
              }
            </div>
            @if (guide.mergeStep) {
              <div class="pipe pipe--short" aria-hidden="true"></div>
              <div class="step-card step-card--wide" [class]="toneClass(guide.mergeStep)">
                @if (guide.mergeStep.icon) {
                  <span class="step-icon-wrap"><ion-icon [name]="guide.mergeStep.icon" aria-hidden="true" /></span>
                }
                <div class="step-copy">
                  <span class="step-label">{{ guide.mergeStep.label }}</span>
                  @if (guide.mergeStep.sublabel) {
                    <span class="step-sublabel">{{ guide.mergeStep.sublabel }}</span>
                  }
                </div>
              </div>
            }
          }
        </div>
      }
      @default {
        <div class="guide-pipeline">
          @for (step of guide.steps; track step.label; let last = $last) {
            <div class="step-card step-card--wide" [class]="toneClass(step)">
              @if (step.icon) {
                <span class="step-icon-wrap"><ion-icon [name]="step.icon" aria-hidden="true" /></span>
              }
              <div class="step-copy">
                <span class="step-label">{{ step.label }}</span>
                @if (step.sublabel) {
                  <span class="step-sublabel">{{ step.sublabel }}</span>
                }
              </div>
            </div>
            @if (!last) {
              <div class="pipe" aria-hidden="true"></div>
            }
          }
        </div>
      }
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    .step-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 12px 10px;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      background: var(--ion-card-background);
      text-align: center;
      min-width: 0;
    }

    .step-card--wide {
      flex-direction: row;
      align-items: center;
      text-align: left;
      gap: 12px;
      padding: 12px 14px;
    }

    .step-card--compact {
      flex-direction: row;
      gap: 8px;
      padding: 10px 12px;
      text-align: left;
      width: 100%;
    }

    .step-copy {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .step-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      flex-shrink: 0;
      background: rgba(var(--step-rgb, var(--ion-color-primary-rgb)), 0.12);
      color: var(--step-color, var(--ion-color-primary-shade));
    }

    .step-icon-wrap--sm {
      width: 32px;
      height: 32px;
      border-radius: 10px;
    }

    .step-icon-wrap ion-icon {
      font-size: 1.25rem;
    }

    .step-icon-wrap--sm ion-icon {
      font-size: 1.05rem;
    }

    .step-label {
      font-size: 0.82rem;
      font-weight: 700;
      line-height: 1.25;
      color: var(--ion-text-color);
    }

    .step-sublabel {
      font-size: 0.72rem;
      line-height: 1.35;
      color: var(--ion-color-medium-shade);
    }

    .step-card--tone-primary {
      --step-rgb: var(--ion-color-primary-rgb);
      --step-color: var(--ion-color-primary-shade);
    }

    .step-card--tone-success {
      --step-rgb: var(--ion-color-success-rgb);
      --step-color: var(--ion-color-success-shade);
    }

    .step-card--tone-warning {
      --step-rgb: var(--ion-color-warning-rgb);
      --step-color: var(--app-chase-accent, var(--ion-color-warning-shade));
    }

    .step-card--tone-danger {
      --step-rgb: var(--ion-color-danger-rgb);
      --step-color: var(--ion-color-danger-shade);
    }

    .step-card--tone-neutral {
      --step-rgb: var(--ion-color-medium-rgb);
      --step-color: var(--ion-color-medium-shade);
    }

    .pipe {
      width: 2px;
      height: 14px;
      margin: 0 auto;
      border-radius: 2px;
      background: linear-gradient(
        to bottom,
        var(--ion-color-primary-tint),
        var(--border-color)
      );
      opacity: 0.85;
    }

    .pipe--short {
      height: 10px;
    }

    .guide-pipeline,
    .guide-fork {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .fork-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 8px;
      margin-top: 4px;
    }

    .fork-branch {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 10px;
      border-radius: 12px;
      background: var(--app-surface-muted);
      border: 1px dashed var(--border-color);
    }

    .fork-label {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--ion-color-medium-shade);
      line-height: 1.3;
    }

    .guide-row {
      display: flex;
      align-items: stretch;
      gap: 4px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      padding-bottom: 4px;
      scrollbar-width: thin;
    }

    .guide-row-item {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .guide-row .step-card {
      width: 108px;
      min-height: 108px;
      justify-content: center;
    }

    .row-arrow {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--ion-color-medium-shade);
      padding: 0 2px;
      flex-shrink: 0;
    }
  `]
})
export class HelpVisualGuideComponent {
  @Input({ required: true }) guide!: HelpGuide;

  constructor() {
    addIcons({
      playOutline,
      optionsOutline,
      keypadOutline,
      appsOutline,
      lockClosedOutline,
      arrowUndoOutline,
      homeOutline,
      listOutline,
      helpCircleOutline,
      settingsOutline,
      moonOutline,
      sunnyOutline,
      closeCircleOutline,
      alertCircleOutline,
      checkmarkCircleOutline,
      checkmarkDoneOutline,
      expandOutline,
      returnDownForwardOutline,
      flagOutline,
      eyeOutline,
      chatbubbleEllipsesOutline,
      arrowForwardCircleOutline,
      trophyOutline,
      speedometerOutline
    });
  }

  toneClass(step: HelpGuideStep): string {
    return `step-card--tone-${step.tone ?? 'primary'}`;
  }
}

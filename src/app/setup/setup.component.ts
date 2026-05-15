import { Component, OnInit, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonButton,
  IonContent,
  IonItem,
  IonToggle,
  IonList,
  IonInput
} from '@ionic/angular/standalone';
import { UmpireStateService } from '../umpire-counter/umpire-state.service';
import type { UmpireSetupConfig } from '../umpire-counter/umpire-counter.model';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [CommonModule, IonButton, IonContent, IonItem, IonToggle, IonList, IonInput],
  template: `
    <ion-content [fullscreen]="false" class="setup-ion-content app-safe-content">
      <div class="setup-page">
        <h1 class="setup-title">Match Setup</h1>
        <p class="setup-hint">Configure the match before you start scoring.</p>

        <div class="section-card">
          <h2 class="section-heading">Match Rules</h2>
          <ion-list lines="full" class="setup-list">
            <ion-item>
              <ion-input
                label="Overs"
                labelPlacement="stacked"
                helperText="Total overs in the innings"
                type="number"
                inputmode="numeric"
                [value]="overs()"
                (ionInput)="onInput('overs', $event)"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                label="Balls per over"
                labelPlacement="stacked"
                helperText="Legal deliveries per over (1–12)"
                type="number"
                inputmode="numeric"
                [value]="ballsPerOver()"
                (ionInput)="onInput('ballsPerOver', $event)"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                label="Wickets"
                labelPlacement="stacked"
                helperText="Max wickets (1–20)"
                type="number"
                inputmode="numeric"
                [value]="wickets()"
                (ionInput)="onInput('wickets', $event)"
              ></ion-input>
            </ion-item>
          </ion-list>
        </div>

        <div class="section-card">
          <h2 class="section-heading">Extras</h2>
          <ion-list class="setup-list">
            <ion-item>
              <ion-toggle [checked]="showWide()" (ionChange)="onToggle('showWide', $event)">Wide (Wd)</ion-toggle>
            </ion-item>
            <ion-item>
              <ion-toggle [checked]="showNoBall()" (ionChange)="onToggle('showNoBall', $event)">No-ball (Nb)</ion-toggle>
            </ion-item>
            <ion-item>
              <ion-toggle [checked]="showLb()" (ionChange)="onToggle('showLb', $event)">Leg-bye (Lb)</ion-toggle>
            </ion-item>
            <ion-item>
              <ion-toggle [checked]="showBye()" (ionChange)="onToggle('showBye', $event)">Bye</ion-toggle>
            </ion-item>
          </ion-list>
        </div>

        <div class="action-area">
          <ion-button expand="block" size="large" class="start-match-btn" (click)="onStartMatch()">
            Start Match
          </ion-button>
          <ion-button expand="block" fill="outline" size="small" class="back-btn" (click)="backTap.emit()">
            Back
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
      width: 100%;
    }

    .setup-ion-content {
      flex: 1 1 auto;
      min-height: 0;
      --background: var(--ion-background-color, #f4f5f8);
      --padding-start: 0;
      --padding-end: 0;
      --padding-top: var(--app-safe-top, max(env(safe-area-inset-top, 0px), 12px));
      --padding-bottom: 0;
    }

    .setup-page {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 560px;
      margin: 0 auto;
      box-sizing: border-box;
      padding: 16px 16px calc(20px + var(--app-safe-bottom, env(safe-area-inset-bottom, 12px)));
      gap: 14px;
    }

    .setup-title {
      font-size: 1.45rem;
      font-weight: 800;
      margin: 0;
      color: var(--ion-text-color);
    }

    .setup-hint {
      font-size: 0.88rem;
      color: var(--ion-color-medium-shade, #5f6368);
      margin: -6px 0 0;
      line-height: 1.35;
    }

    .section-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid var(--border-color, #e2e8f0);
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      padding: 16px;
    }

    .section-heading {
      font-size: 0.95rem;
      font-weight: 700;
      margin: 0 0 8px;
      color: var(--ion-text-color);
    }

    .setup-list {
      padding: 0;
      background: transparent;
    }

    .setup-list ion-item {
      --padding-start: 0;
      --inner-padding-end: 0;
      --background: transparent;
    }

    .action-area {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 4px;
      padding-bottom: 4px;
    }

    .start-match-btn {
      --border-radius: 14px;
      font-weight: 800;
      font-size: 1.1rem;
      min-height: 52px;
    }

    .back-btn {
      --border-radius: 10px;
    }
  `]
})
export class SetupComponent implements OnInit {
  private readonly state = inject(UmpireStateService);

  readonly overs = signal('20');
  readonly ballsPerOver = signal('6');
  readonly wickets = signal('11');
  readonly showWide = signal(true);
  readonly showNoBall = signal(true);
  readonly showLb = signal(false);
  readonly showBye = signal(false);

  readonly matchStarted = output<void>();
  readonly backTap = output<void>();

  ngOnInit(): void {
    const defaults = this.state.loadSetupDefaults();
    this.overs.set(String(defaults.overs));
    this.ballsPerOver.set(String(defaults.ballsPerOver));
    this.wickets.set(String(defaults.wickets));
    this.showWide.set(defaults.showWide);
    this.showNoBall.set(defaults.showNoBall);
    this.showLb.set(defaults.showLb);
    this.showBye.set(defaults.showBye);
  }

  onInput(field: 'overs' | 'ballsPerOver' | 'wickets', ev: Event): void {
    const val = String((ev as CustomEvent<{ value?: string | number | null }>).detail?.value ?? '');
    if (field === 'overs') this.overs.set(val);
    else if (field === 'ballsPerOver') this.ballsPerOver.set(val);
    else this.wickets.set(val);
  }

  onToggle(field: 'showWide' | 'showNoBall' | 'showLb' | 'showBye', ev: Event): void {
    const checked = (ev as CustomEvent<{ checked: boolean }>).detail.checked;
    if (field === 'showWide') this.showWide.set(!!checked);
    else if (field === 'showNoBall') this.showNoBall.set(!!checked);
    else if (field === 'showLb') this.showLb.set(!!checked);
    else this.showBye.set(!!checked);
  }

  onStartMatch(): void {
    const config: UmpireSetupConfig = {
      overs: this.parseNum(this.overs(), 1, 999, 20),
      ballsPerOver: this.parseNum(this.ballsPerOver(), 1, 12, 6),
      wickets: this.parseNum(this.wickets(), 1, 20, 11),
      showWide: this.showWide(),
      showNoBall: this.showNoBall(),
      showLb: this.showLb(),
      showBye: this.showBye()
    };
    this.state.startSession(config);
    this.matchStarted.emit();
  }

  private parseNum(val: string, min: number, max: number, fallback: number): number {
    const n = parseInt(val.replace(/\D/g, ''), 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }
}

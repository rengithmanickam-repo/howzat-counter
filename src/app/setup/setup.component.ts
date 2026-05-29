import { Component, OnInit, effect, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonButton,
  IonButtons,
  IonHeader,
  IonItem,
  IonToggle,
  IonList,
  IonInput,
  IonTitle,
  IonToolbar,
  ToastController
} from '@ionic/angular/standalone';
import { UmpireStateService } from '../umpire-counter/umpire-state.service';
import type { UmpireSetupConfig } from '../umpire-counter/umpire-counter.model';
import { CoinTossComponent } from '../components/coin-toss.component';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [
    CommonModule,
    IonButton,
    IonButtons,
    IonHeader,
    IonItem,
    IonToggle,
    IonList,
    IonInput,
    IonTitle,
    IonToolbar,
    CoinTossComponent
  ],
  template: `
    <ion-header>
      <ion-toolbar class="setup-sheet-toolbar">
        <ion-buttons slot="start">
          <ion-button fill="clear" (click)="dismissed.emit()">Cancel</ion-button>
        </ion-buttons>
        <ion-title>Match Setup</ion-title>
      </ion-toolbar>
    </ion-header>

    <div class="setup-shell">
      <div class="setup-scroll">
        <div class="setup-page">
          <p class="setup-hint">Configure the match before you start scoring.</p>

          <div class="section-card">
            <h2 class="section-heading">Toss</h2>
            <p class="section-subhint">Flip a virtual coin to decide who bats or bowls first.</p>
            <app-coin-toss />
          </div>

          <div class="section-card">
            <h2 class="section-heading">Team (optional)</h2>
            <ion-list lines="full" class="setup-list">
              <ion-item>
                <ion-input
                  label="Batting side"
                  labelPlacement="stacked"
                  helperText="Shown on the scorecard and when sharing"
                  type="text"
                  [value]="teamName()"
                  (ionInput)="onTeamNameInput($event)"
                ></ion-input>
              </ion-item>
            </ion-list>
          </div>

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
            <h2 class="section-heading">Batting second</h2>
            <ion-list lines="full" class="setup-list">
              @for (rev of [formRevision()]; track rev) {
                <ion-item>
                  <ion-toggle [checked]="battingSecond()" (ionChange)="onBattingSecond($event)">
                    Chasing a target
                  </ion-toggle>
                </ion-item>
                @if (battingSecond()) {
                  <ion-item>
                    <ion-input
                      label="Target (runs to win)"
                      labelPlacement="stacked"
                      helperText="e.g. opposition score + 1 — used for runs needed and required run rate"
                      type="number"
                      inputmode="numeric"
                      [value]="chaseTarget()"
                      (ionInput)="onChaseTargetInput($event)"
                    ></ion-input>
                  </ion-item>
                }
              }
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
        </div>
      </div>

      <div class="setup-footer">
        <ion-button expand="block" size="large" class="start-match-btn" (click)="onStartMatch()">
          Start Match
        </ion-button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      max-height: 100%;
      overflow: hidden;
      background: var(--ion-background-color, #f4f5f8);
    }

    ion-header {
      flex: 0 0 auto;
    }

    .setup-sheet-toolbar {
      --background: var(--ion-background-color, #f4f5f8);
      --border-width: 0 0 0.55px 0;
      --border-color: var(--border-color, rgba(0, 0, 0, 0.08));
      padding-top: 6px;
    }

    .setup-shell {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .setup-scroll {
      flex: 1 1 auto;
      min-height: 0;
      overflow-x: hidden;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }

    .setup-page {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 560px;
      margin: 0 auto;
      box-sizing: border-box;
      padding: 8px 16px 16px;
      gap: 14px;
    }

    .setup-hint {
      font-size: 0.88rem;
      color: var(--ion-color-medium-shade, #5f6368);
      margin: 0;
      line-height: 1.35;
    }

    .section-card {
      padding: 16px;
    }

    .section-heading {
      font-size: 0.95rem;
      font-weight: 600;
      margin: 0 0 8px;
      color: var(--ion-text-color);
    }

    .section-subhint {
      font-size: 0.82rem;
      color: var(--ion-color-medium-shade, #5f6368);
      margin: 0 0 14px;
      line-height: 1.35;
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

    .setup-footer {
      flex: 0 0 auto;
      box-sizing: border-box;
      padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
      background: var(--ion-background-color, #f4f5f8);
      border-top: 0.55px solid var(--border-color, rgba(0, 0, 0, 0.08));
      box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.06);
    }

    .start-match-btn {
      --border-radius: 14px;
      font-weight: 600;
      font-size: 1.0625rem;
      min-height: 50px;
      margin: 0;
    }
  `]
})
export class SetupComponent implements OnInit {
  private readonly state = inject(UmpireStateService);
  private readonly toastController = inject(ToastController);

  readonly overs = signal('20');
  readonly ballsPerOver = signal('6');
  readonly wickets = signal('11');
  readonly showWide = signal(true);
  readonly showNoBall = signal(true);
  readonly showLb = signal(false);
  readonly showBye = signal(false);
  readonly teamName = signal('');
  readonly battingSecond = signal(false);
  readonly chaseTarget = signal('');
  readonly formRevision = signal(0);

  readonly matchStarted = output<void>();
  readonly dismissed = output<void>();

  constructor() {
    effect(() => {
      this.state.setupDefaultsRevision();
      this.applyDefaultsFromStorage();
    });
  }

  ngOnInit(): void {
    this.applyDefaultsFromStorage();
  }

  private applyDefaultsFromStorage(): void {
    const defaults = this.state.loadSetupDefaults();
    this.overs.set(String(defaults.overs));
    this.ballsPerOver.set(String(defaults.ballsPerOver));
    this.wickets.set(String(defaults.wickets));
    this.showWide.set(defaults.showWide);
    this.showNoBall.set(defaults.showNoBall);
    this.showLb.set(defaults.showLb);
    this.showBye.set(defaults.showBye);
    this.teamName.set(defaults.teamName ?? '');
    this.battingSecond.set(!!defaults.battingSecond);
    this.chaseTarget.set(
      defaults.battingSecond && (defaults.chaseTarget ?? 0) > 0 ? String(defaults.chaseTarget) : ''
    );
    this.formRevision.update(n => n + 1);
  }

  onBattingSecond(ev: Event): void {
    const checked = (ev as CustomEvent<{ checked: boolean }>).detail.checked;
    this.battingSecond.set(!!checked);
    if (!checked) this.chaseTarget.set('');
  }

  onChaseTargetInput(ev: Event): void {
    const val = String((ev as CustomEvent<{ value?: string | null }>).detail?.value ?? '');
    this.chaseTarget.set(val);
  }

  onTeamNameInput(ev: Event): void {
    const val = String((ev as CustomEvent<{ value?: string | null }>).detail?.value ?? '');
    this.teamName.set(val);
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
    const battingSecond = this.battingSecond();
    const chase = battingSecond ? this.parseNum(this.chaseTarget(), 1, 9999, 0) : 0;
    if (battingSecond && chase <= 0) {
      void this.toast('Enter a target (runs to win) when chasing.');
      return;
    }
    const config: UmpireSetupConfig = {
      overs: this.parseNum(this.overs(), 1, 999, 20),
      ballsPerOver: this.parseNum(this.ballsPerOver(), 1, 12, 6),
      wickets: this.parseNum(this.wickets(), 1, 20, 11),
      showWide: this.showWide(),
      showNoBall: this.showNoBall(),
      showLb: this.showLb(),
      showBye: this.showBye(),
      teamName: this.teamName().trim() || undefined,
      battingSecond,
      chaseTarget: chase > 0 ? chase : undefined
    };
    this.state.startSession(config);
    this.matchStarted.emit();
  }

  private parseNum(val: string, min: number, max: number, fallback: number): number {
    const n = parseInt(val.replace(/\D/g, ''), 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  private async toast(message: string): Promise<void> {
    const t = await this.toastController.create({ message, duration: 2500, position: 'top' });
    await t.present();
  }
}

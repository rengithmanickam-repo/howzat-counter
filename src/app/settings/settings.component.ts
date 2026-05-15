import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonItem,
  IonToggle,
  IonList,
  IonNote
} from '@ionic/angular/standalone';
import { UmpireStateService } from '../umpire-counter/umpire-state.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, IonContent, IonHeader, IonToolbar, IonTitle,
    IonItem, IonToggle, IonList, IonNote
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="false" class="settings-ion-content app-safe-content">
      <div class="settings-page">
        <div class="section-card">
          <h2 class="section-title">Feedback</h2>
          <ion-list>
            <ion-item>
              <ion-toggle [checked]="state.hapticEnabled()" (ionChange)="onHaptic($event)">Haptic on keypad</ion-toggle>
            </ion-item>
            <ion-item>
              <ion-toggle [checked]="state.wicketSoundEnabled()" (ionChange)="onWicketSound($event)">
                Sound on wicket
              </ion-toggle>
            </ion-item>
          </ion-list>
        </div>

        @if (state.sessionActive()) {
          <div class="section-card">
            <h2 class="section-title">Current Match</h2>
            @if (state.teamName()) {
              <div class="match-team">{{ state.teamName() }}</div>
            }
            <div class="match-info">
              <div class="info-row">
                <span class="info-label">Overs</span>
                <span class="info-value">{{ state.maxOvers() }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Balls per over</span>
                <span class="info-value">{{ state.ballsPerOver() }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Max wickets</span>
                <span class="info-value">{{ state.maxWickets() }}</span>
              </div>
              @if (state.chaseTarget() > 0) {
                <div class="info-row">
                  <span class="info-label">Chase target</span>
                  <span class="info-value">{{ state.chaseTarget() }}</span>
                </div>
              }
            </div>
            <ion-note class="section-hint">
              Match limits are set during setup. Reset the match to change them.
            </ion-note>
          </div>
        }

        <div class="section-card">
          <h2 class="section-title">Extras Visibility</h2>
          <ion-list>
            <ion-item>
              <ion-toggle [checked]="state.keypad().showWide" (ionChange)="onToggle('showWide', $event)">Wide (Wd)</ion-toggle>
            </ion-item>
            <ion-item>
              <ion-toggle [checked]="state.keypad().showNoBall" (ionChange)="onToggle('showNoBall', $event)">No-ball (Nb)</ion-toggle>
            </ion-item>
            <ion-item>
              <ion-toggle [checked]="state.keypad().showLb" (ionChange)="onToggle('showLb', $event)">Leg-bye (Lb)</ion-toggle>
            </ion-item>
            <ion-item>
              <ion-toggle [checked]="state.keypad().showBye" (ionChange)="onToggle('showBye', $event)">Bye</ion-toggle>
            </ion-item>
          </ion-list>
          <ion-note class="help-block">
            Toggle which extra buttons appear on the scoring keypad.
          </ion-note>
        </div>

        <div class="section-card section-card--info">
          <h2 class="section-title">About</h2>
          <ion-note class="section-hint">
            Howzat - Counter v1.1.0 (2)<br>
            Cricket umpire scoring counter.
          </ion-note>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .settings-ion-content {
      --background: var(--ion-background-color, #f4f5f8);
    }

    .settings-page {
      padding: 16px 14px calc(16px + var(--app-safe-bottom, env(safe-area-inset-bottom, 12px)));
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid var(--border-color, #e2e8f0);
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      padding: 16px;
    }

    .section-card--info {
      background: var(--ion-background-color, #f4f5f8);
    }

    .section-title {
      font-size: 1rem;
      font-weight: 700;
      margin: 0 0 12px;
      color: var(--ion-text-color);
    }

    .section-hint {
      display: block;
      margin: 8px 0 0;
      font-size: 0.85rem;
      line-height: 1.45;
      color: var(--ion-color-medium-shade, #5f6368);
    }

    .help-block {
      display: block;
      margin-top: 12px;
      font-size: 0.8rem;
      line-height: 1.45;
    }

    .match-team {
      font-size: 0.9rem;
      font-weight: 700;
      margin-bottom: 10px;
      color: var(--ion-color-primary-shade, #4854e0);
    }

    .match-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 8px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
    }

    .info-label {
      font-size: 0.9rem;
      color: var(--ion-color-medium-shade, #5f6368);
    }

    .info-value {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--ion-text-color);
      font-variant-numeric: tabular-nums;
    }
  `]
})
export class SettingsComponent implements OnInit {
  readonly state = inject(UmpireStateService);

  ngOnInit(): void {
    this.state.ensureLoaded();
  }

  onToggle(key: 'showWide' | 'showNoBall' | 'showLb' | 'showBye', ev: Event): void {
    const checked = (ev as CustomEvent<{ checked: boolean }>).detail.checked;
    this.state.updateKeypad({ [key]: !!checked });
  }

  onHaptic(ev: Event): void {
    const checked = (ev as CustomEvent<{ checked: boolean }>).detail.checked;
    this.state.setHapticEnabled(!!checked);
  }

  onWicketSound(ev: Event): void {
    const checked = (ev as CustomEvent<{ checked: boolean }>).detail.checked;
    this.state.setWicketSoundEnabled(!!checked);
  }
}

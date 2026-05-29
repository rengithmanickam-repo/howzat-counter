import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
  IonContent,
  IonItem,
  IonToggle,
  IonList,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonLabel
} from '@ionic/angular/standalone';
import { UmpireStateService } from '../umpire-counter/umpire-state.service';
import { PageHeaderComponent } from '../components/page-header.component';
import { ThemeService, type ThemePreference } from '../services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonItem,
    IonToggle,
    IonList,
    IonNote,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    PageHeaderComponent
  ],
  template: `
    <app-page-header title="Settings" />
    <ion-content [fullscreen]="false" class="settings-ion-content app-safe-content">
      <div class="settings-page">
        <div class="section-card">
          <h2 class="section-title">Appearance</h2>
          <ion-segment
            class="theme-segment"
            [value]="theme.preference()"
            (ionChange)="onThemeChange($event)"
          >
            <ion-segment-button value="system">
              <ion-label>System</ion-label>
            </ion-segment-button>
            <ion-segment-button value="light">
              <ion-label>Light</ion-label>
            </ion-segment-button>
            <ion-segment-button value="dark">
              <ion-label>Dark</ion-label>
            </ion-segment-button>
          </ion-segment>
          <ion-note class="section-hint">
            Choose light or dark mode, or match your device setting.
          </ion-note>
        </div>

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
            <ion-item>
              <ion-toggle [checked]="state.scoreToastEnabled()" (ionChange)="onScoreToast($event)">
                Toast on four, six &amp; wicket
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
            Howzat - Counter v{{ appVersion() }}<br>
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
      padding: 16px 14px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section-card {
      padding: 16px;
    }

    .section-card--info {
      background: var(--app-surface-muted, var(--ion-background-color));
    }

    .section-title {
      font-size: 1rem;
      font-weight: 700;
      margin: 0 0 12px;
      color: var(--ion-text-color);
    }

    .theme-segment {
      width: 100%;
      margin-bottom: 4px;
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
  readonly theme = inject(ThemeService);
  readonly appVersion = signal('1.2.0');

  ngOnInit(): void {
    this.state.ensureLoaded();
    void this.loadAppVersion();
  }

  private async loadAppVersion(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        const info = await App.getInfo();
        this.appVersion.set(`${info.version} (${info.build})`);
      }
    } catch { /* keep package fallback */ }
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

  onScoreToast(ev: Event): void {
    const checked = (ev as CustomEvent<{ checked: boolean }>).detail.checked;
    this.state.setScoreToastEnabled(!!checked);
  }

  onThemeChange(ev: Event): void {
    const value = (ev as CustomEvent<{ value?: string }>).detail.value;
    if (value === 'system' || value === 'light' || value === 'dark') {
      this.theme.setPreference(value as ThemePreference);
    }
  }
}

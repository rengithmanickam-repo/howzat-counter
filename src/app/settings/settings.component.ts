import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonItem,
  IonToggle,
  IonList,
  IonInput,
  IonNote,
  IonIcon,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { refreshOutline } from 'ionicons/icons';
import { UmpireStateService } from '../umpire-counter/umpire-state.service';
import type { KeypadPreset } from '../umpire-counter/umpire-counter.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, IonContent, IonHeader, IonToolbar, IonTitle,
    IonButton, IonItem, IonToggle, IonList, IonInput, IonNote, IonIcon
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="false" class="settings-ion-content">
      <div class="settings-page">
        <!-- Keypad & Rules -->
        <div class="section-card">
          <h2 class="section-title">Keypad &amp; Rules</h2>
          <p class="preset-label">Preset</p>
          <div class="preset-row">
            <ion-button
              size="small"
              [fill]="state.keypad().preset === 'leather' ? 'solid' : 'outline'"
              (click)="state.applyPreset('leather')"
            >Leather</ion-button>
            <ion-button
              size="small"
              [fill]="state.keypad().preset === 'tennis' ? 'solid' : 'outline'"
              (click)="state.applyPreset('tennis')"
            >Tennis / soft</ion-button>
            <ion-button
              size="small"
              [fill]="state.keypad().preset === 'custom' ? 'solid' : 'outline'"
              (click)="state.applyPreset('custom')"
            >Custom</ion-button>
          </div>
          <ion-list>
            <ion-item>
              <ion-toggle [checked]="state.keypad().showWide" (ionChange)="onToggle('showWide', $event)">Show Wide (Wd)</ion-toggle>
            </ion-item>
            <ion-item>
              <ion-toggle [checked]="state.keypad().showNoBall" (ionChange)="onToggle('showNoBall', $event)">Show No-ball (Nb)</ion-toggle>
            </ion-item>
            <ion-item>
              <ion-toggle [checked]="state.keypad().showLb" (ionChange)="onToggle('showLb', $event)">Show Leg-bye (Lb)</ion-toggle>
            </ion-item>
            <ion-item>
              <ion-toggle [checked]="state.keypad().showBye" (ionChange)="onToggle('showBye', $event)">Show Bye</ion-toggle>
            </ion-item>
          </ion-list>
          <ion-note class="help-block">
            After Wd/Nb, tap 0–6 for runs off that delivery, or Done (+0) for wide/no-ball only.
            Tap W for a wicket on the same delivery (e.g. run out on a wide).
            Lb/Bye count as one legal delivery each (1 run by default).
          </ion-note>
        </div>

        <!-- Match Limits -->
        <div class="section-card">
          <h2 class="section-title">Match Limits</h2>
          <ion-note class="section-hint">
            Max overs is a reference only (logging is never locked). Use 0 for no cap.
          </ion-note>
          <ion-list class="limits-input-list" lines="full">
            <ion-item>
              <ion-input
                label="Balls per over"
                labelPlacement="stacked"
                helperText="Legal deliveries in one over (1–12)"
                type="number"
                inputmode="numeric"
                [value]="limitsBpo()"
                (ionInput)="onLimitsInput('bpo', $event)"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                label="Max wickets"
                labelPlacement="stacked"
                helperText="Wicket cap for this counter (1–20)"
                type="number"
                inputmode="numeric"
                [value]="limitsMw()"
                (ionInput)="onLimitsInput('mw', $event)"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                label="Target overs (header)"
                labelPlacement="stacked"
                helperText="Shown as /N in the score line; use 0 to hide"
                type="number"
                inputmode="numeric"
                [value]="limitsMo()"
                (ionInput)="onLimitsInput('mo', $event)"
              ></ion-input>
            </ion-item>
          </ion-list>
          <div class="save-row">
            <ion-button expand="block" (click)="saveLimits()">Save Limits</ion-button>
          </div>
        </div>

        <!-- Danger Zone -->
        <div class="section-card section-card--danger">
          <h2 class="section-title section-title--danger">Reset</h2>
          <ion-note class="section-hint">
            This will clear all ball history, overs, wickets, runs/extras totals, and imported carry totals.
          </ion-note>
          <ion-button color="danger" expand="block" (click)="confirmReset()">
            <ion-icon name="refresh-outline" slot="start"></ion-icon>
            Reset Log &amp; Counters
          </ion-button>
        </div>
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

    .settings-ion-content {
      --background: var(--ion-background-color, #f4f5f8);
    }

    .settings-page {
      padding: 16px 14px calc(16px + env(safe-area-inset-bottom, 0px));
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

    .section-card--danger {
      border-color: var(--ion-color-danger-tint, #fca5a5);
    }

    .section-title {
      font-size: 1rem;
      font-weight: 700;
      margin: 0 0 12px;
      color: var(--ion-text-color);
    }

    .section-title--danger {
      color: var(--ion-color-danger);
    }

    .section-hint {
      display: block;
      margin: 0 0 12px;
      font-size: 0.85rem;
      line-height: 1.45;
      color: var(--ion-color-medium-shade, #5f6368);
    }

    .preset-label {
      font-size: 0.85rem;
      font-weight: 600;
      margin: 0 0 8px;
    }

    .preset-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }

    .help-block {
      display: block;
      margin-top: 12px;
      font-size: 0.8rem;
      line-height: 1.45;
    }

    .limits-input-list {
      padding: 0;
      background: transparent;
    }

    .limits-input-list ion-item {
      --padding-start: 0;
      --inner-padding-end: 0;
      --background: transparent;
    }

    .save-row {
      margin-top: 12px;
    }
  `]
})
export class SettingsComponent implements OnInit {
  readonly state = inject(UmpireStateService);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);

  readonly limitsBpo = signal('');
  readonly limitsMw = signal('');
  readonly limitsMo = signal('');

  constructor() {
    addIcons({ refreshOutline });
  }

  ngOnInit(): void {
    this.state.ensureLoaded();
    this.limitsBpo.set(String(this.state.ballsPerOver()));
    this.limitsMw.set(String(this.state.maxWickets()));
    this.limitsMo.set(String(this.state.maxOvers()));
  }

  onToggle(key: 'showWide' | 'showNoBall' | 'showLb' | 'showBye', ev: Event): void {
    const checked = (ev as CustomEvent<{ checked: boolean }>).detail.checked;
    this.state.updateKeypad({ [key]: !!checked });
  }

  onLimitsInput(field: 'bpo' | 'mw' | 'mo', ev: Event): void {
    const val = String((ev as CustomEvent<{ value?: string | number | null }>).detail?.value ?? '');
    if (field === 'bpo') this.limitsBpo.set(val);
    else if (field === 'mw') this.limitsMw.set(val);
    else this.limitsMo.set(val);
  }

  saveLimits(): void {
    this.state.applyMatchLimits({
      ballsPerOver: this.limitsBpo(),
      maxWickets: this.limitsMw(),
      maxOvers: this.limitsMo()
    });
    void this.toast('Match limits saved.');
  }

  async confirmReset(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Reset umpire log?',
      message: 'Ball history, overs, wickets, runs/extras totals, and imported carry totals will be cleared.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reset',
          role: 'destructive',
          handler: () => {
            this.state.resetAll();
            void this.toast('Log and counters reset.');
          }
        }
      ]
    });
    await alert.present();
  }

  private async toast(message: string): Promise<void> {
    const t = await this.toastController.create({ message, duration: 2000, position: 'bottom' });
    await t.present();
  }
}

import { Component, output } from '@angular/core';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { ThemeToggleComponent } from '../components/theme-toggle.component';

@Component({
  selector: 'app-start',
  standalone: true,
  imports: [IonButton, IonContent, ThemeToggleComponent],
  template: `
    <app-theme-toggle overlay />
    <ion-content [fullscreen]="false" class="start-ion-content app-safe-content">
      <div class="start-page">
        <div class="brand-area">
          <div class="app-icon-ring">
            <img src="assets/icons/howzat-app-icon.png" alt="Howzat" class="app-icon" />
          </div>
          <h1 class="app-title">Howzat</h1>
          <p class="app-subtitle">Cricket Umpire Counter</p>
        </div>
        <div class="action-area">
          <ion-button expand="block" size="large" class="start-btn" (click)="startTap.emit()">
            Start
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

    .start-ion-content {
      flex: 1 1 auto;
      min-height: 0;
      --background: var(--ion-background-color, #f4f5f8);
      --padding-start: 0;
      --padding-end: 0;
      --padding-top: var(--app-safe-top, max(env(safe-area-inset-top, 0px), 12px));
      --padding-bottom: 0;
    }

    .start-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100%;
      padding: 24px 24px calc(32px + var(--app-safe-bottom, env(safe-area-inset-bottom, 12px)));
      box-sizing: border-box;
      gap: 48px;
    }

    .brand-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .app-icon-ring {
      width: 120px;
      height: 120px;
      border-radius: 28px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(15, 23, 42, 0.12);
    }

    .app-icon {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .app-title {
      font-size: clamp(2.2rem, 10vw, 3.5rem);
      font-weight: 900;
      letter-spacing: -0.04em;
      color: var(--ion-color-primary-shade, #4854e0);
      margin: 0;
      line-height: 1;
    }

    .app-subtitle {
      font-size: clamp(0.9rem, 3.5vw, 1.1rem);
      font-weight: 600;
      color: var(--ion-color-medium-shade, #5f6368);
      margin: 0;
      letter-spacing: 0.02em;
    }

    .action-area {
      width: 100%;
      max-width: 320px;
    }

    .start-btn {
      --border-radius: 14px;
      font-weight: 800;
      font-size: 1.15rem;
      letter-spacing: 0.02em;
      min-height: 56px;
    }
  `]
})
export class StartComponent {
  readonly startTap = output<void>();
}

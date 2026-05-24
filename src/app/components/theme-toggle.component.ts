import { Component, inject } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { moonOutline, sunnyOutline } from 'ionicons/icons';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [IonButton, IonIcon],
  template: `
    <ion-button
      fill="clear"
      class="theme-toggle-btn"
      (click)="theme.toggleTheme()"
      [attr.aria-label]="theme.effectiveTheme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
      [attr.aria-pressed]="theme.effectiveTheme() === 'dark'"
    >
      <ion-icon
        slot="icon-only"
        [name]="theme.effectiveTheme() === 'dark' ? 'sunny-outline' : 'moon-outline'"
      />
    </ion-button>
  `,
  styles: [`
    :host {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: calc(var(--app-toolbar-content-height, 56px) + var(--app-safe-top, env(safe-area-inset-top, 12px)));
      padding-top: var(--app-safe-top, env(safe-area-inset-top, 12px));
      box-sizing: border-box;
      pointer-events: none;
    }

    .theme-toggle-btn {
      pointer-events: auto;
      margin: 0;
      width: 44px;
      height: 44px;
      --padding-start: 0;
      --padding-end: 0;
      --border-radius: 50%;
      --color: var(--ion-color-medium-shade);
    }

    .theme-toggle-btn::part(native) {
      border-radius: 50%;
    }

    .theme-toggle-btn ion-icon {
      font-size: 1.35rem;
    }
  `]
})
export class ThemeToggleComponent {
  readonly theme = inject(ThemeService);

  constructor() {
    addIcons({ moonOutline, sunnyOutline });
  }
}

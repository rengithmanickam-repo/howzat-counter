import { booleanAttribute, Component, inject, input } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { moonOutline, sunnyOutline } from 'ionicons/icons';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [IonButton, IonIcon],
  host: {
    class: 'theme-toggle-host',
    '[class.theme-toggle-host--overlay]': 'overlay()'
  },
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
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }

    .theme-toggle-btn {
      margin: 0;
      width: 44px;
      height: 44px;
      --padding-start: 0;
      --padding-end: 0;
      --padding-top: 0;
      --padding-bottom: 0;
      --border-radius: 50%;
      --color: var(--ion-color-medium-shade);
    }

    .theme-toggle-btn::part(native) {
      border-radius: 50%;
    }

    .theme-toggle-btn ion-icon {
      font-size: 1.45rem;
    }

    :host(.theme-toggle-host--overlay) {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 10000;
      box-sizing: border-box;
      width: 52px;
      height: calc(var(--app-toolbar-content-height, 56px) + var(--app-safe-top, env(safe-area-inset-top, 12px)));
      padding-top: var(--app-safe-top, env(safe-area-inset-top, 12px));
      pointer-events: none;
    }

    :host(.theme-toggle-host--overlay) .theme-toggle-btn {
      pointer-events: auto;
    }
  `]
})
export class ThemeToggleComponent {
  readonly overlay = input(false, { transform: booleanAttribute });
  readonly theme = inject(ThemeService);

  constructor() {
    addIcons({ moonOutline, sunnyOutline });
  }
}

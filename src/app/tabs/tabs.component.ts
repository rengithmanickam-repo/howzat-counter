import { Component } from '@angular/core';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonRouterOutlet,
  IonIcon,
  IonLabel
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { helpCircleOutline, homeOutline, listOutline, settingsOutline } from 'ionicons/icons';
import { ThemeToggleComponent } from '../components/theme-toggle.component';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [IonTabs, IonRouterOutlet, IonTabBar, IonTabButton, IonIcon, IonLabel, ThemeToggleComponent],
  template: `
    <ion-tabs>
      <app-theme-toggle />
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home">
          <ion-icon name="home-outline"></ion-icon>
          <ion-label>Home</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="history">
          <ion-icon name="list-outline"></ion-icon>
          <ion-label>History</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="help">
          <ion-icon name="help-circle-outline"></ion-icon>
          <ion-label>Help</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="settings">
          <ion-icon name="settings-outline"></ion-icon>
          <ion-label>Settings</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: [`
    ion-tab-bar {
      --border: 1px solid var(--border-color, rgba(0, 0, 0, 0.06));
      padding-bottom: var(--app-safe-bottom, env(safe-area-inset-bottom, 12px));
    }

    ion-tab-button ion-label {
      font-size: 0.65rem;
    }
  `]
})
export class TabsComponent {
  constructor() {
    addIcons({ homeOutline, listOutline, helpCircleOutline, settingsOutline });
  }
}

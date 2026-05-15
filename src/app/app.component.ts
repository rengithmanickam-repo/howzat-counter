import { Component, afterNextRender, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { AppUpdateService } from './services/app-update.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `,
  styles: []
})
export class AppComponent {
  private readonly appUpdate = inject(AppUpdateService);

  constructor() {
    afterNextRender(() => void this.appUpdate.init());
  }
}

import { Component, input } from '@angular/core';
import { IonHeader, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [IonHeader, IonToolbar],
  template: `
    <ion-header>
      <ion-toolbar class="app-page-toolbar">
        <div class="app-page-header-row">
          <h1 class="app-page-header-title">{{ title() }}</h1>
        </div>
      </ion-toolbar>
    </ion-header>
  `
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
}

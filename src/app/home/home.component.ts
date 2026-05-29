import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonModal } from '@ionic/angular/standalone';
import { UmpireStateService } from '../umpire-counter/umpire-state.service';
import { StartComponent } from '../start/start.component';
import { SetupComponent } from '../setup/setup.component';
import { UmpireCounterComponent } from '../umpire-counter/umpire-counter.component';

type HomeView = 'start' | 'counter';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, IonModal, StartComponent, SetupComponent, UmpireCounterComponent],
  template: `
    @switch (view()) {
      @case ('start') {
        <app-start (startTap)="onStartTap()" />
      }
      @case ('counter') {
        <app-umpire-counter (resetDone)="view.set('start')" />
      }
    }

    <ion-modal
      class="setup-sheet-modal"
      [isOpen]="setupModalOpen()"
      [backdropDismiss]="true"
      (didDismiss)="onSetupDismiss()"
    >
      <ng-template>
        <div class="ion-page setup-sheet-page">
          <app-setup
            (matchStarted)="onMatchStarted()"
            (dismissed)="onSetupDismiss()"
          />
        </div>
      </ng-template>
    </ion-modal>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    }

    :host > app-start,
    :host > app-umpire-counter {
      flex: 1 1 auto;
      min-height: 0;
      width: 100%;
      height: 100%;
    }
  `]
})
export class HomeComponent implements OnInit {
  private readonly state = inject(UmpireStateService);

  readonly view = signal<HomeView>('start');
  readonly setupModalOpen = signal(false);

  ngOnInit(): void {
    this.state.ensureLoaded();
    if (this.state.sessionActive()) {
      this.view.set('counter');
    }
  }

  onStartTap(): void {
    this.state.clearChaseSetupDefaults();
    this.setupModalOpen.set(true);
  }

  onMatchStarted(): void {
    this.setupModalOpen.set(false);
    this.view.set('counter');
  }

  onSetupDismiss(): void {
    this.setupModalOpen.set(false);
  }
}

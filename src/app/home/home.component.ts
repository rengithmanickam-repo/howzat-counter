import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UmpireStateService } from '../umpire-counter/umpire-state.service';
import { StartComponent } from '../start/start.component';
import { SetupComponent } from '../setup/setup.component';
import { UmpireCounterComponent } from '../umpire-counter/umpire-counter.component';

type HomeView = 'start' | 'setup' | 'counter';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, StartComponent, SetupComponent, UmpireCounterComponent],
  template: `
    @switch (view()) {
      @case ('start') {
        <app-start (startTap)="view.set('setup')" />
      }
      @case ('setup') {
        <app-setup (matchStarted)="view.set('counter')" (backTap)="view.set('start')" />
      }
      @case ('counter') {
        <app-umpire-counter (resetDone)="view.set('start')" />
      }
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    }

    :host > * {
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

  ngOnInit(): void {
    this.state.ensureLoaded();
    if (this.state.sessionActive()) {
      this.view.set('counter');
    }
  }
}

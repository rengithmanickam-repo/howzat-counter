import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./umpire-counter/umpire-counter.component').then(m => m.UmpireCounterComponent)
  },
  { path: '**', redirectTo: '' }
];

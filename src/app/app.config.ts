import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { ThemeService } from './services/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideIonicAngular({}),
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [ThemeService],
      useFactory: (theme: ThemeService) => () => {
        theme.init();
      }
    }
  ]
};

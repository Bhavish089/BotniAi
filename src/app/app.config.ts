import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // This tells Angular NOT to look for zone.js
    provideZonelessChangeDetection(), 
    provideRouter(routes)
  ]
};
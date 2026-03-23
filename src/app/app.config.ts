import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http'; // ADD THIS
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient() // ADD THIS
  ]
};
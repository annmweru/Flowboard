// ================================================================
// WHY THIS FILE EXISTS (App Config):
// Angular 17 uses standalone components + provideX() functions
// instead of NgModules. This file replaces AppModule.
// Everything that used to go in @NgModule providers goes here.
// ================================================================

import { ApplicationConfig }   from '@angular/core';
import { provideRouter }       from '@angular/router';
import { provideAnimations }   from '@angular/platform-browser/animations';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideDatabase, getDatabase }      from '@angular/fire/database';
import { provideAuth, getAuth }              from '@angular/fire/auth';
import { provideStore }        from '@ngrx/store';
import { provideEffects }      from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { routes }              from './app.routes';
import { environment }         from '../environments/environment';
import { authReducer }         from './features/auth/store/auth.store';
import { AuthEffects }         from './features/auth/store/auth.store';
import { boardReducer }        from './features/board/store/board.store';
import { BoardEffects }        from './features/board/store/board.store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),

    // Firebase providers
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideDatabase(() => getDatabase()),
    provideAuth(() => getAuth()),

    // NgRx store — feature slices named 'auth' and 'board'
    provideStore({
      auth:  authReducer,
      board: boardReducer,
    }),

    // Effects
    provideEffects([AuthEffects, BoardEffects]),

    // DevTools — shows every action/state change in browser extension
    // Remove in production for security
    provideStoreDevtools({
      maxAge: 25,
      logOnly: environment.production,
    }),
  ]
};

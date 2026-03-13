// ================================================================
// WHY THIS FILE EXISTS (Routes):
// Centralised routing config. WHY LAZY LOADING:
// Each feature module is loaded only when the user navigates to it.
// The initial bundle is smaller → faster first load → better
// Lighthouse performance score → better portfolio impression.
// ================================================================

import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'boards',
    pathMatch: 'full'
  },
  {
    path: 'login',
    // Lazy load — only downloaded when user visits /login
    loadComponent: () =>
      import('./features/auth/components/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/components/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'boards',
    canActivate: [authGuard], // guard runs before component loads
    loadComponent: () =>
      import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'board/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/board/components/board.component').then(m => m.BoardComponent)
  },
  {
    path: '**',
    redirectTo: 'boards'
  }
];

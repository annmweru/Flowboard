
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
    canActivate: [authGuard],
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

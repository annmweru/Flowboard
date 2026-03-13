// ================================================================
// WHY THIS FILE EXISTS (Auth Guard):
// Without this guard, any user who knows the URL can visit
// /boards/abc123 even if they're not logged in. The guard runs
// BEFORE the component loads and redirects to /login if needed.
//
// WHY FUNCTIONAL GUARD (not class-based):
// Angular 17 prefers the inject() pattern for guards — less
// boilerplate and more tree-shakeable. Class-based guards still
// work but this is the modern approach.
// ================================================================

import { inject }      from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store }       from '@ngrx/store';
import { map, take }   from 'rxjs/operators';
import { selectIsLoggedIn } from '../../features/auth/store/auth.store';

export const authGuard: CanActivateFn = (route, state) => {
  const store  = inject(Store);
  const router = inject(Router);

  return store.select(selectIsLoggedIn).pipe(
    take(1), // take(1) = read once and complete — we don't want a live subscription
    map(isLoggedIn => {
      if (isLoggedIn) return true;
      // Redirect to login, passing the intended URL so we can redirect back after login
      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url }
      });
    })
  );
};

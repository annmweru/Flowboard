// ================================================================
// WHY THIS FILE EXISTS (App Root Component):
// The root component that bootstraps everything. It:
// 1. Listens to Firebase auth state and syncs it to NgRx store
// 2. Renders <router-outlet> which swaps components based on URL
//
// WHY LISTEN TO AUTH HERE (not in Effects):
// Firebase auth state can change externally (session expiry,
// sign-out from another tab). We need to catch that globally,
// not just when the user explicitly clicks "sign in".
// ================================================================

import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet }  from '@angular/router';
import { Store }         from '@ngrx/store';
import { FirebaseService } from './core/services/firebase.service';
import { AuthActions }   from './features/auth/store/auth.store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styles: [`
    :host { display: block; min-height: 100vh; }
  `]
})
export class AppComponent implements OnInit {
  private store = inject(Store);
  private fb    = inject(FirebaseService);

  ngOnInit() {
    // Subscribe to Firebase auth changes for the lifetime of the app.
    // This means if a user's session expires while they're on a board,
    // they get redirected to login automatically.
    this.fb.authState$.subscribe(user => {
      this.store.dispatch(AuthActions.setUser({ user }));
    });
  }
}

import { createAction, props, createReducer, on,
         createSelector, createFeatureSelector,
         } from '@ngrx/store';
  import {createEffect, Actions, ofType } from '@ngrx/effects';
import { Injectable, inject }  from '@angular/core';
import { Router }              from '@angular/router';
import { switchMap, map, catchError, tap } from 'rxjs/operators';
import { of }                  from 'rxjs';
import { FirebaseService }     from '../../../core/services/firebase.service';
import { User }                from '../../../core/models';

// ── State interface ────────────────────────────────────────
export interface AuthState {
  user:    User | null;
  loading: boolean;
  error:   string | null;
}

const initialState: AuthState = {
  user:    null,
  loading: false,
  error:   null,
};

export const AuthActions = {
  signIn:          createAction('[Auth] Sign In',         props<{ email: string; password: string }>()),
  signInSuccess:   createAction('[Auth] Sign In Success', props<{ user: User }>()),
  signInFailure:   createAction('[Auth] Sign In Failure', props<{ error: string }>()),

  register:        createAction('[Auth] Register',        props<{ email: string; password: string; displayName: string }>()),
  registerSuccess: createAction('[Auth] Register Success',props<{ user: User }>()),
  registerFailure: createAction('[Auth] Register Failure',props<{ error: string }>()),

  signOut:         createAction('[Auth] Sign Out'),
  signOutSuccess:  createAction('[Auth] Sign Out Success'),

  setUser:         createAction('[Auth] Set User',        props<{ user: User | null }>()),
};

// ── Reducer ────────────────────────────────────────────────
// WHY PURE FUNCTION: A reducer is a pure function — same inputs
// always produce same outputs, no side effects. This makes
// state transitions 100% predictable and testable.
export const authReducer = createReducer(
  initialState,
  on(AuthActions.signIn, AuthActions.register,
     state => ({ ...state, loading: true, error: null })),

  on(AuthActions.signInSuccess, AuthActions.registerSuccess,
    (state, { user }) => ({ ...state, user, loading: false, error: null })),

  on(AuthActions.signInFailure, AuthActions.registerFailure,
    (state, { error }) => ({ ...state, loading: false, error })),

  on(AuthActions.signOutSuccess,
    state => ({ ...state, user: null })),

  on(AuthActions.setUser,
    (state, { user }) => ({ ...state, user })),
);

// ── Selectors ──────────────────────────────────────────────
// WHY SELECTORS: They memoize (cache) derived state. A component
// that selects `selectUser` only re-renders when the user changes,
// not when unrelated parts of the store update.
const selectAuthFeature = createFeatureSelector<AuthState>('auth');
export const selectUser    = createSelector(selectAuthFeature, s => s.user);
export const selectLoading = createSelector(selectAuthFeature, s => s.loading);
export const selectError   = createSelector(selectAuthFeature, s => s.error);
export const selectIsLoggedIn = createSelector(selectUser, user => !!user);

// ── Effects ────────────────────────────────────────────────
// WHY EFFECTS: Side effects (HTTP calls, Firebase, navigation)
// don't belong in reducers (which must be pure). Effects listen
// for actions, perform the async work, then dispatch new actions.
@Injectable()
export class AuthEffects {
  private actions$ = inject(Actions);
  private fb       = inject(FirebaseService);
  private router   = inject(Router);

  signIn$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.signIn),
      switchMap(({ email, password }) =>
        this.fb.signIn(email, password).pipe(
          // switchMap cancels previous in-flight sign-in if user submits again
          map(cred => AuthActions.signInSuccess({
            user: {
              uid:         cred.user.uid,
              email:       cred.user.email ?? '',
              displayName: cred.user.displayName ?? email,
              createdAt:   Date.now()
            }
          })),
          catchError(err => of(AuthActions.signInFailure({ error: err.message })))
        )
      )
    )
  );

  signInSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.signInSuccess, AuthActions.registerSuccess),
      tap(() => this.router.navigate(['/boards']))
    ),
    { dispatch: false } // no new action dispatched — just navigation
  );

  register$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.register),
      switchMap(({ email, password, displayName }) =>
        this.fb.register(email, password, displayName).pipe(
          map(cred => AuthActions.registerSuccess({
            user: {
              uid: cred.user.uid, email: cred.user.email ?? '',
              displayName, createdAt: Date.now()
            }
          })),
          catchError(err => of(AuthActions.registerFailure({ error: err.message })))
        )
      )
    )
  );

  signOut$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.signOut),
      switchMap(() => this.fb.signOut().pipe(
        map(() => AuthActions.signOutSuccess()),
        tap(() => this.router.navigate(['/login']))
      ))
    )
  );
}

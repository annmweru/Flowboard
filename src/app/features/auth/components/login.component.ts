// ================================================================
// WHY THIS FILE EXISTS (Login Component):
// Handles sign-in form. Uses Angular's Reactive Forms (not
// template-driven) because:
// 1. Validation logic stays in TypeScript, not the template
// 2. Easier to unit test
// 3. Better for complex multi-step forms later
// ================================================================

import { Component, inject }          from '@angular/core';
import { CommonModule }               from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink }                 from '@angular/router';
import { Store }                      from '@ngrx/store';
import { AuthActions, selectLoading, selectError } from '../store/auth.store';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">flow<span>board</span></div>
        <h1 class="auth-title">Welcome back</h1>
        <p class="auth-sub">Sign in to your workspace</p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
          <div class="field">
            <label>Email</label>
            <input type="email" formControlName="email"
                   placeholder="you@company.com"
                   [class.invalid]="email?.invalid && email?.touched" />
            @if (email?.hasError('required') && email?.touched) {
              <span class="field-error">Email is required</span>
            }
          </div>

          <div class="field">
            <label>Password</label>
            <input type="password" formControlName="password"
                   placeholder="••••••••"
                   [class.invalid]="password?.invalid && password?.touched" />
            @if (password?.hasError('minlength') && password?.touched) {
              <span class="field-error">Minimum 6 characters</span>
            }
          </div>

          @if (error$ | async; as error) {
            <div class="auth-error">{{ error }}</div>
          }

          <button type="submit" class="btn-primary"
                  [disabled]="form.invalid || (loading$ | async)">
            {{ (loading$ | async) ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <p class="auth-footer">
          No account? <a routerLink="/register">Create one</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: var(--bg);
    }
    .auth-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      padding: 40px;
      width: 100%;
      max-width: 420px;
    }
    .auth-logo {
      font-family: var(--font-display);
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--text);
      margin-bottom: 28px;
    }
    .auth-logo span { color: var(--accent); }
    .auth-title {
      font-family: var(--font-display);
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
    }
    .auth-sub { font-size: 14px; color: var(--muted); margin-bottom: 32px; }
    .auth-form { display: flex; flex-direction: column; gap: 18px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 13px; font-weight: 500; color: var(--muted); }
    .field input {
      background: var(--bg3);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 12px 14px;
      color: var(--text);
      font-size: 14px;
      transition: border-color 0.2s;
      outline: none;
    }
    .field input:focus { border-color: var(--accent); }
    .field input.invalid { border-color: var(--danger); }
    .field-error { font-size: 12px; color: var(--danger); }
    .auth-error {
      background: rgba(255,95,87,0.08);
      border: 1px solid rgba(255,95,87,0.25);
      border-radius: var(--radius-sm);
      padding: 10px 14px;
      font-size: 13px;
      color: var(--danger);
    }
    .btn-primary {
      background: var(--accent);
      color: #0a0a0a;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 14px;
      padding: 13px;
      border-radius: var(--radius-md);
      border: none;
      transition: background 0.2s, opacity 0.2s;
      margin-top: 4px;
    }
    .btn-primary:hover:not(:disabled) { background: #a8d440; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .auth-footer { text-align: center; font-size: 13px; color: var(--muted); margin-top: 24px; }
    .auth-footer a { color: var(--accent); font-weight: 500; }
  `]
})
export class LoginComponent {
  private store = inject(Store);
  private fb    = inject(FormBuilder);

  loading$ = this.store.select(selectLoading);
  error$   = this.store.select(selectError);

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  get email()    { return this.form.get('email'); }
  get password() { return this.form.get('password'); }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { email, password } = this.form.value;
    this.store.dispatch(AuthActions.signIn({ email: email!, password: password! }));
  }
}

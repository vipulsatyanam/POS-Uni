import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div class="w-full max-w-md">

        <!-- Logo -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 shadow-lg mb-4">
            <svg class="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 3a1 1 0 110 2 1 1 0 010-2zm4 10H8a1 1 0 010-2h8a1 1 0 010 2zm0-4H8a1 1 0 010-2h8a1 1 0 010 2z"/>
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p class="text-sm text-slate-500 mt-1">Sign in to your POS account</p>
        </div>

        <!-- Card -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">

          @if (errorMsg()) {
            <div class="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {{ errorMsg() }}
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">

            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <input
                type="email"
                formControlName="email"
                placeholder="you@company.com"
                class="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                [class.border-red-400]="isInvalid('email')"
              />
              @if (isInvalid('email')) {
                <p class="mt-1 text-xs text-red-500">Please enter a valid email.</p>
              }
            </div>

            <!-- Password -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                formControlName="password"
                placeholder="••••••••"
                class="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                [class.border-red-400]="isInvalid('password')"
              />
              @if (isInvalid('password')) {
                <p class="mt-1 text-xs text-red-500">Password is required.</p>
              }
            </div>

            <!-- Submit -->
            <button
              type="submit"
              [disabled]="loading()"
              class="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium text-sm rounded-lg transition focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              @if (loading()) {
                <span class="inline-flex items-center gap-2">
                  <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in...
                </span>
              } @else {
                Sign in
              }
            </button>

          </form>
        </div>

        <!-- Register link -->
        <p class="text-center text-sm text-slate-500 mt-6">
          Don't have an account?
          <a routerLink="/register" class="text-brand-600 hover:text-brand-700 font-medium">Create one free</a>
        </p>

      </div>
    </div>
  `
})
export class LoginComponent {
  private fb   = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading  = signal(false);
  errorMsg = signal('');

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMsg.set('');

    const { email, password } = this.form.value;
    this.auth.login({ email: email!, password: password! }).subscribe({
      next: () => this.router.navigate(['/pos']),
      error: (err) => {
        this.errorMsg.set(err.error?.message ?? 'Login failed. Please try again.');
        this.loading.set(false);
      }
    });
  }
}

import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div class="w-full max-w-lg">

        <!-- Logo -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 shadow-lg mb-4">
            <svg class="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 3a1 1 0 110 2 1 1 0 010-2zm4 10H8a1 1 0 010-2h8a1 1 0 010 2zm0-4H8a1 1 0 010-2h8a1 1 0 010 2z"/>
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-slate-900">Create your account</h1>
          <p class="text-sm text-slate-500 mt-1">Start your free POS trial — no credit card required</p>
        </div>

        <!-- Card -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">

          @if (errorMsg()) {
            <div class="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {{ errorMsg() }}
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">

            <!-- Business name -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Business name</label>
              <input
                type="text"
                formControlName="tenantName"
                placeholder="Acme Retail Co."
                class="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                [class.border-red-400]="isInvalid('tenantName')"
                (input)="autoSlug()"
              />
              @if (isInvalid('tenantName')) {
                <p class="mt-1 text-xs text-red-500">Business name is required.</p>
              }
            </div>

            <!-- Slug -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">
                Store URL slug
                <span class="font-normal text-slate-400 ml-1">(auto-generated)</span>
              </label>
              <div class="flex rounded-lg border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-brand-500"
                   [class.border-red-400]="isInvalid('tenantSlug')">
                <span class="px-3 py-2.5 bg-slate-50 text-slate-400 text-sm border-r border-slate-300 whitespace-nowrap">pos.app/</span>
                <input
                  type="text"
                  formControlName="tenantSlug"
                  placeholder="acme-retail"
                  class="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-transparent"
                />
              </div>
              @if (isInvalid('tenantSlug')) {
                <p class="mt-1 text-xs text-red-500">Slug must be lowercase letters, numbers and hyphens only.</p>
              }
            </div>

            <!-- Name row -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">First name</label>
                <input
                  type="text"
                  formControlName="firstName"
                  placeholder="Jane"
                  class="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                  [class.border-red-400]="isInvalid('firstName')"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Last name</label>
                <input
                  type="text"
                  formControlName="lastName"
                  placeholder="Smith"
                  class="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                  [class.border-red-400]="isInvalid('lastName')"
                />
              </div>
            </div>

            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Work email</label>
              <input
                type="email"
                formControlName="email"
                placeholder="jane@acmecorp.com"
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
                placeholder="Min. 6 characters"
                class="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                [class.border-red-400]="isInvalid('password')"
              />
              @if (isInvalid('password')) {
                <p class="mt-1 text-xs text-red-500">Password must be at least 6 characters.</p>
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
                  Creating account...
                </span>
              } @else {
                Create free account
              }
            </button>

          </form>
        </div>

        <p class="text-center text-sm text-slate-500 mt-6">
          Already have an account?
          <a routerLink="/login" class="text-brand-600 hover:text-brand-700 font-medium">Sign in</a>
        </p>

      </div>
    </div>
  `
})
export class RegisterComponent {
  private fb   = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading  = signal(false);
  errorMsg = signal('');

  form = this.fb.group({
    tenantName: ['', Validators.required],
    tenantSlug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    firstName:  ['', Validators.required],
    lastName:   ['', Validators.required],
    email:      ['', [Validators.required, Validators.email]],
    password:   ['', [Validators.required, Validators.minLength(6)]]
  });

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }

  /** Auto-generate slug from business name */
  autoSlug(): void {
    const name = this.form.get('tenantName')?.value ?? '';
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    this.form.get('tenantSlug')?.setValue(slug, { emitEvent: false });
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMsg.set('');

    const v = this.form.value;
    this.auth.register({
      tenantName: v.tenantName!,
      tenantSlug: v.tenantSlug!,
      firstName:  v.firstName!,
      lastName:   v.lastName!,
      email:      v.email!,
      password:   v.password!
    }).subscribe({
      next: () => this.router.navigate(['/pos']),
      error: (err) => {
        this.errorMsg.set(err.error?.message ?? 'Registration failed. Please try again.');
        this.loading.set(false);
      }
    });
  }
}

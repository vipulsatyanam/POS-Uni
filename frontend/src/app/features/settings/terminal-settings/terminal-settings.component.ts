import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TyroService, TyroSettings } from '../../../core/services/tyro.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-terminal-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-2xl mx-auto">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-slate-900">EFTPOS Settings</h1>
        <p class="text-sm text-slate-500 mt-1">Configure your Tyro EFTPOS terminal connection.</p>
      </div>

      <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

        <!-- CONNECTION -->
        <div class="px-6 py-5 border-b border-slate-100">
          <p class="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-4">Connection</p>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Merchant ID (MID)</label>
              <input
                type="text"
                [(ngModel)]="mid"
                placeholder="e.g. 2203"
                class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <p class="text-xs text-slate-400 mt-1">Provided by Tyro when your account was created.</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Terminal ID (TID)</label>
              <input
                type="text"
                [(ngModel)]="tid"
                placeholder="e.g. 1"
                class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <p class="text-xs text-slate-400 mt-1">Found on the label on your physical terminal.</p>
            </div>
          </div>
        </div>

        <!-- MODE -->
        <div class="px-6 py-5 border-b border-slate-100">
          <p class="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-4">Mode</p>

          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-slate-800">Test Mode</p>
              <p class="text-xs text-slate-400 mt-0.5">Use the Tyro simulator instead of a real terminal. Turn off when going live.</p>
            </div>
            <button
              type="button"
              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              [class]="testMode ? 'bg-brand-600' : 'bg-slate-300'"
              (click)="testMode = !testMode"
              role="switch"
              [attr.aria-checked]="testMode"
            >
              <span
                class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200"
                [class]="testMode ? 'translate-x-5' : 'translate-x-0'"
              ></span>
            </button>
          </div>
        </div>

        <!-- TERMINAL PAIRING -->
        <div class="px-6 py-5">
          <p class="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-1">Terminal Pairing</p>
          <p class="text-xs text-slate-400 mb-4">Pair this browser with your terminal. You only need to do this once.</p>

          <button
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            (click)="pairTerminal()"
            [disabled]="tyro.loading() || !mid || !tid"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
            </svg>
            {{ tyro.loading() ? 'Pairing…' : 'Pair Terminal' }}
          </button>

          @if (tyro.status()) {
            <p class="mt-3 text-sm" [class]="pairSuccess() ? 'text-green-600' : 'text-red-500'">
              {{ tyro.status() }}
            </p>
          }
        </div>
      </div>

      <!-- Footer actions -->
      <div class="flex justify-end gap-3 mt-6">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none transition-colors"
          (click)="cancel()"
        >Cancel</button>
        <button
          type="button"
          class="px-5 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors"
          (click)="save()"
        >Save Settings</button>
      </div>
    </div>
  `
})
export class TerminalSettingsComponent {
  tyro  = inject(TyroService);
  toast = inject(ToastService);
  router = inject(Router);

  mid      = this.tyro.settings().mid;
  tid      = this.tyro.settings().tid;
  testMode = this.tyro.settings().testMode;

  pairSuccess = signal(false);

  save() {
    const settings: TyroSettings = {
      mid: this.mid.trim(),
      tid: this.tid.trim(),
      testMode: this.testMode
    };
    this.tyro.saveSettings(settings);
    this.toast.show('success', 'EFTPOS settings saved.');
  }

  cancel() {
    this.router.navigate(['/pos']);
  }

  async pairTerminal() {
    const result = await this.tyro.pairTerminal();
    this.pairSuccess.set(result.success);
    if (result.success) {
      this.toast.show('success', 'Terminal paired successfully.');
    } else {
      this.toast.show('error', result.message);
    }
  }
}

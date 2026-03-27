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
    <div class="flex flex-col px-8 pt-8 w-full max-w-2xl">

      <!-- Header -->
      <div class="pt-1 px-1 pb-6">
        <div class="pb-1 border-b border-gray-200">
          <h1 class="text-2xl font-semibold text-gray-800">EFTPOS Settings</h1>
          <p class="mt-1 text-sm text-gray-500">Configure your Tyro EFTPOS terminal connection.</p>
        </div>
      </div>

      <!-- Settings Card -->
      <div class="bg-white border border-gray-200 rounded-xl shadow-sm">

        <!-- CONNECTION -->
        <div class="p-6 space-y-5">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider">Connection</h2>

          <div>
            <label for="tyro-mid" class="block text-sm font-medium text-gray-700 mb-1">Merchant ID (MID)</label>
            <input
              type="text"
              id="tyro-mid"
              [(ngModel)]="mid"
              placeholder="e.g. 2203"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <p class="mt-1 text-xs text-gray-400">Provided by Tyro when your account was created.</p>
          </div>

          <div>
            <label for="tyro-tid" class="block text-sm font-medium text-gray-700 mb-1">Terminal ID (TID)</label>
            <input
              type="text"
              id="tyro-tid"
              [(ngModel)]="tid"
              placeholder="e.g. 1"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <p class="mt-1 text-xs text-gray-400">Found on the label on your physical terminal.</p>
          </div>
        </div>

        <div class="border-t border-gray-100"></div>

        <!-- MODE -->
        <div class="p-6">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Mode</h2>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-gray-700">Test Mode</p>
              <p class="text-xs text-gray-400 mt-0.5">Use the Tyro simulator instead of a real terminal. Turn off when going live.</p>
            </div>
            <label class="relative inline-block w-11 h-6 cursor-pointer mt-0.5">
              <input
                type="checkbox"
                class="peer sr-only"
                [(ngModel)]="testMode"
              />
              <span class="absolute inset-0 bg-gray-200 rounded-full transition-colors duration-200 ease-in-out peer-checked:bg-blue-600"></span>
              <span class="absolute top-1/2 start-0.5 -translate-y-1/2 size-5 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out peer-checked:translate-x-full"></span>
            </label>
          </div>
        </div>

        <div class="border-t border-gray-100"></div>

        <!-- TERMINAL PAIRING -->
        <div class="p-6 space-y-4">
          <div>
            <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Terminal Pairing</h2>
            <p class="text-xs text-gray-400">Pair this browser with your terminal. You only need to do this once.</p>
          </div>

          <button
            type="button"
            class="py-2.5 px-5 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            (click)="pairTerminal()"
            [disabled]="tyro.loading() || !mid || !tid"
          >
            <svg class="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
            </svg>
            {{ tyro.loading() ? 'Pairing…' : 'Pair Terminal' }}
          </button>

          @if (tyro.status()) {
            <div
              class="text-sm p-3 rounded-lg border"
              [class]="pairSuccess()
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'"
            >
              {{ tyro.status() }}
            </div>
          }
        </div>

        <!-- Footer actions -->
        <div class="flex justify-end gap-x-3 px-6 py-4 border-t border-gray-200 rounded-b-xl bg-gray-50">
          <button
            type="button"
            class="py-2 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none transition-colors"
            (click)="cancel()"
          >Cancel</button>
          <button
            type="button"
            class="py-2 px-5 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:outline-none transition-colors"
            (click)="save()"
          >Save Settings</button>
        </div>
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

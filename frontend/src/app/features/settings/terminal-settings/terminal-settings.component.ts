import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';
import { TyroService, TyroSettings } from '../../../core/services/tyro.service';

@Component({
  selector: 'app-terminal-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-full max-w-5xl px-6 py-8 lg:px-8">
      <div class="mb-6 border-b border-slate-200 pb-5">
        <h1 class="text-2xl font-semibold text-slate-900">EFTPOS Settings</h1>
        <p class="mt-1 text-sm text-slate-500">Configure your Tyro EFTPOS terminal connection.</p>
      </div>

      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <section class="space-y-5 px-6 py-6">
          <h2 class="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Connection</h2>

          <div>
            <label for="tyro-mid" class="mb-1 block text-sm font-medium text-slate-700">Merchant ID (MID)</label>
            <input
              id="tyro-mid"
              type="text"
              [(ngModel)]="mid"
              placeholder="e.g. 2203"
              class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <p class="mt-1 text-xs text-slate-400">Provided by Tyro when your account was created.</p>
          </div>

          <div>
            <label for="tyro-tid" class="mb-1 block text-sm font-medium text-slate-700">Terminal ID (TID)</label>
            <input
              id="tyro-tid"
              type="text"
              [(ngModel)]="tid"
              placeholder="e.g. 1"
              class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <p class="mt-1 text-xs text-slate-400">Found on the label on your physical terminal.</p>
          </div>
        </section>

        <div class="border-t border-slate-100"></div>

        <section class="px-6 py-6">
          <h2 class="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Mode</h2>
          <div class="space-y-5">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-sm font-medium text-slate-800">Test Mode</p>
                <p class="mt-1 text-sm text-slate-400">Use the Tyro simulator instead of a real terminal. Disable when going live.</p>
              </div>
              <button type="button" class="tyro-switch" [class.tyro-switch-on]="testMode" (click)="testMode = !testMode">
                <span class="tyro-switch-thumb" [class.tyro-switch-thumb-on]="testMode"></span>
              </button>
            </div>
          </div>
        </section>

        <div class="border-t border-slate-100"></div>

        <section class="px-6 py-6">
          <h2 class="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Integrated Receipts</h2>
          <div class="space-y-5">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-sm font-medium text-slate-800">Integrated Receipts</p>
                <p class="mt-1 text-sm text-slate-400">Include the Tyro EFTPOS customer and merchant receipts on the POS sales receipt for a single combined printout.</p>
              </div>
              <button type="button" class="tyro-switch" [class.tyro-switch-on]="integratedReceipts" (click)="integratedReceipts = !integratedReceipts">
                <span class="tyro-switch-thumb" [class.tyro-switch-thumb-on]="integratedReceipts"></span>
              </button>
            </div>

            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-sm font-medium text-slate-800">Print Tyro Merchant Copy</p>
                <p class="mt-1 text-sm text-slate-400">Print a merchant copy for non-signature transactions. Signature-verified merchant copies are always printed.</p>
              </div>
              <button type="button" class="tyro-switch" [class.tyro-switch-on]="printMerchantCopy" (click)="printMerchantCopy = !printMerchantCopy">
                <span class="tyro-switch-thumb" [class.tyro-switch-thumb-on]="printMerchantCopy"></span>
              </button>
            </div>

          </div>
        </section>

        @if (testMode) {
          <div class="border-t border-slate-100"></div>

          <section class="space-y-5 px-6 py-6">
            <div>
              <h2 class="mb-1 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Terminal Pairing</h2>
              <p class="text-sm text-slate-400">Pair this POS with your Tyro terminal. You only need to do this once.</p>
            </div>

            <div class="flex flex-wrap gap-4">
              <button type="button" class="tyro-action-button" (click)="togglePairingFrame()">
                <svg class="size-5 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                {{ showPairingFrame() ? 'Close Pairing UI' : 'Pair Tyro Terminal' }}
              </button>

              <button type="button" class="tyro-action-button" (click)="clearPairing()">
                <svg class="size-5 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 7h12m-9 0V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0v12a1 1 0 001 1h6a1 1 0 001-1V7M9 11v6m6-6v6" />
                </svg>
                Clear Pairing
              </button>
            </div>

            @if (showPairingFrame()) {
              <div id="pairing-iframe-container" class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <iframe
                  id="pairing-iframe"
                  title="Tyro Pairing UI"
                  class="block w-full bg-white"
                  style="height:500px;"
                  allow="same-origin"
                  [src]="pairingUrl()"
                ></iframe>
              </div>
            }

            @if (statusMessage()) {
              <div
                class="rounded-xl border px-4 py-3 text-sm"
                [class]="statusTone() === 'success'
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : statusTone() === 'error'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600'"
              >
                {{ statusMessage() }}
              </div>
            }
          </section>

          <div class="border-t border-slate-100"></div>

          <section class="space-y-5 px-6 py-6">
            <div>
              <h2 class="mb-1 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">iClient Logs</h2>
              <p class="text-sm text-slate-400">View Tyro iClient diagnostic logs for troubleshooting and support.</p>
            </div>

            <button type="button" class="tyro-action-button" (click)="toggleLogs()">
              <svg class="size-5 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6M7 4h7l5 5v11a1 1 0 01-1 1H7a1 1 0 01-1-1V5a1 1 0 011-1z" />
              </svg>
              {{ showLogsFrame() ? 'Hide iClient Logs' : 'Request iClient Logs' }}
            </button>

            @if (showLogsFrame()) {
              <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <iframe
                  class="block h-[680px] w-full bg-white"
                  [src]="logsUrl()"
                  title="Tyro iClient Logs"
                ></iframe>
              </div>
            }
          </section>
        }

        @if (!tyro.sdkLoaded()) {
          <div class="border-t border-slate-100 px-6 py-4">
            <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Loading Tyro SDK. If this persists, check your internet connection and refresh the page.
            </div>
          </div>
        }

        <div class="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5">
          <button type="button" class="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50" (click)="cancel()">Cancel</button>
          <button type="button" class="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700" (click)="save()">Save Settings</button>
        </div>
      </div>
    </div>
  `
})
export class TerminalSettingsComponent {
  tyro = inject(TyroService);
  toast = inject(ToastService);
  router = inject(Router);
  sanitizer = inject(DomSanitizer);

  mid = this.tyro.settings().mid;
  tid = this.tyro.settings().tid;
  testMode = this.tyro.settings().testMode;
  integratedReceipts = this.tyro.settings().integratedReceipts;
  printMerchantCopy = this.tyro.settings().printMerchantCopy;

  showPairingFrame = signal(false);
  showLogsFrame = signal(false);
  logsFrameKey = signal(Date.now());
  statusMessage = signal('');
  statusTone = signal<'info' | 'success' | 'error'>('info');

  pairingUrl = computed(() => this.toSafeUrl(this.tyro.getPairingIframeUrl()));
  logsUrl = computed(() => this.toSafeUrl(this.tyro.getLogsIframeUrl(this.logsFrameKey())));

  save() {
    const settings: TyroSettings = {
      mid: this.mid.trim(),
      tid: this.tid.trim(),
      testMode: this.testMode,
      integratedReceipts: this.integratedReceipts,
      printMerchantCopy: this.printMerchantCopy
    };

    this.tyro.saveSettings(settings);

    if (!this.testMode) {
      this.showLogsFrame.set(false);
    }

    this.setStatus('success', 'EFTPOS settings saved.');
    this.toast.show('success', 'EFTPOS settings saved.');
  }

  cancel() {
    this.router.navigate(['/pos']);
  }

  togglePairingFrame() {
    this.showPairingFrame.set(!this.showPairingFrame());
  }

  toggleLogs() {
    const next = !this.showLogsFrame();
    this.showLogsFrame.set(next);

    if (next) {
      this.logsFrameKey.set(Date.now());
      this.setStatus('info', 'Tyro iClient logs opened below.');
    } else {
      this.setStatus('info', 'Tyro iClient logs hidden.');
    }
  }

  clearPairing() {
    const result = this.tyro.clearPairingCache();
    this.setStatus(result.success ? 'success' : 'error', result.message);
    this.toast.show(result.success ? 'success' : 'error', result.message);
  }

  private setStatus(tone: 'info' | 'success' | 'error', message: string) {
    this.statusTone.set(tone);
    this.statusMessage.set(message);
  }

  private toSafeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}

import { Injectable, signal, computed } from '@angular/core';

export interface TyroSettings {
  mid: string;
  tid: string;
  testMode: boolean;
}

export type TyroTransactionResult = 'APPROVED' | 'CANCELLED' | 'DECLINED' | 'SYSTEM ERROR';

export interface TyroTransactionResponse {
  result: TyroTransactionResult;
  transactionReference?: string;
  authorisationCode?: string;
  elidedPan?: string;
  customerReceipt?: string;
  merchantReceipt?: string;
}

const STORAGE_KEY = 'tyro_settings';
const SDK_TEST_URL = 'https://iclientsimulator.test.tyro.com/iclient-with-ui-v1.js';
const SDK_PROD_URL = 'https://iclient.tyro.com/iclient-with-ui-v1.js';

@Injectable({ providedIn: 'root' })
export class TyroService {

  private _settings = signal<TyroSettings>(this.loadSettings());
  settings = this._settings.asReadonly();

  isConfigured = computed(() => !!(this._settings().mid && this._settings().tid));

  private _status    = signal<string>('');
  private _loading   = signal<boolean>(false);
  private _sdkLoaded = signal<boolean>(false);
  status    = this._status.asReadonly();
  loading   = this._loading.asReadonly();
  sdkLoaded = this._sdkLoaded.asReadonly();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private iClient: any = null;

  constructor() {
    this.observeTyroModal();
    this.loadSdk();
  }

  /** Inject CSS once to center the Tyro modal — no DOM manipulation needed */
  private observeTyroModal(): void {
    if (document.getElementById('tyro-center-style')) return;
    const style = document.createElement('style');
    style.id = 'tyro-center-style';
    style.textContent = `
      .tyro-iclient-modal {
        position: fixed !important;
        top: 0 !important; left: 0 !important;
        width: 100vw !important; height: 100vh !important;
        z-index: 10000 !important;
        background: rgba(0,0,0,0.5) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        overflow: visible !important;
        opacity: 1 !important;
        visibility: visible !important;
        padding: 0 !important;
        margin: 0 !important;
        pointer-events: auto !important;
      }
      .tyro-iclient-modal .modal-dialog {
        position: relative !important;
        top: auto !important; left: auto !important;
        transform: none !important;
        margin: 0 !important;
        width: 600px !important;
        max-width: 90vw !important;
        float: none !important;
        pointer-events: auto !important;
      }
      .tyro-iclient-modal .modal-content {
        display: block !important;
        background: #fff !important;
        border-radius: 8px !important;
        overflow: visible !important;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3) !important;
        pointer-events: auto !important;
      }
      .tyro-iclient-modal .modal-body {
        display: block !important;
        padding: 0 !important;
        overflow: visible !important;
        pointer-events: auto !important;
      }
      .tyro-iclient-modal iframe {
        display: block !important;
        visibility: visible !important;
        pointer-events: auto !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Settings ───────────────────────────────────────────────────────────────

  saveSettings(settings: TyroSettings): void {
    const modeChanged = settings.testMode !== this._settings().testMode;
    this._settings.set(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    this.iClient = null;
    if (modeChanged) {
      this._sdkLoaded.set(false);
      this.loadSdk();
    }
  }

  private loadSettings(): TyroSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as TyroSettings;
    } catch { /* ignore */ }
    return { mid: '', tid: '', testMode: true };
  }

  // ── SDK Loading ────────────────────────────────────────────────────────────

  private loadSdk(): void {
    const url = this._settings().testMode ? SDK_TEST_URL : SDK_PROD_URL;

    // If the correct SDK is already in the page (e.g. loaded via index.html), use it directly
    // rather than removing window.TYRO and reloading — a second load breaks the iframe rendering.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingTYRO = (window as any)['TYRO'];
    const alreadyLoaded = !!document.querySelector(`script[src="${url}"]`);
    if (existingTYRO?.IClientWithUI && alreadyLoaded) {
      this.iClient = null;
      this._sdkLoaded.set(true);
      return;
    }

    // Remove any previously dynamically-injected Tyro SDK script
    document.querySelectorAll('script[data-tyro-sdk]').forEach(s => s.remove());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any)['TYRO'];
    this.iClient = null;
    this._status.set('');

    const script = document.createElement('script');
    script.src = url;
    script.setAttribute('data-tyro-sdk', 'true');
    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const TYRO = (window as any)['TYRO'];
      if (TYRO?.IClientWithUI) {
        this._sdkLoaded.set(true);
      } else {
        this._sdkLoaded.set(false);
        this._status.set('Tyro SDK loaded but IClientWithUI is not available. The SDK may have changed.');
        console.error('[TyroService] SDK loaded but window.TYRO.IClientWithUI not found. window.TYRO =', TYRO);
      }
    };
    script.onerror = (err) => {
      this._sdkLoaded.set(false);
      this._status.set('Tyro iClient SDK failed to load. Check your internet connection and refresh the page.');
      console.error('[TyroService] SDK script failed to load from:', url, err);
    };
    document.head.appendChild(script);
  }

  // ── iClient init ───────────────────────────────────────────────────────────
  // Constructor takes (apiKey, posProductInfo). MID/TID are passed to pairTerminal(), not here.

  private getClient(): unknown {
    if (this.iClient) return this.iClient;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const TYRO = (window as any)['TYRO'];
    if (!TYRO?.IClientWithUI) {
      throw new Error('Tyro iClient SDK not loaded. Check your internet connection and refresh the page.');
    }

    const apiKey = this._settings().testMode ? 'Test API Key' : 'Live API Key';
    const posProductInfo = {
      posProductVendor: 'Uniform Australia',
      posProductName: 'UniformPM POS',
      posProductVersion: '1.0.0'
    };
    this.iClient = new TYRO.IClientWithUI(apiKey, posProductInfo);
    return this.iClient;
  }

  // ── Pair Terminal ──────────────────────────────────────────────────────────

  async pairTerminal(): Promise<{ success: boolean; message: string }> {
    this._loading.set(true);
    this._status.set('Pairing terminal…');

    try {
      const { mid, tid } = this._settings();
      const client = this.getClient() as {
        pairTerminal: (mid: string, tid: string, cb: (r: { status: string; message?: string }) => void) => void
      };

      return await new Promise((resolve) => {
        client.pairTerminal(mid, tid, (response) => {
          if (response.status === 'success' || response.status === 'failure') {
            const success = response.status === 'success';
            const message = response.message ?? (success ? 'Terminal paired successfully.' : 'Pairing failed.');
            this._status.set(message);
            resolve({ success, message });
          } else {
            // intermediate status update — show message but keep waiting
            if (response.message) this._status.set(response.message);
          }
        });
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Pairing error';
      this._status.set(message);
      return { success: false, message };
    } finally {
      this._loading.set(false);
    }
  }

  // ── Purchase ───────────────────────────────────────────────────────────────

  private waitForTyroModalClose(): Promise<void> {
    return new Promise((resolve) => {
      const modal = document.querySelector('.tyro-iclient-modal');
      if (!modal) { resolve(); return; }
      const observer = new MutationObserver(() => {
        if (!document.querySelector('.tyro-iclient-modal')) {
          observer.disconnect();
          resolve();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      // Safety fallback: resolve after 60s in case SDK never removes the modal
      setTimeout(() => { observer.disconnect(); resolve(); }, 60000);
    });
  }

  async purchase(amountDollars: number): Promise<TyroTransactionResponse> {
    this._loading.set(true);
    this._status.set('Initiating payment…');

    try {
      const client = this.getClient() as {
        initiatePurchase: (
          opts: { amount: string; cashout: string; integratedReceipt: boolean },
          callbacks: {
            receiptCallback: (r: unknown) => void;
            transactionCompleteCallback: (r: TyroTransactionResponse) => void;
          }
        ) => void
      };

      const amountCents = Math.round(amountDollars * 100);

      return await new Promise((resolve) => {
        client.initiatePurchase(
          { amount: String(amountCents), cashout: '0', integratedReceipt: false },
          {
            receiptCallback: (_r) => { /* receipt handled separately */ },
            transactionCompleteCallback: (response) => {
              this._status.set(`Transaction: ${response.result}`);
              this._loading.set(false);
              // Wait for Tyro's modal to be fully removed from the DOM before
              // resolving — prevents Sale Complete from appearing while the
              // bootbox receipt/confirmation dialog is still visible.
              this.waitForTyroModalClose().then(() => resolve(response));
            }
          }
        );

      });
    } catch (err) {
      this._loading.set(false);
      console.error('[TyroService] purchase() error:', err);
      const message = err instanceof Error ? err.message : 'Transaction error';
      this._status.set(message);
      return { result: 'SYSTEM ERROR' };
    }
  }
}

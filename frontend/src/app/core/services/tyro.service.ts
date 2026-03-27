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
const ICLIENT_PROD_URL = 'https://iclient.tyro.com/iclient-integrator.js';
const ICLIENT_SIM_URL  = 'https://iclientsimulator.test.tyro.com/iclient-integrator.js';

@Injectable({ providedIn: 'root' })
export class TyroService {

  private _settings = signal<TyroSettings>(this.loadSettings());
  settings = this._settings.asReadonly();

  isConfigured = computed(() => !!(this._settings().mid && this._settings().tid));

  private _status   = signal<string>('');
  private _loading  = signal<boolean>(false);
  status  = this._status.asReadonly();
  loading = this._loading.asReadonly();

  // Reference to the loaded iClient instance (any — Tyro doesn't ship TS types)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private iClient: any = null;

  // ── Settings ───────────────────────────────────────────────────────────────

  saveSettings(settings: TyroSettings): void {
    const modeChanged = settings.testMode !== this._settings().testMode;
    this._settings.set(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    this.iClient = null;
    if (modeChanged) this.sdkLoaded = false; // force SDK reload when switching modes
  }

  private loadSettings(): TyroSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as TyroSettings;
    } catch { /* ignore */ }
    return { mid: '', tid: '', testMode: true };
  }

  // ── SDK loading ────────────────────────────────────────────────────────────

  private sdkLoaded = false;

  private loadSdk(): Promise<void> {
    if (this.sdkLoaded) return Promise.resolve();

    const url = this._settings().testMode ? ICLIENT_SIM_URL : ICLIENT_PROD_URL;

    return new Promise((resolve, reject) => {
      // Remove existing Tyro script if mode changed
      const existing = document.querySelector('script[data-tyro]');
      if (existing) existing.remove();

      const script = document.createElement('script');
      script.src = url;
      script.setAttribute('data-tyro', 'true');
      script.onload = () => { this.sdkLoaded = true; resolve(); };
      script.onerror = () => reject(new Error('Failed to load Tyro iClient SDK'));
      document.head.appendChild(script);
    });
  }

  // ── iClient init ───────────────────────────────────────────────────────────

  private async getClient(): Promise<unknown> {
    if (this.iClient) return this.iClient;

    await this.loadSdk();
    const { mid, tid } = this._settings();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const TYRO = (window as any)['TYRO'];
    if (!TYRO) throw new Error('Tyro iClient SDK not available');
    this.iClient = new TYRO.iClient(mid, tid);
    return this.iClient;
  }

  // ── Pair Terminal ──────────────────────────────────────────────────────────

  async pairTerminal(): Promise<{ success: boolean; message: string }> {
    this._loading.set(true);
    this._status.set('Pairing terminal…');

    try {
      const client = await this.getClient() as {
        pairTerminal: (cb: (r: { status: string; message?: string }) => void) => void
      };

      return await new Promise((resolve) => {
        client.pairTerminal((response) => {
          const success = response.status === 'success';
          const message = response.message ?? (success ? 'Terminal paired successfully.' : 'Pairing failed.');
          this._status.set(message);
          resolve({ success, message });
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

  async purchase(amountDollars: number): Promise<TyroTransactionResponse> {
    this._loading.set(true);
    this._status.set('Initiating payment…');

    try {
      const client = await this.getClient() as {
        initiatePurchase: (
          opts: { amount: number; cashout: number; integratedReceipt: boolean },
          callbacks: {
            statusMessageCallback: (msg: string) => void;
            questionCallback: (q: unknown, answer: (r: boolean) => void) => void;
            receiptCallback: (r: unknown) => void;
            transactionCompleteCallback: (r: TyroTransactionResponse) => void;
          }
        ) => void
      };

      const amountCents = Math.round(amountDollars * 100);

      return await new Promise((resolve) => {
        client.initiatePurchase(
          { amount: amountCents, cashout: 0, integratedReceipt: true },
          {
            statusMessageCallback: (msg) => this._status.set(msg),
            questionCallback: (_q, answer) => answer(true),
            receiptCallback: (_r) => { /* receipt printed separately */ },
            transactionCompleteCallback: (response) => {
              this._status.set(`Transaction: ${response.result}`);
              this._loading.set(false);
              resolve(response);
            }
          }
        );
      });
    } catch (err) {
      this._loading.set(false);
      const message = err instanceof Error ? err.message : 'Transaction error';
      this._status.set(message);
      return { result: 'SYSTEM ERROR' };
    }
  }
}

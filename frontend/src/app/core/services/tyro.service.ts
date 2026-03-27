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

@Injectable({ providedIn: 'root' })
export class TyroService {

  private _settings = signal<TyroSettings>(this.loadSettings());
  settings = this._settings.asReadonly();

  isConfigured = computed(() => !!(this._settings().mid && this._settings().tid));

  private _status  = signal<string>('');
  private _loading = signal<boolean>(false);
  status  = this._status.asReadonly();
  loading = this._loading.asReadonly();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private iClient: any = null;

  // ── Settings ───────────────────────────────────────────────────────────────

  saveSettings(settings: TyroSettings): void {
    this._settings.set(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    this.iClient = null; // force re-init on next use
  }

  private loadSettings(): TyroSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as TyroSettings;
    } catch { /* ignore */ }
    return { mid: '', tid: '', testMode: true };
  }

  // ── iClient init ───────────────────────────────────────────────────────────
  // SDK is loaded via <script> in index.html — no dynamic loading needed.

  private getClient(): unknown {
    if (this.iClient) return this.iClient;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const TYRO = (window as any)['TYRO'];
    if (!TYRO) throw new Error('Tyro iClient SDK not loaded. Check your internet connection and refresh the page.');

    const { mid, tid } = this._settings();
    this.iClient = new TYRO.iClient(mid, tid);
    return this.iClient;
  }

  // ── Pair Terminal ──────────────────────────────────────────────────────────

  async pairTerminal(): Promise<{ success: boolean; message: string }> {
    this._loading.set(true);
    this._status.set('Pairing terminal…');

    try {
      const client = this.getClient() as {
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
      const client = this.getClient() as {
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
            receiptCallback: (_r) => { /* receipt handled separately */ },
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

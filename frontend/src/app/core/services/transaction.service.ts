import { Injectable, signal } from '@angular/core';
import { Transaction } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly STORAGE_KEY = 'pm_transactions';
  private readonly COUNTER_KEY = 'pm_txn_counter';

  private _transactions = signal<Transaction[]>(this.loadFromStorage());

  transactions = this._transactions.asReadonly();

  recordTransaction(data: Omit<Transaction, 'id'>): Transaction {
    const id  = this.nextId();
    const txn: Transaction = { ...data, id };
    this._transactions.update(list => [txn, ...list]);
    this.persist();
    return txn;
  }

  getById(id: string): Transaction | undefined {
    return this._transactions().find(t => t.id === id);
  }

  search(query: string, customer: string, status: string): Transaction[] {
    return this._transactions().filter(t => {
      const matchId       = !query    || t.id.toLowerCase().includes(query.toLowerCase());
      const matchCustomer = !customer || t.customerName.toLowerCase().includes(customer.toLowerCase())
                                      || (t.companyName?.toLowerCase().includes(customer.toLowerCase()) ?? false);
      const matchStatus   = !status   || t.status === status;
      return matchId && matchCustomer && matchStatus;
    });
  }

  private nextId(): string {
    const n = parseInt(localStorage.getItem(this.COUNTER_KEY) ?? '0', 10) + 1;
    localStorage.setItem(this.COUNTER_KEY, String(n));
    return `TXN-${String(n).padStart(3, '0')}`;
  }

  private loadFromStorage(): Transaction[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as any[];
      return parsed.map(t => ({ ...t, date: new Date(t.date) }));
    } catch {
      return [];
    }
  }

  private persist(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._transactions()));
  }
}

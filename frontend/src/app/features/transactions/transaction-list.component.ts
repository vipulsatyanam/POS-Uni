import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { TransactionService } from '../../core/services/transaction.service';
import { CustomerService } from '../../core/services/customer.service';
import { CartService } from '../../core/services/cart.service';
import { Transaction, TransactionItem, CartItem } from '../../core/models/product.model';

interface ReturnQty { [sku: string]: number; }

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="max-w-7xl mx-auto space-y-4">

      <!-- Page header -->
      <div class="flex flex-wrap items-center gap-2 sm:gap-3">
        <h1 class="text-2xl font-bold text-slate-900 flex-1">Transaction List</h1>
      </div>

      <!-- Filters row -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div class="flex flex-wrap items-center gap-3">

          <!-- Search by Transaction ID -->
          <div class="relative flex-1 min-w-[180px] max-w-xs">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
            </svg>
            <input
              [formControl]="idSearch"
              type="text"
              placeholder="Transaction ID"
              class="field-input pl-9 !py-2"
            />
          </div>

          <!-- Customer search -->
          <div class="relative flex-1 min-w-[180px] max-w-xs">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none"
                 fill="currentColor" viewBox="0 0 24 24">
              <path fill-rule="evenodd" d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2 9a4 4 0 0 0-4 4v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1a4 4 0 0 0-4-4h-4Z" clip-rule="evenodd"/>
            </svg>
            <input
              [formControl]="customerSearch"
              type="text"
              placeholder="Customer"
              class="field-input pl-9 !py-2"
            />
          </div>

          <!-- Status filter -->
          <div class="relative min-w-[160px]">
            <select
              class="field-input !py-2 pr-8 appearance-none w-full"
              [value]="statusFilter()"
              (change)="statusFilter.set($any($event.target).value)"
            >
              <option value="">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Refunded">Refunded</option>
              <option value="Partial Refund">Partial Refund</option>
              <option value="Pending">Pending</option>
            </select>
            <svg class="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </div>

        </div>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Customer Name</th>
                <th>Company Name</th>
                <th>Sold By</th>
                <th>Sale Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @if (filtered().length === 0) {
                <tr>
                  <td colspan="7" class="text-center py-16 text-slate-400">
                    <svg class="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <p class="font-medium text-slate-600">No transactions found</p>
                  </td>
                </tr>
              }
              @for (txn of filtered(); track txn.id) {
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="font-mono text-sm font-medium text-slate-700">{{ txn.id }}</td>
                  <td class="font-semibold text-slate-800">{{ txn.customerName }}</td>
                  <td class="text-slate-600">{{ txn.companyName || '—' }}</td>
                  <td class="text-slate-600">{{ txn.soldBy }}</td>
                  <td class="font-semibold text-slate-800">{{ txn.total | currency }}</td>
                  <td>
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                          [ngClass]="statusClass(txn.status)">
                      <span class="w-1.5 h-1.5 rounded-full" [ngClass]="statusDotClass(txn.status)"></span>
                      {{ txn.status }}
                    </span>
                  </td>
                  <td>
                    <button
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-brand-600 hover:bg-brand-50 transition-colors border border-brand-200"
                      (click)="openDetails(txn)"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                      View
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- ══════════════════════════════════════════════════
         MODAL 1: Transaction Details
    ══════════════════════════════════════════════════ -->
    @if (detailsTxn()) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
           (click)="closeDetails()">
        <div class="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
             (click)="$event.stopPropagation()">

          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 class="text-xl font-bold text-slate-900">Transaction Details</h2>
            <button class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    (click)="closeDetails()">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Info grid -->
          <div class="px-6 py-5 grid grid-cols-2 gap-x-8 gap-y-4 border-b border-slate-100">
            <div>
              <p class="text-xs text-slate-400 mb-0.5">Transaction ID</p>
              <p class="font-semibold text-slate-900 font-mono">{{ detailsTxn()!.id }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-0.5">Date &amp; Time</p>
              <p class="font-semibold text-slate-900">{{ detailsTxn()!.date | date:'MMM d, yyyy h:mm a' }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-0.5">Customer</p>
              <p class="font-semibold text-slate-900">{{ detailsTxn()!.customerName }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-0.5">Sold By</p>
              <p class="font-semibold text-slate-900">{{ detailsTxn()!.soldBy }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-0.5">Payment Method</p>
              <p class="font-semibold text-slate-900">{{ detailsTxn()!.paymentMethod }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-0.5">Total</p>
              <p class="text-xl font-bold text-brand-600">{{ detailsTxn()!.total | currency }}</p>
            </div>
          </div>

          <!-- Items -->
          <div class="px-6 py-4 border-b border-slate-100">
            <p class="text-sm font-semibold text-slate-700 mb-3">Items</p>
            <div class="space-y-3">
              @for (item of detailsTxn()!.items; track item.sku) {
                <div class="bg-slate-50 rounded-lg px-4 py-3">
                  <div class="flex justify-between items-start">
                    <div>
                      <p class="font-semibold text-slate-800">{{ item.productName }}</p>
                      <p class="text-xs text-slate-500 mt-0.5">({{ item.sku }})</p>
                      <p class="text-sm text-slate-500 mt-1">
                        @if (item.size) { Size: {{ item.size }} }
                        @if (item.size && item.color) { | }
                        @if (item.color) { {{ item.color }} }
                      </p>
                      <p class="text-sm text-slate-500">{{ item.quantity }} × {{ item.unitPrice | currency }}</p>
                    </div>
                    <span class="font-semibold text-slate-800">{{ item.lineTotal | currency }}</span>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Footer actions -->
          <div class="px-6 py-4 flex items-center gap-3">
            <button
              class="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors"
              (click)="openReturn()"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
              </svg>
              Return
            </button>
            <button
              class="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
              (click)="emailReceipt()"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              Email Receipt
            </button>
            <button
              class="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
              (click)="printReceipt()"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
              </svg>
              Print Receipt
            </button>
            <div class="flex-1"></div>
            <button
              class="px-5 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
              (click)="closeDetails()"
            >Close</button>
          </div>
        </div>
      </div>
    }

    <!-- ══════════════════════════════════════════════════
         MODAL 2: Create Return
    ══════════════════════════════════════════════════ -->
    @if (showReturn()) {
      <div class="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
           (click)="closeReturn()">
        <div class="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
             (click)="$event.stopPropagation()">

          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <h2 class="text-xl font-bold text-slate-900">Create New Return</h2>
            <button class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    (click)="closeReturn()">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Transaction info -->
          <div class="px-6 py-4 grid grid-cols-2 gap-x-8 gap-y-3 border-b border-slate-100 shrink-0">
            <div>
              <p class="text-xs text-slate-400 mb-0.5">Transaction ID</p>
              <p class="font-semibold text-slate-900 font-mono">{{ detailsTxn()!.id }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-0.5">Date &amp; Time</p>
              <p class="font-semibold text-slate-900">{{ detailsTxn()!.date | date:'MMM d, yyyy h:mm a' }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-0.5">Customer</p>
              <p class="font-semibold text-slate-900">{{ detailsTxn()!.customerName }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-0.5">Sold By</p>
              <p class="font-semibold text-slate-900">{{ detailsTxn()!.soldBy }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-0.5">Payment Method</p>
              <p class="font-semibold text-slate-900">{{ detailsTxn()!.paymentMethod }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-0.5">Total</p>
              <p class="text-xl font-bold text-brand-600">{{ detailsTxn()!.total | currency }}</p>
            </div>
          </div>

          <!-- Select items to return -->
          <div class="px-6 py-4 flex-1 overflow-y-auto">
            <p class="text-sm font-semibold text-slate-700 mb-3">Select Items to Return</p>

            @if (returnError()) {
              <div class="mb-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {{ returnError() }}
              </div>
            }

            <div class="space-y-3">
              @for (item of detailsTxn()!.items; track item.sku) {
                <div class="border border-slate-200 rounded-lg px-4 py-3">
                  <div class="flex items-center justify-between gap-4">
                    <div class="flex-1 min-w-0">
                      <p class="font-semibold text-slate-800">{{ item.productName }}</p>
                      <p class="text-xs text-slate-400 mt-0.5">SKU: {{ item.sku }}@if (item.size) { | Size: {{ item.size }}}@if (item.color) { | Color: {{ item.color }}}</p>
                      <p class="text-sm text-slate-500 mt-0.5">Qty: {{ item.quantity }} × {{ item.unitPrice | currency }}</p>
                    </div>
                    <div class="flex items-center gap-3 shrink-0">
                      <div class="flex items-center gap-2">
                        <label class="text-sm text-slate-500 whitespace-nowrap">Return Qty:</label>
                        <input
                          type="number"
                          min="0"
                          [max]="item.quantity"
                          step="1"
                          class="w-16 px-2 py-1.5 text-center border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                          [value]="getReturnQty(item.sku)"
                          (change)="setReturnQty(item.sku, item.quantity, $any($event.target).value)"
                        />
                        <span class="text-sm text-slate-400">/ {{ item.quantity }}</span>
                      </div>
                      <span class="font-semibold text-slate-700 w-20 text-right">{{ item.lineTotal | currency }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-slate-100 flex items-center gap-3 shrink-0">
            <button
              class="px-5 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
              (click)="closeReturn()"
            >Back</button>
            <div class="flex-1"></div>
            <button
              class="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              [disabled]="returnTotal() <= 0"
              (click)="processReturn()"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Process Return
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ══════════════════════════════════════════════════
         MODAL 3: Return Items Loaded
    ══════════════════════════════════════════════════ -->
    @if (showReturnLoaded()) {
      <div class="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
        <div class="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">

          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 class="text-xl font-bold text-slate-900">Return Items Loaded</h2>
          </div>

          <!-- Transaction tag -->
          <div class="px-6 pt-4 pb-2">
            <div class="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <svg class="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
              </svg>
              <div>
                <p class="text-sm font-semibold text-red-700">Transaction Return</p>
                <p class="text-sm text-red-600">Transaction ID: <span class="font-bold font-mono">{{ detailsTxn()!.id }}</span></p>
              </div>
            </div>
          </div>

          <!-- Items summary -->
          <div class="px-6 py-3">
            <p class="text-sm font-semibold text-slate-600 mb-3">Items Added as Credits:</p>
            <div class="space-y-2">
              @for (item of returnedItems(); track item.sku) {
                <div class="flex justify-between items-start py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p class="font-semibold text-slate-800">{{ item.productName }}</p>
                    <p class="text-xs text-slate-400">{{ item.sku }}@if (item.size) { · {{ item.size }}}@if (item.color) { · {{ item.color }}}</p>
                    <p class="text-sm text-slate-500">Qty: {{ item.quantity }}</p>
                  </div>
                  <span class="font-semibold text-red-600">-{{ item.lineTotal | currency }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Total -->
          <div class="px-6 py-3 border-t border-slate-100">
            <div class="flex justify-between items-center">
              <span class="font-bold text-slate-800">Total Credit:</span>
              <span class="text-xl font-bold text-red-600">-{{ returnTotal() | currency }}</span>
            </div>
          </div>

          <!-- Continue button -->
          <div class="px-6 py-4">
            <button
              class="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-base transition-colors"
              (click)="continueToCart()"
            >Continue</button>
          </div>
        </div>
      </div>
    }
  `
})
export class TransactionListComponent implements OnInit, OnDestroy {
  private txnSvc      = inject(TransactionService);
  private cartSvc     = inject(CartService);
  private customerSvc = inject(CustomerService);
  private router      = inject(Router);
  private destroy$    = new Subject<void>();

  idSearch       = new FormControl('');
  customerSearch = new FormControl('');
  statusFilter   = signal('');

  private idQuery       = signal('');
  private customerQuery = signal('');

  detailsTxn      = signal<Transaction | null>(null);
  showReturn      = signal(false);
  showReturnLoaded = signal(false);
  returnQtys      = signal<ReturnQty>({});
  returnError     = signal('');

  returnedItems = signal<(TransactionItem & { lineTotal: number })[]>([]);

  filtered = computed(() =>
    this.txnSvc.search(this.idQuery(), this.customerQuery(), this.statusFilter())
  );

  returnTotal = computed(() =>
    this.returnedItems().reduce((s, i) => s + i.lineTotal, 0)
  );

  ngOnInit(): void {
    this.idSearch.valueChanges.pipe(
      debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$)
    ).subscribe(v => this.idQuery.set(v ?? ''));

    this.customerSearch.valueChanges.pipe(
      debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$)
    ).subscribe(v => this.customerQuery.set(v ?? ''));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openDetails(txn: Transaction): void {
    this.detailsTxn.set(txn);
    this.showReturn.set(false);
    this.showReturnLoaded.set(false);
    this.returnQtys.set({});
    this.returnError.set('');
  }

  closeDetails(): void {
    this.detailsTxn.set(null);
    this.showReturn.set(false);
    this.showReturnLoaded.set(false);
  }

  openReturn(): void {
    this.returnQtys.set({});
    this.returnError.set('');
    this.showReturn.set(true);
  }

  closeReturn(): void {
    this.showReturn.set(false);
  }

  getReturnQty(sku: string): number {
    return this.returnQtys()[sku] ?? 0;
  }

  setReturnQty(sku: string, max: number, rawValue: string): void {
    let qty = parseInt(rawValue, 10) || 0;
    if (qty < 0) qty = 0;
    if (qty > max) qty = max;
    this.returnQtys.update(prev => ({ ...prev, [sku]: qty }));
    this.returnError.set('');
  }

  processReturn(): void {
    const txn = this.detailsTxn();
    if (!txn) return;

    const selected = txn.items.filter(item => (this.returnQtys()[item.sku] ?? 0) > 0);
    if (selected.length === 0) {
      this.returnError.set('Please enter a return quantity for at least one item.');
      return;
    }

    const itemsWithTotal = selected.map(item => {
      const qty = this.returnQtys()[item.sku];
      return { ...item, quantity: qty, lineTotal: +(item.unitPrice * qty).toFixed(2) };
    });

    this.returnedItems.set(itemsWithTotal);
    this.showReturn.set(false);
    this.showReturnLoaded.set(true);
  }

  continueToCart(): void {
    const txn = this.detailsTxn();
    if (!txn) return;

    const cartItems: CartItem[] = this.returnedItems().map((item, idx) => ({
      id: `return-${txn.id}-${idx}`,
      productId: -(idx + 1),
      productName: item.productName,
      productSku: item.sku,
      productPrice: item.unitPrice,
      variant: {
        id: -(idx + 1),
        sku: item.sku,
        size: item.size,
        color: item.color,
        stock: 0,
        priceAdjustment: 0
      },
      quantity: -item.quantity,
      isReturn: true
    }));

    this.cartSvc.loadReturnItems(cartItems, txn.id);

    // auto-select the matching customer from the transaction
    const matched = this.customerSvc.customers().find(c =>
      c.contactName === txn.customerName || c.companyName === txn.companyName
    );
    if (matched) this.cartSvc.selectCustomer(matched);

    this.closeDetails();
    this.router.navigate(['/pos']);
  }

  emailReceipt(): void { /* stub */ }
  printReceipt(): void  { /* stub */ }

  statusClass(status: string): string {
    switch (status) {
      case 'Completed':      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'Refunded':       return 'bg-red-50 text-red-700 border border-red-200';
      case 'Partial Refund': return 'bg-orange-50 text-orange-700 border border-orange-200';
      case 'Pending':        return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      default:               return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  }

  statusDotClass(status: string): string {
    switch (status) {
      case 'Completed':      return 'bg-emerald-500';
      case 'Refunded':       return 'bg-red-500';
      case 'Partial Refund': return 'bg-orange-500';
      case 'Pending':        return 'bg-yellow-500';
      default:               return 'bg-slate-400';
    }
  }
}

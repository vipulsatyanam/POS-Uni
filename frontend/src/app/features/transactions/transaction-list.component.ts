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
type SortField = 'id' | 'customerName' | 'companyName' | 'soldBy' | 'total';
type SortDir   = 'asc' | 'desc';

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="flex flex-col h-full">

      <!-- Page heading -->
      <div class="mb-5">
        <h1 class="text-2xl font-bold text-slate-900">Transaction List</h1>
      </div>

      <!-- Filters — 3 separate full-width inputs -->
      <div class="flex items-center gap-3 mb-4">

        <!-- Transaction ID search -->
        <div class="relative flex-1">
          <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
          </svg>
          <input
            [formControl]="idSearch"
            type="text"
            placeholder="Transaction ID"
            class="w-full h-11 pl-9 pr-4 text-sm text-slate-700 placeholder-slate-400 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 transition-colors"
          />
        </div>

        <!-- Customer search -->
        <div class="relative flex-1">
          <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          <input
            [formControl]="customerSearch"
            type="text"
            placeholder="Customer"
            class="w-full h-11 pl-9 pr-4 text-sm text-slate-700 placeholder-slate-400 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 transition-colors"
          />
        </div>

        <!-- Status dropdown -->
        <div class="relative flex-1">
          <select
            class="w-full h-11 pl-4 pr-9 text-sm bg-white border border-slate-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 transition-colors"
            [class.text-slate-400]="!statusFilter()"
            [class.text-slate-700]="statusFilter()"
            [value]="statusFilter()"
            (change)="statusFilter.set($any($event.target).value)"
          >
            <option value="">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="Refunded">Refunded</option>
            <option value="Partial Refund">Partial Refund</option>
            <option value="Pending">Pending</option>
          </select>
          <svg class="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>

      </div>

      <!-- Table card -->
      <div class="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div class="overflow-x-auto flex-1">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-200">
                <th class="txn-th cursor-pointer select-none group" (click)="sortBy('id')">
                  <div class="flex items-center gap-1.5">
                    Transaction ID
                    <ng-container *ngTemplateOutlet="arrows; context: { field: 'id' }"></ng-container>
                  </div>
                </th>
                <th class="txn-th cursor-pointer select-none" (click)="sortBy('customerName')">
                  <div class="flex items-center gap-1.5">
                    Customer Name
                    <ng-container *ngTemplateOutlet="arrows; context: { field: 'customerName' }"></ng-container>
                  </div>
                </th>
                <th class="txn-th cursor-pointer select-none" (click)="sortBy('companyName')">
                  <div class="flex items-center gap-1.5">
                    Company Name
                    <ng-container *ngTemplateOutlet="arrows; context: { field: 'companyName' }"></ng-container>
                  </div>
                </th>
                <th class="txn-th cursor-pointer select-none" (click)="sortBy('soldBy')">
                  <div class="flex items-center gap-1.5">
                    Sold By
                    <ng-container *ngTemplateOutlet="arrows; context: { field: 'soldBy' }"></ng-container>
                  </div>
                </th>
                <th class="txn-th cursor-pointer select-none" (click)="sortBy('total')">
                  <div class="flex items-center gap-1.5">
                    Sale Total
                    <ng-container *ngTemplateOutlet="arrows; context: { field: 'total' }"></ng-container>
                  </div>
                </th>
                <th class="txn-th">Status</th>
                <th class="txn-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              @if (sorted().length === 0) {
                <tr>
                  <td colspan="7" class="text-center py-20">
                    <svg class="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <p class="text-sm font-medium text-slate-500">No transactions found</p>
                    <p class="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              }
              @for (txn of sorted(); track txn.id) {
                <tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors duration-100">
                  <td class="txn-td font-mono text-slate-700">{{ txn.id }}</td>
                  <td class="txn-td font-semibold text-slate-900">{{ txn.customerName }}</td>
                  <td class="txn-td text-slate-500">{{ txn.companyName || '—' }}</td>
                  <td class="txn-td text-slate-500">{{ txn.soldBy }}</td>
                  <td class="txn-td font-bold text-slate-900">{{ txn.total | currency }}</td>
                  <td class="txn-td">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                          [ngClass]="statusClass(txn.status)">
                      <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" [ngClass]="statusDotClass(txn.status)"></span>
                      {{ txn.status }}
                    </span>
                  </td>
                  <td class="txn-td">
                    <button
                      class="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
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

    <!-- Sort arrows template -->
    <ng-template #arrows let-field="field">
      @if (sortField() === field && sortDir() === 'asc') {
        <svg class="w-3.5 h-3.5 text-brand-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/>
        </svg>
      } @else if (sortField() === field && sortDir() === 'desc') {
        <svg class="w-3.5 h-3.5 text-brand-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
        </svg>
      } @else {
        <svg class="w-3.5 h-3.5 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4M16 15l-4 4-4-4"/>
        </svg>
      }
    </ng-template>

    <!-- ══════════════════════════════════════════════════
         MODAL 1: Transaction Details
    ══════════════════════════════════════════════════ -->
    @if (detailsTxn() && !showReturn() && !showReturnLoaded()) {
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
           (click)="closeDetails()">
        <div class="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col"
             style="max-height: min(85vh, 720px)"
             (click)="$event.stopPropagation()">

          <!-- Header -->
          <div class="flex items-center justify-between px-8 py-5 border-b border-slate-200 shrink-0">
            <h2 class="text-lg font-semibold text-slate-900">Transaction Details</h2>
            <button
              class="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              (click)="closeDetails()"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Info grid: 3 rows × 2 cols -->
          <div class="px-8 py-6 grid grid-cols-2 gap-x-16 gap-y-5 shrink-0">
            <div>
              <p class="text-xs text-slate-400 mb-1">Transaction ID</p>
              <p class="text-sm font-semibold text-slate-900">{{ detailsTxn()!.id }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-1">Date &amp; Time</p>
              <p class="text-sm font-semibold text-slate-900">{{ detailsTxn()!.date | date:'MMM d, yyyy h:mm a' }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-1">Customer</p>
              <p class="text-sm font-semibold text-slate-900">{{ detailsTxn()!.customerName }}</p>
              @if (detailsTxn()!.companyName) {
                <p class="text-xs text-slate-500 mt-0.5">{{ detailsTxn()!.companyName }}</p>
              }
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-1">Sold By</p>
              <p class="text-sm font-semibold text-slate-900">{{ detailsTxn()!.soldBy }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-1">Payment Method</p>
              <p class="text-sm font-semibold text-slate-900">{{ detailsTxn()!.paymentMethod }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-1">Total</p>
              <p class="text-sm font-bold text-brand-600">{{ detailsTxn()!.total | currency }}</p>
            </div>
          </div>

          <!-- Divider -->
          <hr class="border-slate-200 shrink-0"/>

          <!-- Items -->
          <div class="px-8 pt-5 pb-2 flex-1 overflow-y-auto">
            <p class="text-sm font-semibold text-slate-900 mb-4">Items</p>
            <div>
              @for (item of detailsTxn()!.items; track item.sku; let last = $last) {
                <div class="flex items-start justify-between py-4" [class.border-b]="!last" [class.border-slate-100]="!last">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-slate-900 leading-snug">{{ item.productName }}</p>
                    <p class="text-sm font-semibold text-slate-900 mt-0.5">({{ item.sku }})</p>
                    @if (item.size || item.color) {
                      <p class="text-xs text-slate-400 mt-1">
                        @if (item.size && item.color) { Size: {{ item.size }} | {{ item.color }}
                        } @else if (item.size) { Size: {{ item.size }}
                        } @else { {{ item.color }} }
                      </p>
                    }
                    <p class="text-xs text-slate-400 mt-0.5">{{ item.quantity }} × {{ item.unitPrice | currency }}</p>
                  </div>
                  <p class="text-sm font-bold text-slate-900 ml-8 shrink-0">{{ item.lineTotal | currency }}</p>
                </div>
              }
            </div>
          </div>

          <!-- Footer actions -->
          <div class="flex items-center gap-2.5 px-8 py-4 border-t border-slate-200 shrink-0">
            <button
              class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              [disabled]="detailsTxn()?.status === 'Refunded'"
              [title]="detailsTxn()?.status === 'Refunded' ? 'This transaction has already been refunded' : ''"
              (click)="openReturn()"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
              </svg>
              Return
            </button>
            <button
              class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
              (click)="emailReceipt()"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              Email Receipt
            </button>
            <button
              class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
              (click)="printReceipt()"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
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
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div class="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col"
             style="max-height: min(85vh, 720px)">

          <!-- Header -->
          <div class="flex items-center justify-between px-8 py-5 border-b border-slate-200 shrink-0">
            <h2 class="text-lg font-semibold text-slate-900">Create New Return</h2>
            <button
              class="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
              (click)="closeReturn()"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Info grid -->
          <div class="px-8 py-6 grid grid-cols-2 gap-x-16 gap-y-5 shrink-0">
            <div>
              <p class="text-xs text-slate-400 mb-1">Transaction ID</p>
              <p class="text-sm font-semibold text-slate-900">{{ detailsTxn()!.id }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-1">Date &amp; Time</p>
              <p class="text-sm font-semibold text-slate-900">{{ detailsTxn()!.date | date:'MMM d, yyyy h:mm a' }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-1">Customer</p>
              <p class="text-sm font-semibold text-slate-900">{{ detailsTxn()!.customerName }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-1">Sold By</p>
              <p class="text-sm font-semibold text-slate-900">{{ detailsTxn()!.soldBy }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-1">Payment Method</p>
              <p class="text-sm font-semibold text-slate-900">{{ detailsTxn()!.paymentMethod }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-1">Total</p>
              <p class="text-sm font-bold text-brand-600">{{ detailsTxn()!.total | currency }}</p>
            </div>
          </div>

          <!-- Divider -->
          <hr class="border-slate-200 shrink-0"/>

          <!-- Items to return -->
          <div class="px-8 pt-5 pb-2 flex-1 overflow-y-auto">
            <p class="text-sm font-semibold text-slate-900 mb-4">Select Items to Return</p>

            @if (returnError()) {
              <div class="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {{ returnError() }}
              </div>
            }

            <div class="space-y-3">
              @for (item of detailsTxn()!.items; track item.sku) {
                <div class="border border-slate-200 rounded-xl px-5 py-4">
                  <div class="flex items-center gap-4">
                    <!-- Left: product info -->
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-semibold text-slate-900">{{ item.productName }}</p>
                      <p class="text-xs text-slate-400 mt-1">
                        SKU: {{ item.sku }}@if (item.size) { | Size: {{ item.size }}}@if (item.color) { | Color: {{ item.color }}}
                      </p>
                      <p class="text-xs text-slate-400 mt-0.5">Qty: {{ item.quantity }} × {{ item.unitPrice | currency }}</p>
                    </div>
                    <!-- Right: label + stepper + max + price -->
                    <div class="flex items-center gap-2 shrink-0">
                      <span class="text-xs text-slate-500">Return Qty:</span>
                      <div class="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                        <button type="button"
                          class="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 border-r border-slate-200 font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          [disabled]="getReturnQty(item.sku) === 0"
                          (click)="decrementQty(item.sku)">−</button>
                        <span class="w-8 text-center text-sm font-semibold text-slate-800 select-none">{{ getReturnQty(item.sku) }}</span>
                        <button type="button"
                          class="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 border-l border-slate-200 font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          [disabled]="getReturnQty(item.sku) >= item.quantity"
                          (click)="incrementQty(item.sku, item.quantity)">+</button>
                      </div>
                      <span class="text-xs text-slate-400">/ {{ item.quantity }}</span>
                      <span class="text-sm font-bold text-slate-900 w-14 text-right">{{ item.lineTotal | currency }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between px-8 py-4 border-t border-slate-200 shrink-0">
            <button
              class="px-5 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
              (click)="closeReturn()"
            >Back</button>
            <button
              class="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              [disabled]="!hasReturnQty()"
              (click)="processReturn()"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
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
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
        <div class="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col"
             style="max-height: min(75vh, 600px)">

          <!-- Header -->
          <div class="flex items-center justify-between px-7 py-5 border-b border-slate-200 shrink-0">
            <h2 class="text-lg font-semibold text-slate-900">Return Items Loaded</h2>
            <button
              class="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
              (click)="closeDetails()"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Transaction Return banner -->
          <div class="px-7 pt-5 pb-4 shrink-0">
            <div class="bg-red-50 border border-red-200 rounded-xl px-4 py-3.5">
              <div class="flex items-center gap-2 mb-1">
                <svg class="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                </svg>
                <p class="text-sm font-bold text-red-700">Transaction Return</p>
              </div>
              <p class="text-xs text-slate-500 ml-6">
                Transaction ID: <span class="font-bold text-red-600">{{ detailsTxn()!.id }}</span>
              </p>
            </div>
          </div>

          <!-- Items -->
          <div class="px-7 flex-1 overflow-y-auto">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Items Added as Credits:</p>
            <div class="divide-y divide-slate-100">
              @for (item of returnedItems(); track item.sku) {
                <div class="py-3 flex items-start justify-between gap-4">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-slate-900">{{ item.productName }}</p>
                    <p class="text-xs text-slate-400 mt-0.5">
                      {{ item.sku }}@if (item.size) { · {{ item.size }}}@if (item.color) { · {{ item.color }}}
                    </p>
                    <p class="text-xs text-slate-400 mt-0.5">Qty: {{ item.quantity }}</p>
                  </div>
                  <span class="text-sm font-bold text-red-600 shrink-0">-{{ item.lineTotal | currency }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Total Credit -->
          <div class="border-t border-slate-200 px-7 py-4 shrink-0">
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-slate-700">Total Credit:</span>
              <span class="text-base font-bold text-red-600">-{{ returnTotal() | currency }}</span>
            </div>
          </div>

          <!-- Continue -->
          <div class="border-t border-slate-200 px-7 py-4 flex justify-end shrink-0">
            <button
              class="px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
              (click)="continueToCart()"
            >Continue</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }
    .txn-th {
      padding: 0.75rem 1.25rem;
      text-align: left;
      font-size: 0.8125rem;
      font-weight: 500;
      color: #94a3b8;
      white-space: nowrap;
    }
    .txn-td {
      padding: 1rem 1.25rem;
      color: #475569;
    }
  `]
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

  sortField = signal<SortField>('id');
  sortDir   = signal<SortDir>('asc');

  private idQuery       = signal('');
  private customerQuery = signal('');

  detailsTxn       = signal<Transaction | null>(null);
  showReturn       = signal(false);
  showReturnLoaded = signal(false);
  returnQtys       = signal<ReturnQty>({});
  returnError      = signal('');
  returnedItems    = signal<(TransactionItem & { lineTotal: number })[]>([]);

  filtered = computed(() =>
    this.txnSvc.search(this.idQuery(), this.customerQuery(), this.statusFilter())
  );

  sorted = computed(() => {
    const list  = [...this.filtered()];
    const field = this.sortField();
    const dir   = this.sortDir();
    return list.sort((a, b) => {
      let va: string | number;
      let vb: string | number;
      switch (field) {
        case 'id':           va = a.id;                    vb = b.id;           break;
        case 'customerName': va = a.customerName;          vb = b.customerName; break;
        case 'companyName':  va = a.companyName ?? '';     vb = b.companyName ?? ''; break;
        case 'soldBy':       va = a.soldBy;                vb = b.soldBy;       break;
        case 'total':        va = a.total;                 vb = b.total;        break;
        default:             va = a.id;                    vb = b.id;
      }
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  });

  returnTotal = computed(() =>
    this.returnedItems().reduce((s, i) => s + i.lineTotal, 0)
  );

  hasReturnQty = computed(() =>
    Object.values(this.returnQtys()).some(qty => qty > 0)
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

  sortBy(field: SortField): void {
    if (this.sortField() === field) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
    }
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

  closeReturn(): void { this.showReturn.set(false); }

  getReturnQty(sku: string): number { return this.returnQtys()[sku] ?? 0; }

  setReturnQty(sku: string, max: number, rawValue: string): void {
    let qty = parseInt(rawValue, 10) || 0;
    if (qty < 0) qty = 0;
    if (qty > max) qty = max;
    this.returnQtys.update(prev => ({ ...prev, [sku]: qty }));
    this.returnError.set('');
  }

  incrementQty(sku: string, max: number): void {
    const current = this.getReturnQty(sku);
    if (current < max) {
      this.returnQtys.update(prev => ({ ...prev, [sku]: current + 1 }));
      this.returnError.set('');
    }
  }

  decrementQty(sku: string): void {
    const current = this.getReturnQty(sku);
    if (current > 0) {
      this.returnQtys.update(prev => ({ ...prev, [sku]: current - 1 }));
    }
  }

  processReturn(): void {
    const txn = this.detailsTxn();
    if (!txn) return;
    const selected = txn.items.filter(item => (this.returnQtys()[item.sku] ?? 0) > 0);
    if (selected.length === 0) {
      this.returnError.set('Please enter a return quantity for at least one item.');
      return;
    }
    this.returnedItems.set(selected.map(item => {
      const qty = this.returnQtys()[item.sku];
      return { ...item, quantity: qty, lineTotal: +(item.unitPrice * qty).toFixed(2) };
    }));
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
      variant: { id: -(idx + 1), sku: item.sku, size: item.size, color: item.color, stock: 0, priceAdjustment: 0 },
      quantity: -item.quantity,
      isReturn: true
    }));
    this.cartSvc.loadReturnItems(cartItems, txn.id);
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

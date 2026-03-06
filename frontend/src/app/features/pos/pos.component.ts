import {
  Component, inject, OnInit, OnDestroy, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../core/services/toast.service';
import { CartItem, Product } from '../../core/models/product.model';
import { environment } from '../../../environments/environment';

interface Payment { method: string; amount: number; date: Date; }

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <!-- ══════════════════════════════════════════════════════════════════════
         CHECKOUT MODE
    ══════════════════════════════════════════════════════════════════════ -->
    @if (checkoutMode()) {
      <div class="flex flex-col lg:flex-row gap-3 lg:gap-4 min-h-0 lg:h-[calc(100dvh-3.5rem-3rem)]">

        <!-- LEFT: Order Summary -->
        <div class="flex flex-col bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden lg:flex-1 lg:min-h-0">

          <!-- Header -->
          <div class="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 shrink-0">
            <button
              class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
              (click)="exitCheckout()"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <span class="font-bold text-slate-900 text-lg">Sale</span>
          </div>

          <!-- Items list -->
          <div class="overflow-y-auto lg:flex-1 max-h-[35vh] lg:max-h-none">
            @for (item of cartSvc.items(); track item.id) {
              <div class="flex items-start gap-3 px-5 py-3.5 border-b border-slate-50">
                <span class="text-sm font-semibold text-slate-500 w-5 shrink-0 mt-0.5 text-right">{{ item.quantity }}</span>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-slate-900">{{ item.productName }}</p>
                  <p class="text-xs text-slate-400 mt-0.5">
                    SKU: {{ item.variant.sku }}@if (item.variant.size) { | Size {{ item.variant.size }}}@if (item.variant.color) { | {{ item.variant.color }}}
                  </p>
                </div>
                <span class="text-sm font-semibold text-slate-900 shrink-0">{{ getItemBasePrice(item) * item.quantity | currency }}</span>
              </div>
            }
          </div>

          <!-- Totals block -->
          <div class="px-5 py-4 border-t border-slate-200 bg-white shrink-0 space-y-2.5">
            <div class="flex justify-between text-sm">
              <span class="text-slate-500">Subtotal</span>
              <span class="text-slate-700">{{ subtotal() | currency }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-slate-500">Tax GST 10%</span>
              <span class="text-slate-700">{{ gst() | currency }}</span>
            </div>
            <div class="flex justify-between items-baseline border-t border-slate-200 pt-2.5">
              <span class="font-bold text-slate-900 text-sm uppercase tracking-wide">
                SALE TOTAL
                <span class="font-normal text-xs text-slate-400 normal-case ml-1">{{ cartSvc.count() }} item{{ cartSvc.count() !== 1 ? 's' : '' }}</span>
              </span>
              <span class="font-bold text-slate-900 text-lg">{{ saleTotal() | currency }}</span>
            </div>
            @for (pmt of payments(); track $index) {
              <div class="flex justify-between items-start border-t border-slate-100 pt-2">
                <div>
                  <p class="text-sm font-semibold text-slate-800">{{ pmt.method }}</p>
                  <p class="text-xs text-slate-400">{{ pmt.date | date:'dd MMM yyyy, hh:mm a' }}</p>
                </div>
                <span class="text-sm font-semibold text-slate-700">{{ pmt.amount | currency }}</span>
              </div>
            }
            <div class="flex justify-between items-baseline border-t border-slate-200 pt-2.5">
              <span class="font-bold text-slate-900 text-sm uppercase tracking-wide">TO PAY</span>
              <span class="font-bold text-slate-900 text-lg">{{ remaining() | currency }}</span>
            </div>
          </div>
        </div>

        <!-- RIGHT: Payment Panel -->
        <div class="lg:w-[26rem] lg:shrink-0 flex flex-col bg-white rounded-xl border border-slate-200 shadow-card">
          <div class="p-5 sm:p-6 flex flex-col gap-4">

            <div>
              <p class="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">AMOUNT TO PAY</p>
              <!-- Editable amount with $ prefix -->
              <div class="relative border-2 border-slate-200 focus-within:border-brand-500 rounded-xl transition-colors">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold text-slate-400 pointer-events-none select-none">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full pl-10 pr-5 py-4 text-4xl font-bold text-slate-900 focus:outline-none bg-transparent rounded-xl"
                  [value]="amountToPayStr()"
                  (focus)="$any($event.target).select()"
                  (input)="amountToPayStr.set($any($event.target).value)"
                />
              </div>
              <p class="text-xs text-slate-400 mt-2">Edit to make partial payment</p>
            </div>

            <!-- Cash / Eftpos buttons -->
            <div class="grid grid-cols-2 gap-3">
              <button
                class="py-6 sm:py-7 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold text-xl rounded-xl transition-all"
                (click)="openCashModal()"
              >Cash</button>
              <button
                class="py-6 sm:py-7 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold text-xl rounded-xl transition-all"
                (click)="confirmEftposPayment()"
              >Eftpos</button>
            </div>

            <!-- Other -->
            <button class="w-full flex items-center justify-between px-4 py-3.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
              <span class="text-sm font-medium text-slate-600">Other</span>
              <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- ── Cash Payment Modal ──────────────────────────────────────────── -->
      @if (cashModal()) {
        <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" (click)="$event.stopPropagation()">

            <div class="flex items-center justify-between mb-6">
              <h2 class="text-lg font-bold text-slate-900">Cash Payment</h2>
              <button
                class="w-9 h-9 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                (click)="cashModal.set(false)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div class="text-center mb-6">
              <p class="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">AMOUNT TO PAY</p>
              <p class="text-4xl font-bold text-slate-900">{{ cashAmountDue() | currency }}</p>
            </div>

            <div class="mb-4">
              <label class="block text-sm text-slate-600 mb-2">Amount Given by Customer</label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0.00"
                class="w-full border-2 rounded-xl px-5 py-4 text-2xl font-semibold focus:outline-none transition-colors"
                [class.border-brand-500]="cashGiven() > 0"
                [class.border-slate-200]="cashGiven() <= 0"
                [value]="cashGiven() > 0 ? cashGiven() : ''"
                (input)="cashGiven.set(+$any($event.target).value || 0)"
              />
            </div>

            <div class="bg-slate-50 rounded-xl py-4 text-center mb-6">
              <p class="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">CHANGE TO GIVE</p>
              <p class="text-3xl font-bold text-green-600">{{ cashChange() | currency }}</p>
            </div>

            <div class="flex gap-3">
              <button
                class="flex-1 py-4 rounded-xl border-2 border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                (click)="cashModal.set(false)"
              >Cancel</button>
              <button
                class="flex-1 py-4 rounded-xl font-bold text-white transition-colors"
                [class.bg-blue-600]="cashCanComplete()"
                [class.hover:bg-blue-700]="cashCanComplete()"
                [class.bg-brand-200]="!cashCanComplete()"
                [class.cursor-not-allowed]="!cashCanComplete()"
                (click)="confirmCashPayment()"
              >Done</button>
            </div>
          </div>
        </div>
      }

      <!-- ── Sale Complete Modal ─────────────────────────────────────────── -->
      @if (saleComplete()) {
        <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 sm:p-8 overflow-y-auto max-h-[95dvh]">

            <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
            </div>

            <h2 class="text-2xl font-bold text-center text-slate-900 mb-1">Sale Complete</h2>
            <p class="text-sm text-slate-500 text-center mb-6">Payment received successfully</p>

            <div class="border-t border-slate-100 pt-5 mt-1">
              <p class="text-xs font-bold uppercase tracking-widest text-slate-400 text-center mb-1">SEND RECEIPT</p>
              <p class="text-sm italic text-orange-500 text-center mb-5">"Would you like the receipt sent to your phone?"</p>

              <!-- Print -->
              <div class="flex items-center gap-3 p-4 border border-slate-200 rounded-xl mb-3">
                <svg class="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                        d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z"/>
                </svg>
                <div class="flex-1">
                  <p class="text-sm font-semibold text-slate-900">Print</p>
                  <p class="text-xs text-slate-400">Auto-print disabled</p>
                </div>
                <button class="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-lg transition-colors" (click)="printReceipt()">Print</button>
              </div>

              <!-- SMS -->
              <div class="flex items-start gap-3 p-4 border border-slate-200 rounded-xl mb-3">
                <svg class="w-5 h-5 text-slate-400 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                </svg>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-slate-900 mb-2">SMS</p>
                  <input
                    type="tel"
                    placeholder="04XX XXX XXX"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                    [value]="receiptPhone()"
                    (input)="receiptPhone.set($any($event.target).value)"
                  />
                </div>
                <button class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-lg transition-colors mt-7 shrink-0">Send</button>
              </div>

              <!-- Email -->
              <div class="flex items-start gap-3 p-4 border border-slate-200 rounded-xl mb-5">
                <svg class="w-5 h-5 text-slate-400 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-slate-900 mb-2">Email</p>
                  <input
                    type="email"
                    placeholder="Email address"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                    [value]="receiptEmail()"
                    (input)="receiptEmail.set($any($event.target).value)"
                  />
                </div>
                <button class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-lg transition-colors mt-7 shrink-0">Send</button>
              </div>
            </div>

            <button
              class="w-full py-4 bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white font-bold text-base rounded-xl transition-all"
              (click)="nextSale()"
            >Next Sale</button>
          </div>
        </div>
      }
    } @else {
      <!-- ══════════════════════════════════════════════════════════════════
           NORMAL POS MODE
      ══════════════════════════════════════════════════════════════════ -->
      <div class="flex flex-col lg:flex-row gap-3 lg:gap-4 h-[calc(100dvh-3.5rem-1.5rem)] sm:h-[calc(100dvh-3.5rem-2rem)] lg:h-[calc(100dvh-3.5rem-3rem)]">

        <!-- ── LEFT: Search Panel ──────────────────────────────────────────── -->
        <div class="flex-1 flex flex-col min-w-0 bg-white rounded-xl border border-slate-200 shadow-card">

          <!-- Search input -->
          <div class="px-4 py-4 relative" style="z-index:40">
            <div class="relative">
              <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none"
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
              </svg>
              <input
                [formControl]="searchCtrl"
                type="text"
                autocomplete="off"
                placeholder="Search products or start scanning"
                class="w-full pl-12 pr-10 py-3.5 rounded-xl border-2 border-slate-200 focus:border-brand-500 focus:outline-none text-sm transition-colors"
                (focus)="dropdownOpen.set(true)"
                (keydown.escape)="dropdownOpen.set(false)"
              />
              @if (searchCtrl.value) {
                <button
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  (click)="searchCtrl.setValue('')"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              }
            </div>

            <!-- Backdrop -->
            @if (dropdownOpen()) {
              <div class="fixed inset-0" style="z-index:38" (click)="dropdownOpen.set(false)"></div>
            }

            <!-- Dropdown panel -->
            @if (dropdownOpen()) {
              <div
                class="absolute left-4 right-4 top-full mt-1 bg-white rounded-xl border border-slate-200 overflow-y-auto"
                style="z-index:39; max-height:65vh; box-shadow:0 20px 60px -10px rgba(0,0,0,0.18)"
              >
                @if (loading()) {
                  <div class="flex items-center justify-center gap-2 py-10 text-slate-400">
                    <div class="spinner"></div>
                    <span class="text-sm">Loading products…</span>
                  </div>
                } @else if (groupedProducts().length === 0) {
                  <div class="py-10 text-center text-sm text-slate-400">
                    {{ searchCtrl.value ? 'No results found' : 'No products yet' }}
                  </div>
                } @else {
                  @for (group of groupedProducts(); track group.category) {
                    <div class="px-4 py-2 text-[10px] font-bold tracking-widest uppercase text-slate-400 bg-slate-50 border-b border-slate-100 sticky top-0">
                      {{ group.category }}
                    </div>
                    @for (product of group.items; track product.id) {
                      <button
                        class="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-50 text-left border-b border-slate-50 last:border-0 transition-colors"
                        (mousedown)="pickProduct(product)"
                      >
                        @if (product.imageUrl) {
                          <img
                            [src]="resolveImageUrl(product.imageUrl)"
                            [alt]="product.name"
                            class="w-10 h-10 rounded-lg object-cover border border-slate-100 shrink-0"
                          />
                        } @else {
                          <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <svg class="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="1.5"/>
                              <circle cx="8.5" cy="8.5" r="1.5" stroke-width="1.5"/>
                              <polyline points="21 15 16 10 5 21" stroke-width="1.5"/>
                            </svg>
                          </div>
                        }
                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-semibold text-slate-900 truncate">{{ product.name }}</p>
                          <p class="text-xs font-mono text-slate-400">{{ product.sku }}</p>
                        </div>
                        <span class="text-sm font-bold text-slate-600 shrink-0">{{ product.price | currency }}</span>
                      </button>
                    }
                  }
                }
              </div>
            }
          </div>

          <!-- Empty state -->
          <div class="flex-1 flex items-center justify-center border-t border-slate-100">
            <div class="text-center px-6">
              <svg class="w-14 h-14 mx-auto mb-3 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
              </svg>
              <p class="text-sm font-medium text-slate-400">Click the search box to find products</p>
              <p class="text-xs mt-1 text-slate-300">or scan a barcode to add directly</p>
            </div>
          </div>
        </div>

        <!-- ── RIGHT: Cart Panel ───────────────────────────────────────────── -->
        <div class="w-full h-64 sm:h-72 lg:h-auto lg:w-80 shrink-0 flex flex-col bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">

          <!-- Add Customer button -->
          <button class="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-white hover:bg-slate-50 transition-colors text-left w-full shrink-0">
            <span class="w-7 h-7 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 5v14M5 12h14"/>
              </svg>
            </span>
            <span class="text-sm text-slate-400 font-medium">Add Customer</span>
          </button>

          <!-- Items list (accordion) -->
          <div class="flex-1 overflow-y-auto bg-slate-50/60">
            @if (cartSvc.items().length === 0) {
              <div class="flex flex-col items-center justify-center h-full py-12 text-slate-400">
                <svg class="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
                <p class="text-sm font-medium text-slate-500">No items added yet</p>
                <p class="text-xs mt-1">Search and select a product to add</p>
              </div>
            } @else {
              @for (item of cartSvc.items(); track item.id) {
                <div class="bg-white border-b border-slate-100">

                  <!-- Accordion header (always visible) -->
                  <div
                    class="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none hover:bg-slate-50 transition-colors"
                    (click)="toggleCartItem(item.id)"
                  >
                    <!-- Chevron -->
                    <svg
                      class="w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200"
                      [class.rotate-90]="expandedCartItemId() === item.id"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
                    </svg>

                    <!-- Qty badge -->
                    <span class="min-w-[1.25rem] h-5 px-1 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {{ item.quantity }}
                    </span>

                    <!-- Name + variant -->
                    <div class="flex-1 min-w-0">
                      <p class="text-xs font-semibold text-slate-800 truncate">{{ item.productName }}</p>
                      @if (item.variant.size || item.variant.color) {
                        <p class="text-[10px] text-slate-400 truncate">
                          {{ item.variant.size }}{{ item.variant.size && item.variant.color ? ' / ' : '' }}{{ item.variant.color }}
                        </p>
                      }
                    </div>

                    <!-- Line total -->
                    <span class="text-sm font-semibold text-slate-700 shrink-0">
                      {{ getItemBasePrice(item) * item.quantity | currency }}
                    </span>

                    <!-- Trash -->
                    <button
                      class="text-slate-300 hover:text-red-500 transition-colors shrink-0 ml-0.5"
                      (click)="$event.stopPropagation(); cartSvc.remove(item.id)"
                      title="Remove"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>

                  <!-- Discount sub-row -->
                  @if (item.discountType && item.discountValue) {
                    <div class="flex items-center gap-1.5 px-3 pb-1 pl-9">
                      <span class="text-xs font-semibold text-slate-700">
                        Discount {{ getItemDiscount(item) | currency }}
                      </span>
                      <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded tracking-wide">DISCOUNT</span>
                      <span class="text-xs font-semibold text-emerald-700 ml-auto shrink-0">-{{ getItemDiscount(item) | currency }}</span>
                      <button
                        class="text-slate-300 hover:text-red-500 transition-colors shrink-0"
                        (click)="cartSvc.removeItemDiscount(item.id)"
                        title="Remove discount"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                    <div class="px-9 pb-2 text-[10px] text-slate-400">
                      Type: {{ item.discountType === 'percentage' ? item.discountValue + '%' : 'Fixed Amount' }}
                    </div>
                  }

                  <!-- Expanded body -->
                  @if (expandedCartItemId() === item.id) {
                    <div class="px-3 pb-3 pt-3 border-t border-slate-100 bg-slate-50/40">

                      <!-- 3-column grid: Quantity | Price | Discount(%) -->
                      <div class="grid grid-cols-3 gap-2 mb-3">

                        <!-- Quantity -->
                        <div>
                          <span class="text-[11px] text-slate-500 mb-1 block">Quantity</span>
                          <div class="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white h-9">
                            <button
                              class="w-7 flex-shrink-0 h-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors text-base leading-none"
                              (click)="cartSvc.setQuantity(item.id, item.quantity - 1)"
                            >−</button>
                            <span class="flex-1 text-center text-sm font-semibold text-slate-700 select-none">{{ item.quantity }}</span>
                            <button
                              class="w-7 flex-shrink-0 h-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors text-base leading-none"
                              (click)="cartSvc.setQuantity(item.id, item.quantity + 1)"
                            >+</button>
                          </div>
                        </div>

                        <!-- Price -->
                        <div>
                          <span class="text-[11px] text-slate-500 mb-1 block">Price</span>
                          <div class="h-9 border border-slate-200 rounded-lg bg-white px-2 flex items-center text-sm font-medium text-slate-700">
                            {{ (item.productPrice + (item.variant.priceAdjustment ?? 0)) | currency }}
                          </div>
                        </div>

                        <!-- Discount % (inline editable) -->
                        <div>
                          <span class="text-[11px] text-slate-500 mb-1 block">Discount (%)</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            class="w-full h-9 border border-slate-200 rounded-lg bg-white px-2 text-sm text-slate-700 focus:outline-none focus:border-brand-400"
                            [value]="item.discountType === 'percentage' ? (item.discountValue ?? 0) : 0"
                            (change)="applyInlineDiscount(item.id, $any($event.target).value)"
                          />
                        </div>
                      </div>

                      <!-- Note -->
                      <div>
                        <span class="text-[11px] text-slate-500 mb-1 block">Note</span>
                        <textarea
                          class="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white resize-none focus:outline-none focus:border-brand-300 transition-colors"
                          rows="2"
                          [value]="item.note || ''"
                          (change)="cartSvc.setItemNote(item.id, $any($event.target).value)"
                          placeholder="Enter a note about this product"
                        ></textarea>
                      </div>
                    </div>
                  }
                </div>
              }
            }
          </div>

          <!-- Bottom action bar -->
          <div class="border-t border-slate-200 shrink-0">

            <!-- ADD | Discount | Promo Code | Note -->
            <div class="flex items-center bg-white border-b border-slate-100">
              <button class="flex-1 text-[11px] font-semibold text-brand-600 hover:bg-brand-50 py-2.5 transition-colors">ADD</button>
              <div class="w-px h-4 bg-slate-200"></div>
              <button
                class="flex-1 text-[11px] font-semibold text-brand-600 hover:bg-brand-50 py-2.5 transition-colors"
                (click)="openDiscountModal()"
              >Discount</button>
              <div class="w-px h-4 bg-slate-200"></div>
              <button class="flex-1 text-[11px] font-semibold text-brand-600 hover:bg-brand-50 py-2.5 transition-colors">Promo Code</button>
              <div class="w-px h-4 bg-slate-200"></div>
              <button class="flex-1 text-[11px] font-semibold text-brand-600 hover:bg-brand-50 py-2.5 transition-colors">Note</button>
            </div>

            <!-- Tender button -->
            <div class="px-3 py-3 bg-white">
              <button
                class="w-full py-3.5 bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white font-bold text-sm rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                [disabled]="cartSvc.items().length === 0"
                (click)="enterCheckout()"
              >
                Tender ({{ cartSvc.count() }} Item{{ cartSvc.count() !== 1 ? 's' : '' }})
                &nbsp;{{ cartSvc.total() | currency }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Size Modal ────────────────────────────────────────────────────── -->
      @if (pickStep() === 'size') {
        <div
          class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          (click)="cancelVariantPick()"
        >
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-slate-900">Select Size</h2>
              <button
                class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                (click)="cancelVariantPick()"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="h-px bg-slate-100 my-4"></div>
            <div class="grid grid-cols-3 gap-3">
              @for (size of availableSizes(); track size) {
                <button
                  class="py-6 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-bold text-base transition-all"
                  (click)="selectSize(size)"
                >{{ size }}</button>
              }
            </div>
          </div>
        </div>
      }

      <!-- ── Colour Modal ──────────────────────────────────────────────────── -->
      @if (pickStep() === 'color') {
        <div
          class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          (click)="cancelVariantPick()"
        >
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-slate-900">Select Colour</h2>
              <button
                class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                (click)="cancelVariantPick()"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="h-px bg-slate-100 my-4"></div>
            <div class="grid grid-cols-3 gap-3">
              @for (color of availableColors(); track color) {
                <button
                  class="py-6 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-bold text-base transition-all"
                  (click)="selectColor(color)"
                >{{ color }}</button>
              }
            </div>
          </div>
        </div>
      }

      <!-- ── Quantity Modal ────────────────────────────────────────────────── -->
      @if (pickStep() === 'qty') {
        <div
          class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          (click)="cancelVariantPick()"
        >
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-slate-900">Select Quantity</h2>
              <button
                class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                (click)="cancelVariantPick()"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="h-px bg-slate-100 my-4"></div>
            <div class="flex items-center justify-center gap-4 py-4">
              <button
                class="w-16 h-16 rounded-xl border-2 border-slate-200 flex items-center justify-center text-2xl font-light text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors"
                [disabled]="pickQty() <= 1"
                (click)="pickQty.set(pickQty() - 1)"
              >−</button>
              <span class="text-4xl font-bold text-slate-900 min-w-[3rem] text-center select-none">{{ pickQty() }}</span>
              <button
                class="w-16 h-16 rounded-xl border-2 border-slate-200 flex items-center justify-center text-2xl font-light text-slate-600 hover:bg-slate-50 transition-colors"
                (click)="pickQty.set(pickQty() + 1)"
              >+</button>
            </div>
            <button
              class="mt-4 w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold text-base rounded-xl transition-colors"
              (click)="confirmAddToCart()"
            >Add to Cart</button>
          </div>
        </div>
      }

      <!-- ── Add Discount Modal ────────────────────────────────────────────── -->
      @if (discountModal()) {
        <div
          class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          (click)="discountModal.set(false)"
        >
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-slate-900">Add Discount</h2>
              <button
                class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                (click)="discountModal.set(false)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="h-px bg-slate-100 mb-5"></div>

            <div class="mb-4">
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Discount Type</label>
              <select
                class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-brand-400 bg-white"
                [value]="discountType()"
                (change)="discountType.set($any($event.target).value)"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>

            <div class="mb-4">
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                Discount Value {{ discountType() === 'percentage' ? '(%)' : '($)' }}
              </label>
              <input
                type="number"
                min="0"
                [placeholder]="discountType() === 'percentage' ? 'e.g. 10' : 'e.g. 5.00'"
                class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                [value]="discountValueInput()"
                (input)="discountValueInput.set($any($event.target).value)"
              />
            </div>

            <div class="mb-5">
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Description <span class="font-normal text-slate-400">(Optional)</span></label>
              <input
                type="text"
                placeholder="e.g. Staff discount"
                class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                [value]="discountDesc()"
                (input)="discountDesc.set($any($event.target).value)"
              />
            </div>

            <button
              class="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl transition-colors"
              (click)="applyDiscount()"
            >Apply Discount</button>
          </div>
        </div>
      }
    }
  `,
  styles: [`
    .spinner {
      @apply inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin;
    }
  `]
})
export class PosComponent implements OnInit, OnDestroy {
  private productSvc = inject(ProductService);
  private toast      = inject(ToastService);
  cartSvc            = inject(CartService);
  private destroy$   = new Subject<void>();

  searchCtrl = new FormControl('');
  loading    = signal(true);
  products   = signal<Product[]>([]);

  // Search dropdown
  dropdownOpen = signal(false);

  // Step-by-step variant selection
  selectingProduct = signal<Product | null>(null);
  pickStep         = signal<'size' | 'color' | 'qty' | null>(null);
  selectedSize     = signal<string | null>(null);
  selectedColor    = signal<string | null>(null);
  pickQty          = signal(1);

  // Cart accordion
  expandedCartItemId = signal<string | null>(null);

  // Discount modal
  discountModal      = signal(false);
  discountType       = signal<'percentage' | 'fixed'>('percentage');
  discountValueInput = signal('');
  discountDesc       = signal('');

  // ── Checkout / Payment ─────────────────────────────────────────────────
  checkoutMode   = signal(false);
  payments       = signal<Payment[]>([]);
  amountToPayStr = signal('');

  // Cash modal
  cashModal = signal(false);
  cashGiven = signal(0);

  // Sale complete
  saleComplete  = signal(false);
  receiptPhone  = signal('');
  receiptEmail  = signal('');

  // ── Checkout computed values ───────────────────────────────────────────
  saleTotal  = computed(() => this.cartSvc.total());
  subtotal   = computed(() => this.saleTotal() / 1.1);
  gst        = computed(() => this.saleTotal() - this.subtotal());
  totalPaid  = computed(() => this.payments().reduce((s, p) => s + p.amount, 0));
  remaining  = computed(() => Math.max(0, this.saleTotal() - this.totalPaid()));

  amountToPayValue = computed(() => {
    const v = parseFloat(this.amountToPayStr());
    const rem = this.remaining();
    if (isNaN(v) || v <= 0) return rem;
    return Math.min(v, rem);
  });

  // Cash rounds up to nearest whole dollar
  cashAmountDue   = computed(() => Math.ceil(this.amountToPayValue()));
  cashChange      = computed(() => Math.max(0, this.cashGiven() - this.cashAmountDue()));
  cashCanComplete = computed(() => this.cashGiven() >= this.cashAmountDue());

  // ── Grouped products ───────────────────────────────────────────────────
  groupedProducts = computed(() => {
    const map = new Map<string, Product[]>();
    for (const p of this.products()) {
      const cat = p.categoryName ?? 'Uncategorised';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return [...map.entries()].map(([category, items]) => ({ category, items }));
  });

  availableSizes = computed(() => {
    const p = this.selectingProduct();
    if (!p) return [];
    return [...new Set(p.variants.map(v => v.size).filter((s): s is string => !!s))];
  });

  availableColors = computed(() => {
    const p = this.selectingProduct();
    if (!p) return [];
    const sz = this.selectedSize();
    const variants = sz ? p.variants.filter(v => v.size === sz) : p.variants;
    return [...new Set(variants.map(v => v.color).filter((c): c is string => !!c))];
  });

  ngOnInit() {
    this.load();
    this.searchCtrl.valueChanges.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(v => this.load(v ?? ''));
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  load(search = '') {
    this.loading.set(true);
    this.productSvc.getAll(search).subscribe({
      next: p => { this.products.set(p); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Failed to load products'); }
    });
  }

  // ── Checkout flow ──────────────────────────────────────────────────────

  enterCheckout() {
    this.payments.set([]);
    this.amountToPayStr.set(this.saleTotal().toFixed(2));
    this.checkoutMode.set(true);
  }

  exitCheckout() {
    this.checkoutMode.set(false);
    this.payments.set([]);
    this.saleComplete.set(false);
  }

  openCashModal() {
    this.cashGiven.set(0);
    this.cashModal.set(true);
  }

  confirmCashPayment() {
    if (!this.cashCanComplete()) return;
    this.recordPayment('Cash', this.cashAmountDue());
    this.cashModal.set(false);
    this.cashGiven.set(0);
  }

  confirmEftposPayment() {
    this.recordPayment('Eftpos', this.amountToPayValue());
  }

  private recordPayment(method: string, amount: number) {
    this.payments.update(p => [...p, { method, amount, date: new Date() }]);
    if (this.remaining() <= 0.005) {
      this.saleComplete.set(true);
    } else {
      this.amountToPayStr.set(this.remaining().toFixed(2));
    }
  }

  nextSale() {
    this.cartSvc.clear();
    this.saleComplete.set(false);
    this.checkoutMode.set(false);
    this.payments.set([]);
    this.receiptPhone.set('');
    this.receiptEmail.set('');
  }

  // ── Variant picking ────────────────────────────────────────────────────

  pickProduct(product: Product) {
    this.dropdownOpen.set(false);
    if (product.variants.length === 0) {
      this.toast.error(`"${product.name}" has no variants.`);
      return;
    }
    this.selectingProduct.set(product);
    this.selectedSize.set(null);
    this.selectedColor.set(null);
    this.pickQty.set(1);

    const sizes = [...new Set(product.variants.map(v => v.size).filter(Boolean))];
    if (sizes.length > 0) {
      this.pickStep.set('size');
    } else {
      const colors = [...new Set(product.variants.map(v => v.color).filter(Boolean))];
      this.pickStep.set(colors.length > 0 ? 'color' : 'qty');
    }
  }

  selectSize(size: string) {
    this.selectedSize.set(size);
    const p = this.selectingProduct()!;
    const colors = [...new Set(p.variants.filter(v => v.size === size).map(v => v.color).filter(Boolean))];
    this.pickStep.set(colors.length > 0 ? 'color' : 'qty');
  }

  selectColor(color: string) {
    this.selectedColor.set(color);
    this.pickStep.set('qty');
  }

  cancelVariantPick() {
    this.selectingProduct.set(null);
    this.pickStep.set(null);
    this.selectedSize.set(null);
    this.selectedColor.set(null);
    this.pickQty.set(1);
  }

  confirmAddToCart() {
    const product = this.selectingProduct();
    if (!product) return;
    const sz  = this.selectedSize();
    const col = this.selectedColor();
    const variant = product.variants.find(v =>
      (!sz || v.size === sz) && (!col || v.color === col)
    ) ?? product.variants[0];
    if (!variant) return;
    const qty = this.pickQty();
    this.cartSvc.add(product, variant, qty);
    this.toast.success(`"${product.name} · ${variant.sku}" ×${qty} added`);
    this.cancelVariantPick();
  }

  toggleCartItem(id: string) {
    this.expandedCartItemId.update(cur => cur === id ? null : id);
  }

  // ── Item helpers ───────────────────────────────────────────────────────

  getItemBasePrice(item: CartItem): number {
    return item.productPrice + (item.variant.priceAdjustment ?? 0);
  }

  getItemDiscount(item: CartItem): number {
    if (!item.discountType || !item.discountValue) return 0;
    const linePrice = this.getItemBasePrice(item) * item.quantity;
    if (item.discountType === 'percentage') return linePrice * (item.discountValue / 100);
    return item.discountValue;
  }

  getItemTotal(item: CartItem): number {
    return this.getItemBasePrice(item) * item.quantity - this.getItemDiscount(item);
  }

  applyInlineDiscount(id: string, value: string) {
    const val = parseFloat(value);
    if (isNaN(val) || val <= 0) {
      this.cartSvc.removeItemDiscount(id);
    } else {
      this.cartSvc.setItemDiscount(id, 'percentage', val);
    }
  }

  openDiscountModal() {
    const expanded = this.expandedCartItemId();
    if (this.cartSvc.items().length === 0) {
      this.toast.info('Add items to cart first');
      return;
    }
    if (!expanded) {
      this.toast.info('Tap an item to expand it, then apply a discount');
      return;
    }
    const item = this.cartSvc.items().find(i => i.id === expanded);
    if (item) {
      this.discountType.set(item.discountType ?? 'percentage');
      this.discountValueInput.set(item.discountValue?.toString() ?? '');
      this.discountDesc.set(item.discountDescription ?? '');
    }
    this.discountModal.set(true);
  }

  applyDiscount() {
    const targetId = this.expandedCartItemId();
    if (!targetId) return;
    const val = parseFloat(this.discountValueInput());
    if (isNaN(val) || val <= 0) {
      this.toast.error('Enter a valid discount value');
      return;
    }
    this.cartSvc.setItemDiscount(targetId, this.discountType(), val, this.discountDesc() || undefined);
    this.discountModal.set(false);
    this.toast.success('Discount applied');
  }

  resolveImageUrl(url?: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${environment.apiUrl.replace(/\/api$/, '')}${url}`;
  }

  printReceipt() {
    const m   = (n: number) => '$' + n.toFixed(2);
    const now = this.payments().length ? this.payments()[0].date : new Date();
    const receiptNo = Date.now().toString().slice(-8);
    const dateStr   = now.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr   = now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });

    const itemRows = this.cartSvc.items().map(item => {
      const price  = this.getItemBasePrice(item) * item.quantity;
      const detail = [item.variant.size, item.variant.color].filter(Boolean).join(' / ');
      const disc   = item.discountType && item.discountValue ? this.getItemDiscount(item) : 0;
      return `
        <tr>
          <td>${item.productName}${detail ? `<br><span class="sm">${detail}</span>` : ''}
              ${disc > 0 ? `<br><span class="sm disc">Discount: -${m(disc)}</span>` : ''}</td>
          <td class="center">${item.quantity}</td>
          <td class="right">${m(price)}</td>
        </tr>`;
    }).join('');

    const pmtRows = this.payments().map(p =>
      `<tr><td>Payment (${p.method})</td><td class="right">${m(p.amount)}</td></tr>`
    ).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Pacifico&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',Courier,monospace;font-size:9.5px;width:72mm;padding:5mm 4mm;color:#000}
  .logo{font-family:'Pacifico',cursive;font-size:22px;text-align:center;margin-bottom:5px}
  .center{text-align:center}
  .right{text-align:right}
  .store{font-size:8.5px;text-align:center;line-height:1.55}
  hr{border:none;border-top:1px dashed #888;margin:5px 0}
  .meta{font-size:8.5px;margin:2px 0}
  table{width:100%;border-collapse:collapse;font-size:9px}
  th{font-weight:bold;padding:1px 0;border-bottom:1px dashed #888}
  th:nth-child(2){text-align:center}th:last-child{text-align:right}
  td{padding:2px 0;vertical-align:top}
  td:nth-child(2){text-align:center}td:last-child{text-align:right}
  .sm{font-size:7.5px;color:#555}
  .disc{color:#000}
  .totals td:last-child{text-align:right}
  .bold td{font-weight:bold}
  .footer{text-align:center;font-size:8.5px;margin-top:5px}
  @media print{@page{size:80mm auto;margin:0}body{width:80mm;padding:4mm}}
</style></head><body>
<div class="logo">Sauers</div>
<div class="store">
  202 John St, Maryborough QLD 4650<br>
  2/143 Old Maryborough Rd, Pialba QLD 4655<br>
  (07) 4122 3990&nbsp;&nbsp;|&nbsp;&nbsp;(07) 4128 1038<br>
  accounts@saueruniforms.com.au
</div>
<hr>
<div class="meta">Receipt:&nbsp;&nbsp;${receiptNo}</div>
<div class="meta">Date:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${dateStr}</div>
<div class="meta">Time:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${timeStr}</div>
<hr>
<table>
  <thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead>
  <tbody>${itemRows}</tbody>
</table>
<hr>
<table class="totals">
  <tr><td>Subtotal (ex GST)</td><td class="right">${m(this.subtotal())}</td></tr>
  <tr><td>GST (10%)</td><td class="right">${m(this.gst())}</td></tr>
  <tr class="bold"><td>TOTAL</td><td class="right">${m(this.saleTotal())}</td></tr>
  ${pmtRows}
</table>
<hr>
<div class="footer">Thank you for your purchase!</div>
<script>document.fonts.ready.then(()=>{window.print();})</script>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    window.open(url, '_blank', 'width=420,height=600,toolbar=0,menubar=0');
  }
}

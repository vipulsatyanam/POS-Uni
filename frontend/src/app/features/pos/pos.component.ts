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
    <div class="flex flex-col h-full">

      <!-- ── POS Header: Park Sale / Retrieve Sale / More options ────────── -->
      <div class="flex items-center justify-end px-4 lg:px-6 shrink-0 gap-6 relative bg-slate-50" style="height:40px">
        <button
          class="flex items-center gap-1.5 text-sm leading-5 text-slate-600 hover:text-slate-900 transition-colors font-normal"
          (click)="parkSale()"
        >
          <svg class="shrink-0 w-4 h-4" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3M3.22302 14C4.13247 18.008 7.71683 21 12 21c4.9706 0 9-4.0294 9-9 0-4.97056-4.0294-9-9-9-3.72916 0-6.92858 2.26806-8.29409 5.5M7 9H3V5"/>
          </svg>
          Park Sale
        </button>
        <button
          class="flex items-center gap-1.5 text-sm leading-5 text-slate-600 hover:text-slate-900 transition-colors font-normal"
          (click)="retrieveSaleModal.set(true)"
        >
          <svg class="shrink-0 w-4 h-4" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 9H8a5 5 0 0 0 0 10h9m4-10-4-4m4 4-4 4"/>
          </svg>
          Retrieve Sale
        </button>
        <div class="relative">
          <button
            class="flex items-center gap-1 text-sm leading-5 text-slate-600 hover:text-slate-900 transition-colors font-normal"
            (click)="moreOptionsOpen.set(!moreOptionsOpen())"
          >
            <svg class="shrink-0 w-2 h-2" viewBox="0 0 10 10"><polygon points="0,0 10,0 5,8" fill="currentColor"/></svg>
            More options
          </button>
          @if (moreOptionsOpen()) {
            <div class="fixed inset-0" style="z-index:48" (click)="moreOptionsOpen.set(false)"></div>
            <div class="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl w-44 py-1" style="z-index:49">
              <button
                class="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-red-500 hover:bg-gray-50 transition-colors font-normal"
                (click)="moreOptionsOpen.set(false); clearCartModal.set(true)"
              >
                <svg class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                  <path fill-rule="evenodd" d="M8.586 2.586A2 2 0 0 1 10 2h4a2 2 0 0 1 2 2v2h3a1 1 0 1 1 0 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a1 1 0 0 1 0-2h3V4a2 2 0 0 1 .586-1.414ZM10 6h4V4h-4v2Zm1 4a1 1 0 1 0-2 0v8a1 1 0 1 0 2 0v-8Zm4 0a1 1 0 1 0-2 0v8a1 1 0 1 0 2 0v-8Z" clip-rule="evenodd"/>
                </svg>
                Clear Cart
              </button>
            </div>
          }
        </div>
      </div>

      <!-- ── Two-column panels ───────────────────────────────────────────── -->
      <div class="flex flex-col lg:flex-row gap-5 flex-1 min-h-0 overflow-hidden p-2 sm:p-5 sm:py-0">

      <!-- ── LEFT: Search Panel ──────────────────────────────────────────── -->
      <div class="flex-1 flex flex-col min-w-0">

        <!-- Search input -->
        <div class="px-5 pt-4 pb-0">
          <div class="relative" style="z-index:40">
            <div class="absolute inset-y-0 left-0 flex items-center pointer-events-none z-20 pl-3.5">
              <svg class="shrink-0 w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.3-4.3"/>
              </svg>
            </div>
            <input
              [formControl]="searchCtrl"
              type="text"
              role="combobox"
              aria-expanded="true"
              autocomplete="off"
              placeholder="Search products or start scanning"
              class="py-4 pl-10 pr-4 block w-full border-gray-400 border rounded-lg sm:text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:pointer-events-none"
              (focus)="dropdownOpen.set(true)"
              (keydown.escape)="dropdownOpen.set(false)"
            />
            @if (searchCtrl.value) {
              <button
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                (click)="searchCtrl.setValue('')"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            }

            <!-- Backdrop -->
            @if (dropdownOpen()) {
              <div class="fixed inset-0" style="z-index:38" (click)="dropdownOpen.set(false)"></div>
            }

            <!-- Dropdown panel -->
            @if (dropdownOpen()) {
              <div
                class="absolute left-0 right-0 top-full bg-white border border-gray-200 rounded-lg shadow-xl overflow-y-auto"
                style="z-index:39; max-height:24rem; margin-top:5px"
              >
              @if (loading()) {
                <div class="flex items-center justify-center gap-2 py-10 text-gray-400">
                  <div class="spinner"></div>
                  <span class="text-sm">Loading products…</span>
                </div>
              } @else if (groupedProducts().length === 0) {
                <div class="py-10 text-center text-sm text-gray-400">
                  {{ searchCtrl.value ? 'No results found' : 'No products yet' }}
                </div>
              } @else {
                @for (group of groupedProducts(); track group.category) {
                  <div class="text-xs uppercase text-gray-500 mx-3 mt-3 mb-1">
                    {{ group.category }}
                  </div>
                  @for (product of group.items; track product.id) {
                    <button
                      class="flex items-center justify-between cursor-pointer py-2 px-4 w-full text-sm text-gray-800 hover:bg-gray-100 text-left transition-colors"
                      (mousedown)="pickProduct(product)"
                    >
                      <div class="flex items-center gap-x-3">
                        <div class="flex items-center justify-center rounded-full bg-gray-200 size-8 overflow-hidden shrink-0">
                          @if (product.imageUrl) {
                            <img
                              [src]="resolveImageUrl(product.imageUrl)"
                              [alt]="product.name"
                              class="shrink-0 w-full h-full object-cover"
                            />
                          } @else {
                            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="1.5"/>
                              <circle cx="8.5" cy="8.5" r="1.5" stroke-width="1.5"/>
                              <polyline points="21 15 16 10 5 21" stroke-width="1.5"/>
                            </svg>
                          }
                        </div>
                        <div>
                          <div class="text-base font-medium text-gray-800 leading-tight tracking-wide">{{ product.name }}</div>
                          <div class="text-xs text-gray-500 dark:text-neutral-400">{{ product.sku }}</div>
                        </div>
                      </div>
                      <div class="flex items-center gap-x-3">
                        <span class="text-base font-semibold text-gray-800 tracking-wide">{{ product.price | currency }}</span>
                        @if (isInCart(product.id)) {
                          <svg class="shrink-0 size-3.5 text-blue-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        }
                      </div>
                    </button>
                  }
                }
              }
              </div>
            }
          </div>
        </div>

        <!-- Quick-action tiles -->
        <div class="px-5 pb-5 pt-5 flex flex-wrap gap-3">
          <button
            class="w-36 h-24 rounded-xl text-white text-sm font-semibold flex items-center justify-center text-center leading-tight shadow-sm hover:opacity-90 transition-opacity"
            style="background-color:#3b82f6"
            (click)="openInvoicePaymentModal()"
          >Invoice<br>Payment</button>
          <button
            class="w-36 h-24 rounded-xl text-white text-sm font-semibold flex items-center justify-center text-center leading-tight shadow-sm hover:opacity-90 transition-opacity"
            style="background-color:#a855f7"
            (click)="workClothesStep.set(1); workClothesModal.set(true)"
          >Work<br>Clothes</button>
        </div>
      </div>

      <!-- ── RIGHT: Cart Panel ───────────────────────────────────────────── -->
      <div class="w-full lg:w-[636px] shrink-0 flex flex-col lg:h-full lg:min-h-0">

        <!-- White card: Customer + Items + ADD row -->
        <div class="flex flex-col px-5 pt-4 border border-gray-200 bg-white rounded-xl shadow-sm flex-1 min-h-0 overflow-hidden">

          <!-- Add Customer (input with filled person icon) -->
          <div class="relative mb-5">
            <div class="absolute inset-y-0 left-0 flex items-center pointer-events-none z-20 pl-3.5">
              <svg class="shrink-0 w-6 h-6 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                <path fill-rule="evenodd" d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2 9a4 4 0 0 0-4 4v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1a4 4 0 0 0-4-4h-4Z" clip-rule="evenodd"/>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Add Customer"
              class="py-4 pl-10 pr-4 block w-full border border-gray-400 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:pointer-events-none"
            />
          </div>

          <!-- Items list (scrollable) -->
          <div class="flex-1 overflow-y-auto" style="min-height:200px">
            @if (cartSvc.items().length === 0) {
              <div class="text-center text-gray-400 py-10">No items added yet</div>
            } @else {
              @for (item of cartSvc.items(); track item.id) {
                <div class="border-b border-gray-200 py-3 px-2 hover:bg-gray-50 transition-colors">

                  <!-- Accordion header -->
                  <div
                    class="flex items-center gap-2 cursor-pointer select-none"
                    (click)="toggleCartItem(item.id)"
                  >
                    <!-- Chevron -->
                    <button class="shrink-0 text-gray-300 hover:text-blue-500 transition-colors pointer-events-none" title="Edit">
                      <svg
                        class="w-6 h-6"
                        [style.transform]="expandedCartItemId() === item.id ? 'rotate(90deg)' : 'rotate(0deg)'"
                        style="transition: transform 0.2s"
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
                      </svg>
                    </button>

                    <!-- Qty -->
                    <span class="text-xl font-semibold text-gray-700 w-8 text-center shrink-0">{{ item.quantity }}</span>

                    <!-- Name + SKU/variant -->
                    <div class="flex-1 min-w-0">
                      <h3 class="text-base font-semibold text-gray-800 truncate leading-tight">{{ item.productName }}</h3>
                      <p class="text-sm text-gray-500 truncate mt-0.5">
                        {{ item.productSku }}{{ item.variant.size ? ' · ' + item.variant.size : '' }}{{ item.variant.color ? ' · ' + item.variant.color : '' }}
                      </p>
                    </div>

                    <!-- Line total -->
                    <span class="text-xl font-semibold text-gray-800 shrink-0">{{ getItemBasePrice(item) * item.quantity | number:'1.2-2' }}</span>

                    <!-- Trash (filled icon) -->
                    <button
                      class="shrink-0 text-gray-500 hover:text-red-700 transition-colors"
                      (click)="$event.stopPropagation(); cartSvc.remove(item.id)"
                    >
                      <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                        <path fill-rule="evenodd" d="M8.586 2.586A2 2 0 0 1 10 2h4a2 2 0 0 1 2 2v2h3a1 1 0 1 1 0 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a1 1 0 0 1 0-2h3V4a2 2 0 0 1 .586-1.414ZM10 6h4V4h-4v2Zm1 4a1 1 0 1 0-2 0v8a1 1 0 1 0 2 0v-8Zm4 0a1 1 0 1 0-2 0v8a1 1 0 1 0 2 0v-8Z" clip-rule="evenodd"/>
                      </svg>
                    </button>
                  </div>

                  <!-- Expanded body -->
                  @if (expandedCartItemId() === item.id) {
                    <div class="mt-4 pt-4 border-t border-gray-100">

                      <!-- 3-column grid: Quantity | Price | Discount(%) -->
                      <div class="grid grid-cols-3 gap-3 mb-4">

                        <!-- Quantity -->
                        <div>
                          <label class="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                          <input
                            type="number"
                            step="1"
                            min="1"
                            class="w-full px-3 py-3 text-base rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:border-blue-500 transition-colors"
                            [value]="item.quantity"
                            (change)="cartSvc.setQuantity(item.id, +$any($event.target).value)"
                          />
                        </div>

                        <!-- Price -->
                        <div>
                          <label class="block text-sm font-semibold text-gray-700 mb-2">Price</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            readonly
                            class="w-full px-3 py-3 text-base rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:border-blue-500 transition-colors"
                            [value]="(item.productPrice + (item.variant.priceAdjustment ?? 0)).toFixed(2)"
                          />
                        </div>

                        <!-- Discount % -->
                        <div>
                          <label class="block text-sm font-semibold text-gray-700 mb-2">Discount (%)</label>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            max="100"
                            class="w-full px-3 py-3 text-base rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:border-blue-500 transition-colors"
                            [value]="item.discountType === 'percentage' ? (item.discountValue ?? 0) : 0"
                            (change)="applyInlineDiscount(item.id, $any($event.target).value)"
                          />
                        </div>
                      </div>

                      <!-- Note -->
                      <div class="mb-3">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Note</label>
                        <textarea
                          rows="2"
                          placeholder="Enter a note about this product"
                          class="w-full px-3 py-3 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                          [value]="item.note || ''"
                          (change)="cartSvc.setItemNote(item.id, $any($event.target).value)"
                        ></textarea>
                      </div>

                      <!-- Save label -->
                      <div class="flex justify-between items-center pb-2">
                        @if (item.discountType === 'percentage' && item.discountValue) {
                          <p class="text-xs text-green-500 font-medium">Save {{ getItemDiscount(item) | currency }}</p>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            }
            @if (cartSvc.cartDiscountValue()) {
              <div class="border-b border-gray-200 py-3 px-2">
                <div class="flex items-center gap-2">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <h3 class="text-base font-semibold text-gray-800">
                        Discount {{ cartSvc.cartDiscountType() === 'percentage' ? cartSvc.cartDiscountValue() + '%' : ('$' + cartSvc.cartDiscountValue()) }}
                      </h3>
                      <span class="inline-flex items-center gap-x-1 py-1 px-2 rounded-full text-xs font-medium bg-green-100 text-green-800">DISCOUNT</span>
                    </div>
                    <p class="text-sm text-gray-500">Type: {{ cartSvc.cartDiscountType() === 'percentage' ? 'Percentage' : 'Fixed Amount' }}</p>
                    @if (cartSvc.cartDiscountDesc()) {
                      <p class="text-sm text-gray-400">{{ cartSvc.cartDiscountDesc() }}</p>
                    }
                  </div>
                  <span class="text-xl font-semibold shrink-0 text-green-600">-{{ cartSvc.cartDiscountAmount() | number:'1.2-2' }}</span>
                  <button class="shrink-0 text-gray-500 hover:text-red-700" (click)="cartSvc.removeCartDiscount()">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path fill-rule="evenodd" d="M8.586 2.586A2 2 0 0 1 10 2h4a2 2 0 0 1 2 2v2h3a1 1 0 1 1 0 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a1 1 0 0 1 0-2h3V4a2 2 0 0 1 .586-1.414ZM10 6h4V4h-4v2Zm1 4a1 1 0 1 0-2 0v8a1 1 0 1 0 2 0v-8Zm4 0a1 1 0 1 0-2 0v8a1 1 0 1 0 2 0v-8Z" clip-rule="evenodd"/>
                    </svg>
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- ADD | Discount | Promo Code | Note -->
          <div class="shrink-0 py-4 border-t border-gray-100">
            <div class="flex flex-nowrap justify-between items-center">
              <h2 class="text-gray-800 font-bold">ADD</h2>
              <div class="flex items-center gap-x-5">
                <p
                  class="text-gray-500 font-normal cursor-pointer hover:text-gray-700"
                  (click)="openDiscountModal()"
                >Discount</p>
                <p
                  class="text-gray-500 font-normal cursor-pointer hover:text-gray-700"
                  (click)="openPromoCodeModal()"
                >Promo Code</p>
                <p
                  class="text-blue-500 font-normal cursor-pointer hover:text-gray-700"
                  (click)="openNoteModal()"
                >Note</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Tender button -->
        <button
          class="bg-blue-500 text-white px-4 rounded-lg w-full hover:bg-blue-600 transition-colors mt-3 mb-3 flex justify-between items-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed" style="height:76px"
          [disabled]="cartSvc.items().length === 0"
          (click)="enterCheckout()"
        >
          <span class="text-base font-semibold">Tender ({{ cartSvc.count() }} Item{{ cartSvc.count() !== 1 ? 's' : '' }})</span>
          <span class="text-base font-semibold">{{ cartSvc.total() | currency }}</span>
        </button>
      </div>

      </div><!-- end two-column panels -->
    </div><!-- end outer flex-col -->
    }<!-- end @else (normal POS mode) -->

    <!-- ── Work Clothes Modal ────────────────────────────────────────────── -->
    @if (workClothesModal()) {
      <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        (click)="closeWorkClothesModal()"
      >
        <div class="w-full max-w-lg flex flex-col bg-white border border-gray-200 shadow-2xl rounded-xl" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="flex justify-between items-center py-3 px-4 border-b border-gray-200">
            <h3 class="font-bold text-gray-800">
              @if (workClothesStep() === 1) { Enter Product Details }
              @else if (workClothesStep() === 2) { Enter Size }
              @else if (workClothesStep() === 3) { Enter Colour }
              @else { Select Quantity }
            </h3>
            <button
              type="button"
              class="size-8 inline-flex justify-center items-center rounded-full border border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200 focus:outline-none"
              (click)="closeWorkClothesModal()"
            >
              <svg class="shrink-0 size-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
          </div>
          <!-- Body -->
          <div class="p-4 space-y-4">

            <!-- Step 1: Name + Price -->
            @if (workClothesStep() === 1) {
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Work Shirt, Safety Vest"
                  class="py-3 px-4 block w-full border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  [value]="workClothesName()"
                  (input)="workClothesName.set($any($event.target).value)"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Price *</label>
                <input
                  type="text"
                  placeholder="$0.00"
                  class="py-3 px-4 block w-full border-2 border-gray-300 rounded-lg text-2xl font-bold text-left focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                  [value]="workClothesPrice()"
                  (input)="workClothesPrice.set($any($event.target).value)"
                />
              </div>
              <div class="pt-2">
                <button
                  type="button"
                  class="w-full py-4 px-6 inline-flex justify-center items-center text-lg font-semibold rounded-lg bg-purple-600 text-white hover:bg-purple-700 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  [disabled]="!workClothesName().trim() || !workClothesPrice().trim()"
                  (click)="workClothesStep.set(2)"
                >Next</button>
              </div>
            } @else if (workClothesStep() === 2) {
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Size *</label>
                <input
                  type="text"
                  placeholder="e.g., S, M, L, XL"
                  class="py-3 px-4 block w-full border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                  [value]="workClothesSize()"
                  (input)="workClothesSize.set($any($event.target).value)"
                />
              </div>
              <div class="pt-4">
                <button
                  type="button"
                  class="w-full py-4 px-6 inline-flex justify-center items-center text-lg font-semibold rounded-lg border border-transparent bg-purple-600 text-white hover:bg-purple-700 focus:outline-none focus:bg-purple-700 disabled:opacity-50 disabled:pointer-events-none"
                  [disabled]="!workClothesSize().trim()"
                  (click)="workClothesStep.set(3)"
                >Next</button>
              </div>
            } @else if (workClothesStep() === 3) {
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Colour *</label>
                <input
                  type="text"
                  placeholder="e.g., Navy, Black, Hi-Vis"
                  class="py-3 px-4 block w-full border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                  [value]="workClothesColour()"
                  (input)="workClothesColour.set($any($event.target).value)"
                />
              </div>
              <div class="pt-4">
                <button
                  type="button"
                  class="w-full py-4 px-6 inline-flex justify-center items-center text-lg font-semibold rounded-lg border border-transparent bg-purple-600 text-white hover:bg-purple-700 focus:outline-none focus:bg-purple-700 disabled:opacity-50 disabled:pointer-events-none"
                  [disabled]="!workClothesColour().trim()"
                  (click)="workClothesStep.set(4)"
                >Next</button>
              </div>
            } @else {
              <div class="flex flex-col gap-6">
                <div class="flex items-center justify-center">
                  <div class="py-4 px-6 inline-block bg-white border-2 border-gray-300 rounded-lg">
                    <div class="flex items-center gap-x-3">
                      <button
                        type="button"
                        class="size-16 inline-flex justify-center items-center gap-x-2 text-xl font-medium rounded-lg border-2 border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none disabled:opacity-50"
                        (click)="workClothesQty.set(Math.max(1, workClothesQty() - 1))"
                      >
                        <svg class="shrink-0 size-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14"/></svg>
                      </button>
                      <input
                        type="number"
                        class="p-0 w-16 bg-transparent border-0 text-gray-800 text-center text-2xl font-bold focus:ring-0"
                        [value]="workClothesQty()"
                        (input)="workClothesQty.set(Math.max(1, +$any($event.target).value || 1))"
                      />
                      <button
                        type="button"
                        class="size-16 inline-flex justify-center items-center gap-x-2 text-xl font-medium rounded-lg border-2 border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none disabled:opacity-50"
                        (click)="workClothesQty.set(workClothesQty() + 1)"
                      >
                        <svg class="shrink-0 size-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  class="py-4 px-6 inline-flex justify-center items-center text-lg font-semibold rounded-lg bg-purple-600 text-white hover:bg-purple-700 focus:outline-none transition-colors"
                  (click)="addWorkClothesItem()"
                >Add to Cart</button>
              </div>
            }

          </div>
        </div>
      </div>
    }

    <!-- ── Empty Cart Modal (Park Sale) ──────────────────────────────────── -->
    @if (emptyCartModal()) {
      <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        (click)="emptyCartModal.set(false)"
      >
        <div class="w-full max-w-sm flex flex-col bg-white border border-gray-200 shadow-2xl rounded-xl" (click)="$event.stopPropagation()">
          <div class="p-6 text-center">
            <svg class="shrink-0 size-10 text-gray-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"/>
            </svg>
            <h3 class="text-lg font-bold text-gray-800 mb-2">Cart is Empty</h3>
            <p class="text-sm text-gray-500">Add items to the cart before parking a sale.</p>
          </div>
          <div class="flex justify-center pb-6 px-6">
            <button
              type="button"
              class="py-2.5 px-6 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors focus:outline-none"
              (click)="emptyCartModal.set(false)"
            >Got it</button>
          </div>
        </div>
      </div>
    }

    <!-- ── Park Sale Modal ────────────────────────────────────────────────── -->
    @if (parkSaleModal()) {
      <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        (click)="parkSaleModal.set(false)"
      >
        <div class="w-full max-w-lg flex flex-col bg-white border border-gray-200 shadow-2xl rounded-xl" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="flex justify-between items-center py-3 px-4 border-b border-gray-200">
            <h3 class="font-bold text-lg text-gray-800">Park Sale</h3>
            <button
              type="button"
              class="size-8 inline-flex justify-center items-center rounded-full border border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200 focus:outline-none"
              (click)="parkSaleModal.set(false)"
            >
              <svg class="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
          </div>
          <!-- Body -->
          <div class="p-5">
            <p class="text-gray-700 mb-4">You are about to park this sale. Add a note so it can be identified by the next person who continues this sale.</p>
            <textarea
              rows="4"
              placeholder="e.g. Customer coming back after lunch, waiting on size confirmation..."
              class="w-full px-3 py-3 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors resize-none mb-3"
              [value]="parkSaleNote()"
              (input)="parkSaleNote.set($any($event.target).value)"
            ></textarea>
            <p class="text-xs text-gray-400 mb-5">Notes can help identify a sale in the future or contain information that can help complete the sale.</p>
            <div class="flex gap-3">
              <button
                type="button"
                class="flex-1 py-2.5 px-4 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                (click)="parkSaleModal.set(false)"
              >Cancel</button>
              <button
                type="button"
                class="flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                (click)="confirmParkSale()"
              >Park Sale</button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ── Retrieve Sale Modal ───────────────────────────────────────────── -->
    @if (retrieveSaleModal()) {
      <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        (click)="retrieveSaleModal.set(false)"
      >
        <div class="w-full max-w-lg flex flex-col bg-white border border-gray-200 shadow-2xl rounded-xl" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="flex justify-between items-center py-3 px-5 border-b border-gray-200">
            <div>
              <h3 class="font-bold text-lg text-gray-800">Parked Sales</h3>
              <p class="text-xs text-gray-400 mt-0.5">Select a sale to continue</p>
            </div>
            <button
              type="button"
              class="size-8 inline-flex justify-center items-center rounded-full border border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200 focus:outline-none"
              (click)="retrieveSaleModal.set(false)"
            >
              <svg class="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
          </div>

          <!-- Sale List -->
          <div class="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
            @if (parkedSales().length === 0) {
              <div class="p-10 text-center">
                <div class="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0-4-4m4 4-4 4"/>
                  </svg>
                </div>
                <p class="text-sm font-medium text-gray-500">No parked sales</p>
                <p class="text-xs text-gray-400 mt-1">Park a sale first to retrieve it here.</p>
              </div>
            } @else {
              @for (sale of parkedSales(); track sale.parkedAt; let i = $index) {
                <button
                  type="button"
                  class="w-full text-left flex items-start gap-4 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 transition-all group"
                  (click)="retrieveSale(i)"
                >
                  <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.4 6h12.8M7 13h10M9 21a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z"/>
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2 mb-0.5">
                      <p class="text-sm font-semibold text-gray-800 truncate">No customer</p>
                      <span class="text-sm font-bold text-blue-600 shrink-0">{{ sale.total | currency }}</span>
                    </div>
                    <p class="text-xs text-gray-500">{{ sale.items.length }} item{{ sale.items.length !== 1 ? 's' : '' }} &nbsp;·&nbsp; {{ sale.parkedAt | date:'M/d/yyyy, h:mm:ss a' }}</p>
                    @if (sale.note) {
                      <p class="text-xs text-gray-400 mt-1 italic truncate">"{{ sale.note }}"</p>
                    }
                  </div>
                  <svg class="w-4 h-4 text-gray-300 group-hover:text-blue-500 shrink-0 mt-1 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              }
            }
          </div>

          <!-- Footer -->
          <div class="px-5 py-3 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              class="py-2 px-4 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              (click)="retrieveSaleModal.set(false)"
            >Close</button>
          </div>
        </div>
      </div>
    }

    <!-- ── Clear Cart Confirmation Modal ──────────────────────────────────── -->
    @if (clearCartModal()) {
      <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        (click)="clearCartModal.set(false)"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center" (click)="$event.stopPropagation()">
          <!-- Trash icon -->
          <div class="mb-4">
            <svg class="w-12 h-12 text-red-400 mx-auto" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.4" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            </svg>
          </div>
          <h2 class="text-xl font-bold text-gray-900 mb-2">Clear Cart?</h2>
          <p class="text-sm text-gray-500 mb-8">All items in the cart will be removed. This cannot be undone.</p>
          <div class="flex gap-3 w-full">
            <button
              class="flex-1 py-3.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
              (click)="clearCartModal.set(false)"
            >Cancel</button>
            <button
              class="flex-1 py-3.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors"
              (click)="confirmClearCart()"
            >Clear Cart</button>
          </div>
        </div>
      </div>
    }

    <!-- ── Invoice Payment Modal ──────────────────────────────────────────── -->
    @if (invoicePaymentModal()) {
      <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        (click)="invoicePaymentModal.set(false)"
      >
        <div class="w-full max-w-lg flex flex-col bg-white border border-gray-200 shadow-2xs rounded-xl" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="flex justify-between items-center py-3 px-4 border-b border-gray-200">
            <h3 class="font-bold text-gray-800">Invoice Payment</h3>
            <button
              type="button"
              class="size-8 inline-flex justify-center items-center gap-x-2 rounded-full border border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200 focus:outline-none focus:bg-gray-200 disabled:opacity-50 disabled:pointer-events-none"
              (click)="invoicePaymentModal.set(false)"
            >
              <span class="sr-only">Close</span>
              <svg class="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6 6 18"/>
                <path d="m6 6 12 12"/>
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="p-6 overflow-y-auto">
            <div class="space-y-4">
              <!-- Invoice Reference -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Invoice Reference</label>
                <div class="flex">
                  <span class="inline-flex items-center px-4 text-sm font-semibold text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-s-lg select-none">SAU</span>
                  <input
                    type="text"
                    class="py-3 px-4 block w-full border border-gray-300 rounded-e-lg text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                    placeholder="Enter number"
                    [value]="invoiceRef()"
                    (input)="invoiceRef.set($any($event.target).value)"
                  />
                </div>
              </div>
              <!-- Total Amount -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Total Amount</label>
                <input
                  type="text"
                  class="py-3 px-4 block w-full border-2 border-gray-200 rounded-lg text-2xl font-bold text-left focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="$0.00"
                  [value]="invoiceAmountRaw()"
                  (input)="invoiceAmountRaw.set($any($event.target).value)"
                />
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex justify-end items-center gap-x-2 py-3 px-4 border-t border-gray-200">
            <button
              type="button"
              class="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-2xs hover:bg-gray-50 focus:outline-none focus:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
              (click)="invoicePaymentModal.set(false)"
            >Cancel</button>
            <button
              type="button"
              class="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
              (click)="applyInvoicePayment()"
            >Apply Payment</button>
          </div>
        </div>
      </div>
    }

    <!-- ── Variant Selection Modal (Size / Colour / Quantity) ─────────────── -->
    @if (pickStep() !== null) {
      <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        (click)="cancelVariantPick()"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg" (click)="$event.stopPropagation()">

          <!-- Breadcrumb + Close -->
          <div class="flex justify-between items-center py-3 px-4 border-b border-gray-200">
            <div class="flex items-center gap-1.5 text-md">

              <!-- Size crumb -->
              @if (pickStep() === 'size') {
                <span class="font-semibold text-gray-800">Size</span>
              } @else if (selectedSize()) {
                <button class="text-gray-400 hover:text-gray-600 hover:underline" (click)="goBackToSize()">Size: {{ selectedSize() }}</button>
              } @else {
                <span class="text-gray-300">Size</span>
              }

              <svg class="shrink-0 size-3 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
              </svg>

              <!-- Colour crumb -->
              @if (pickStep() === 'color') {
                <span class="font-semibold text-gray-800">Colour</span>
              } @else if (selectedColor()) {
                <button class="text-gray-400 hover:text-gray-600 hover:underline" (click)="goBackToColor()">Colour: {{ selectedColor() }}</button>
              } @else {
                <span class="text-gray-300">Colour</span>
              }

              <svg class="shrink-0 size-3 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
              </svg>

              <!-- Quantity crumb -->
              @if (pickStep() === 'qty') {
                <span class="font-semibold text-gray-800">Quantity</span>
              } @else {
                <span class="text-gray-300">Quantity</span>
              }
            </div>

            <!-- Close button -->
            <button
              type="button"
              class="size-8 inline-flex justify-center items-center gap-x-2 rounded-full border border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200 focus:outline-none focus:bg-gray-200 disabled:opacity-50 disabled:pointer-events-none"
              (click)="cancelVariantPick()"
            >
              <span class="sr-only">Close</span>
              <svg class="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6 6 18"/>
                <path d="m6 6 12 12"/>
              </svg>
            </button>
          </div>

          <!-- ── Step content ── -->
          <div class="p-4">

          <!-- ── Size step ── -->
          @if (pickStep() === 'size') {
            <div class="grid grid-cols-3 gap-2">
              @for (size of allSizes(); track size) {
                <button
                  type="button"
                  class="py-5 px-4 inline-flex justify-center items-center text-base font-medium rounded-lg border-2 border-blue-600 bg-blue-500 text-white hover:bg-blue-700 focus:outline-none focus:bg-blue-700 focus:border-blue-700 disabled:opacity-50 disabled:pointer-events-none"
                  (click)="selectSize(size)"
                >{{ size }}</button>
              }
            </div>

            <!-- Add new value -->
            <div class="mt-3">
              @if (!showSizeInput()) {
                <a class="text-sm text-blue-600 hover:underline cursor-pointer" (click)="showSizeInput.set(true)">+ Add new value</a>
              } @else {
                <div class="mt-2 flex gap-2">
                  <input
                    #sizeInput
                    type="text"
                    placeholder="Enter value..."
                    class="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                    [value]="newSizeInput()"
                    (input)="newSizeInput.set($any($event.target).value)"
                    (keydown.enter)="addCustomSize()"
                  />
                  <button
                    type="button"
                    class="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none transition-colors"
                    (click)="addCustomSize()"
                  >Add</button>
                </div>
              }
            </div>
          }

          <!-- ── Colour step ── -->
          @if (pickStep() === 'color') {
            <div class="grid grid-cols-3 gap-2">
              @for (color of allColors(); track color) {
                <button
                  type="button"
                  class="py-5 px-4 inline-flex justify-center items-center text-base font-medium rounded-lg border-2 border-blue-600 bg-blue-500 text-white hover:bg-blue-700 focus:outline-none focus:bg-blue-700 focus:border-blue-700 disabled:opacity-50 disabled:pointer-events-none"
                  (click)="selectColor(color)"
                >{{ color }}</button>
              }
            </div>

            <!-- Add new value -->
            <div class="mt-3">
              @if (!showColorInput()) {
                <a class="text-sm text-blue-600 hover:underline cursor-pointer" (click)="showColorInput.set(true)">+ Add new value</a>
              } @else {
                <div class="mt-2 flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter value..."
                    class="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                    [value]="newColorInput()"
                    (input)="newColorInput.set($any($event.target).value)"
                    (keydown.enter)="addCustomColor()"
                  />
                  <button
                    type="button"
                    class="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none transition-colors"
                    (click)="addCustomColor()"
                  >Add</button>
                </div>
              }
            </div>
          }

          <!-- ── Quantity step ── -->
          @if (pickStep() === 'qty') {
            <div class="flex flex-col gap-6">
              <div class="flex items-center justify-center">
                <div class="py-4 px-6 inline-block bg-white border-2 border-gray-300 rounded-lg">
                  <div class="flex items-center gap-x-3">
                    <button
                      type="button"
                      class="size-16 inline-flex justify-center items-center gap-x-2 text-xl font-medium rounded-lg border-2 border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
                      [disabled]="pickQty() <= 1"
                      (click)="pickQty.set(pickQty() - 1)"
                      aria-label="Decrease"
                    >
                      <svg class="shrink-0 size-6" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M5 12h14"/>
                      </svg>
                    </button>
                    <input
                      type="number"
                      class="p-0 w-16 bg-transparent border-0 text-gray-800 text-center text-2xl font-bold focus:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      [value]="pickQty()"
                      (change)="pickQty.set(Math.max(1, +$any($event.target).value))"
                    />
                    <button
                      type="button"
                      class="size-16 inline-flex justify-center items-center gap-x-2 text-xl font-medium rounded-lg border-2 border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
                      (click)="pickQty.set(pickQty() + 1)"
                      aria-label="Increase"
                    >
                      <svg class="shrink-0 size-6" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M5 12h14"/>
                        <path d="M12 5v14"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              <button
                type="button"
                class="py-4 px-6 inline-flex justify-center items-center w-full text-lg font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
                (click)="confirmAddToCart()"
              >Add to Cart</button>
            </div>
          }

          </div><!-- end step content -->
        </div>
      </div>
    }

    <!-- ── Note Modal ───────────────────────────────────────────────────── -->
    @if (noteModal()) {
      <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        (click)="noteModal.set(false)"
      >
        <div class="w-full max-w-lg flex flex-col bg-white border border-gray-200 shadow-2xl rounded-xl" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="flex justify-between items-center py-3 px-4 border-b border-gray-200">
            <h3 class="font-bold text-gray-800">Add Note</h3>
            <button
              type="button"
              class="size-8 inline-flex justify-center items-center gap-x-2 rounded-full border border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200 focus:outline-none"
              (click)="noteModal.set(false)"
            >
              <svg class="shrink-0 size-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
          </div>
          <!-- Body -->
          <div class="p-6 overflow-y-auto">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Note</label>
                <textarea
                  rows="4"
                  placeholder="Add a note for this transaction..."
                  class="py-3 px-4 block w-full border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none resize-none"
                  [value]="noteInput()"
                  (input)="noteInput.set($any($event.target).value)"
                ></textarea>
              </div>
            </div>
          </div>
          <!-- Footer -->
          <div class="flex justify-end items-center gap-x-2 py-3 px-4 border-t border-gray-200">
            <button
              type="button"
              class="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 focus:outline-none"
              (click)="noteModal.set(false)"
            >Cancel</button>
            <button
              type="button"
              class="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:outline-none"
              (click)="saveNote()"
            >Save Note</button>
          </div>
        </div>
      </div>
    }

    <!-- ── Promo Code Modal ─────────────────────────────────────────────── -->
    @if (promoCodeModal()) {
      <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        (click)="promoCodeModal.set(false)"
      >
        <div class="w-full max-w-lg flex flex-col bg-white border border-gray-200 shadow-2xl rounded-xl" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="flex justify-between items-center py-3 px-4 border-b border-gray-200">
            <h3 class="font-bold text-gray-800">Apply Promo Code</h3>
            <button
              type="button"
              class="size-8 inline-flex justify-center items-center gap-x-2 rounded-full border border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200 focus:outline-none"
              (click)="promoCodeModal.set(false)"
            >
              <svg class="shrink-0 size-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
          </div>
          <!-- Body -->
          <div class="p-6 overflow-y-auto">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Promo Code</label>
                <input
                  type="text"
                  placeholder="Enter promo code"
                  class="py-3 px-4 block w-full border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none uppercase"
                  [value]="promoCodeInput()"
                  (input)="promoCodeInput.set($any($event.target).value.toUpperCase())"
                />
              </div>
            </div>
          </div>
          <!-- Footer -->
          <div class="flex justify-end items-center gap-x-2 py-3 px-4 border-t border-gray-200">
            <button
              type="button"
              class="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 focus:outline-none"
              (click)="promoCodeModal.set(false)"
            >Cancel</button>
            <button
              type="button"
              class="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:outline-none disabled:opacity-50 disabled:pointer-events-none"
              [disabled]="!promoCodeInput().trim()"
              (click)="applyPromoCode()"
            >Apply Code</button>
          </div>
        </div>
      </div>
    }

    <!-- ── Add Discount Modal ────────────────────────────────────────────── -->
    @if (discountModal()) {
      <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        (click)="discountModal.set(false)"
      >
        <div class="w-full max-w-lg flex flex-col bg-white border border-gray-200 shadow-2xl rounded-xl" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="flex justify-between items-center py-3 px-4 border-b border-gray-200">
            <h3 class="font-bold text-gray-800">Add Discount</h3>
            <button
              type="button"
              class="size-8 inline-flex justify-center items-center gap-x-2 rounded-full border border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200 focus:outline-none"
              (click)="discountModal.set(false)"
            >
              <svg class="shrink-0 size-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
          </div>
          <!-- Body -->
          <div class="p-6 overflow-y-auto">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Discount Type</label>
                <select
                  class="py-3 px-4 block w-full border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none bg-white"
                  [value]="discountType()"
                  (change)="discountType.set($any($event.target).value)"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Discount Value</label>
                <input
                  type="number"
                  placeholder="Enter discount value"
                  class="py-3 px-4 block w-full border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                  [value]="discountValueInput()"
                  (input)="discountValueInput.set($any($event.target).value)"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Holiday Sale, Member Discount"
                  class="py-3 px-4 block w-full border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                  [value]="discountDesc()"
                  (input)="discountDesc.set($any($event.target).value)"
                />
              </div>
            </div>
          </div>
          <!-- Footer -->
          <div class="flex justify-end items-center gap-x-2 py-3 px-4 border-t border-gray-200">
            <button
              type="button"
              class="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 focus:outline-none"
              (click)="discountModal.set(false)"
            >Cancel</button>
            <button
              type="button"
              class="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:outline-none disabled:opacity-50 disabled:pointer-events-none"
              (click)="applyDiscount()"
            >Apply Discount</button>
          </div>
        </div>
      </div>
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
  Math               = Math;
  private destroy$   = new Subject<void>();

  searchCtrl = new FormControl('');
  loading    = signal(true);
  products   = signal<Product[]>([]);

  // Search dropdown
  dropdownOpen = signal(false);

  // More options dropdown
  moreOptionsOpen = signal(false);

  // Empty cart modal (Park Sale)
  emptyCartModal  = signal(false);

  // Park Sale modal
  parkSaleModal = signal(false);
  parkSaleNote  = signal('');

  // Parked sales store
  parkedSales = signal<{ items: import('../../core/models/product.model').CartItem[]; note: string; total: number; parkedAt: Date }[]>([]);

  // Retrieve Sale modal
  retrieveSaleModal = signal(false);

  // Clear cart modal
  clearCartModal = signal(false);

  // Invoice payment modal
  invoicePaymentModal = signal(false);
  invoiceRef       = signal('');
  invoiceAmountRaw = signal('');

  // Work Clothes modal
  workClothesModal  = signal(false);
  workClothesStep   = signal(1);
  workClothesName   = signal('');
  workClothesPrice  = signal('');
  workClothesSize   = signal('');
  workClothesColour = signal('');
  workClothesQty    = signal(1);

  // Step-by-step variant selection
  selectingProduct = signal<Product | null>(null);
  pickStep         = signal<'size' | 'color' | 'qty' | null>(null);
  selectedSize     = signal<string | null>(null);
  selectedColor    = signal<string | null>(null);
  pickQty          = signal(1);

  // Custom values added during this transaction (not saved to backend)
  extraSizes     = signal<string[]>([]);
  extraColors    = signal<string[]>([]);
  showSizeInput  = signal(false);
  showColorInput = signal(false);
  newSizeInput   = signal('');
  newColorInput  = signal('');

  // Cart accordion
  expandedCartItemId = signal<string | null>(null);

  // Note modal
  noteModal = signal(false);
  noteInput = signal('');

  // Promo code modal
  promoCodeModal = signal(false);
  promoCodeInput = signal('');

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

  cashAmountDue   = computed(() => Math.ceil(this.amountToPayValue()));
  cashChange      = computed(() => Math.max(0, this.cashGiven() - this.cashAmountDue()));
  cashCanComplete = computed(() => this.cashGiven() >= this.cashAmountDue());

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
    const filtered = sz ? p.variants.filter(v => v.size === sz) : p.variants;
    const variants = filtered.length > 0 ? filtered : p.variants;
    return [...new Set(variants.map(v => v.color).filter((c): c is string => !!c))];
  });

  allSizes = computed(() => [...this.availableSizes(), ...this.extraSizes()]);
  allColors = computed(() => [...this.availableColors(), ...this.extraColors()]);

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
    this.extraSizes.set([]);
    this.extraColors.set([]);
    this.showSizeInput.set(false);
    this.showColorInput.set(false);
    this.newSizeInput.set('');
    this.newColorInput.set('');

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
    this.showSizeInput.set(false);
    this.newSizeInput.set('');
    const p = this.selectingProduct()!;
    let colors = [...new Set(p.variants.filter(v => v.size === size).map(v => v.color).filter((c): c is string => !!c))];
    if (colors.length === 0) {
      colors = [...new Set(p.variants.map(v => v.color).filter((c): c is string => !!c))];
    }
    this.pickStep.set(colors.length > 0 ? 'color' : 'qty');
  }

  selectColor(color: string) {
    this.selectedColor.set(color);
    this.showColorInput.set(false);
    this.newColorInput.set('');
    this.pickStep.set('qty');
  }

  addCustomSize() {
    const val = this.newSizeInput().trim();
    if (!val) return;
    this.extraSizes.update(arr => [...arr, val]);
    this.newSizeInput.set('');
    this.showSizeInput.set(false);
    this.selectSize(val);
  }

  addCustomColor() {
    const val = this.newColorInput().trim();
    if (!val) return;
    this.extraColors.update(arr => [...arr, val]);
    this.newColorInput.set('');
    this.showColorInput.set(false);
    this.selectColor(val);
  }

  goBackToSize() {
    this.selectedSize.set(null);
    this.selectedColor.set(null);
    this.extraSizes.set([]);
    this.extraColors.set([]);
    this.showSizeInput.set(false);
    this.newSizeInput.set('');
    this.pickStep.set('size');
  }

  goBackToColor() {
    this.selectedColor.set(null);
    this.extraColors.set([]);
    this.showColorInput.set(false);
    this.newColorInput.set('');
    this.pickStep.set('color');
  }

  cancelVariantPick() {
    this.selectingProduct.set(null);
    this.pickStep.set(null);
    this.selectedSize.set(null);
    this.selectedColor.set(null);
    this.pickQty.set(1);
    this.extraSizes.set([]);
    this.extraColors.set([]);
    this.showSizeInput.set(false);
    this.showColorInput.set(false);
    this.newSizeInput.set('');
    this.newColorInput.set('');
  }

  confirmAddToCart() {
    const product = this.selectingProduct();
    if (!product) return;
    const sz  = this.selectedSize();
    const col = this.selectedColor();
    let variant = product.variants.find(v =>
      (!sz || v.size === sz) && (!col || v.color === col)
    );

    if (!variant) {
      const base = product.variants.find(v => !sz || v.size === sz) ?? product.variants[0];
      if (!base) return;
      const customId = -Math.abs(
        Array.from(`${product.id}-${sz ?? ''}-${col ?? ''}`).reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)
      );
      variant = { ...base, id: customId, size: sz ?? base.size, color: col ?? base.color };
    }

    const qty = this.pickQty();
    this.cartSvc.add(product, variant, qty);
    this.toast.success(`"${product.name} · ${variant.sku}" ×${qty} added`);
    this.cancelVariantPick();
  }

  confirmClearCart() {
    this.cartSvc.clear();
    this.clearCartModal.set(false);
  }

  parkSale() {
    if (this.cartSvc.items().length === 0) {
      this.emptyCartModal.set(true);
      return;
    }
    this.parkSaleNote.set('');
    this.parkSaleModal.set(true);
  }

  confirmParkSale() {
    this.parkedSales.update(list => [...list, {
      items: [...this.cartSvc.items()],
      note: this.parkSaleNote(),
      total: this.cartSvc.total(),
      parkedAt: new Date()
    }]);
    this.cartSvc.clear();
    this.parkSaleModal.set(false);
    this.toast.success('Sale parked successfully');
  }

  retrieveSale(index: number) {
    const sale = this.parkedSales()[index];
    if (!sale) return;
    sale.items.forEach(item => this.cartSvc.addRaw(item));
    this.parkedSales.update(list => list.filter((_, i) => i !== index));
    this.retrieveSaleModal.set(false);
    this.toast.success('Sale retrieved');
  }

  openInvoicePaymentModal() {
    this.invoiceRef.set('');
    this.invoiceAmountRaw.set('');
    this.invoicePaymentModal.set(true);
  }

  applyInvoicePayment() {
    const ref = this.invoiceRef().trim();
    const amount = parseFloat(this.invoiceAmountRaw().replace(/[^0-9.]/g, ''));
    if (!ref) {
      this.toast.error('Please enter an invoice reference number');
      return;
    }
    if (!amount || amount <= 0) {
      this.toast.error('Please enter a valid amount');
      return;
    }
    const cartItem: CartItem = {
      id: `invoice-payment-${ref}-${Date.now()}`,
      productId: 0,
      productName: 'Invoice Payment',
      productSku: `Ref: SAU${ref}`,
      productPrice: amount,
      variant: { id: 0, sku: `SAU${ref}`, stock: 0 },
      quantity: 1
    };
    this.cartSvc.addRaw(cartItem);
    this.toast.success(`Invoice Payment SAU${ref} added`);
    this.invoicePaymentModal.set(false);
  }

  closeWorkClothesModal() {
    this.workClothesModal.set(false);
    this.workClothesStep.set(1);
    this.workClothesName.set('');
    this.workClothesPrice.set('');
    this.workClothesSize.set('');
    this.workClothesColour.set('');
    this.workClothesQty.set(1);
  }

  addWorkClothesItem() {
    const name   = this.workClothesName().trim();
    const price  = parseFloat(this.workClothesPrice().replace(/[^0-9.]/g, ''));
    const size   = this.workClothesSize().trim();
    const colour = this.workClothesColour().trim();
    const qty    = this.workClothesQty();
    if (!name || !price || price <= 0) return;
    const cartItem: CartItem = {
      id: `work-clothes-${Date.now()}`,
      productId: 0,
      productName: name,
      productSku: 'CUSTOM',
      productPrice: price,
      variant: { id: 0, sku: 'CUSTOM', size, color: colour, stock: 0 },
      quantity: qty
    };
    this.cartSvc.addRaw(cartItem);
    this.closeWorkClothesModal();
  }

  toggleCartItem(id: string) {
    this.expandedCartItemId.update(cur => cur === id ? null : id);
  }

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

  openNoteModal() {
    this.noteInput.set('');
    this.noteModal.set(true);
  }

  saveNote() {
    this.noteModal.set(false);
  }

  openPromoCodeModal() {
    this.promoCodeInput.set('');
    this.promoCodeModal.set(true);
  }

  applyPromoCode() {
    // Promo code logic to be implemented
    this.promoCodeModal.set(false);
  }

  openDiscountModal() {
    if (this.cartSvc.items().length === 0) return;
    this.discountType.set(this.cartSvc.cartDiscountType() ?? 'percentage');
    this.discountValueInput.set(this.cartSvc.cartDiscountValue()?.toString() ?? '');
    this.discountDesc.set(this.cartSvc.cartDiscountDesc() ?? '');
    this.discountModal.set(true);
  }

  applyDiscount() {
    const val = parseFloat(this.discountValueInput());
    if (isNaN(val) || val <= 0) return;
    this.cartSvc.setCartDiscount(this.discountType(), val, this.discountDesc() || undefined);
    this.discountModal.set(false);
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

  isInCart(productId: number): boolean {
    return this.cartSvc.items().some(i => i.productId === productId);
  }

  resolveImageUrl(url?: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${environment.apiUrl.replace(/\/api$/, '')}${url}`;
  }
}

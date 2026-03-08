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

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
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

                  <!-- Line total (original price, not discounted) -->
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

                <!-- Discount sub-row (always visible when discount applied) -->
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
              (click)="checkout()"
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
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold text-slate-900">Select Size</h2>
            <button
              class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              (click)="cancelVariantPick()"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="h-px bg-slate-100 my-2"></div>
          <div class="grid grid-cols-3 gap-x-3 gap-y-2">
            @for (size of availableSizes(); track size) {
              <button
                class="py-6 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-bold text-sm transition-all"
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
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold text-slate-900">Select Colour</h2>
            <button
              class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              (click)="cancelVariantPick()"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="h-px bg-slate-100 my-2"></div>
          <div class="grid grid-cols-3 gap-x-3 gap-y-2">
            @for (color of availableColors(); track color) {
              <button
                class="py-6 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-bold text-sm transition-all"
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

          <!-- Discount Type -->
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

          <!-- Discount Value -->
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

          <!-- Description -->
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

  checkout() {
    this.toast.info('Checkout coming soon');
  }

  resolveImageUrl(url?: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${environment.apiUrl.replace(/\/api$/, '')}${url}`;
  }
}

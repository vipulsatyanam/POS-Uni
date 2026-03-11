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
        <div class="px-4 py-4">
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
                          <div class="font-medium text-gray-800 leading-tight">{{ product.name }}</div>
                          <div class="text-xs text-gray-500 dark:text-neutral-400">{{ product.sku }}</div>
                        </div>
                      </div>
                      <div class="flex items-center gap-x-3">
                        <span class="font-semibold text-gray-800">{{ product.price | currency }}</span>
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
      <div class="w-full h-64 sm:h-72 lg:h-auto lg:w-[420px] shrink-0 flex flex-col">

        <!-- White card: Customer + Items + ADD row -->
        <div class="flex flex-col px-5 pt-4 border bg-white border-gray-200 rounded-xl shadow-xs flex-1 overflow-hidden">

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
          <div class="flex-1 overflow-y-auto -mx-5">
            @if (cartSvc.items().length === 0) {
              <div class="flex flex-col items-center justify-center h-full py-12 text-gray-400">
                <svg class="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
                <p class="text-sm font-medium text-gray-500">No items added yet</p>
                <p class="text-xs mt-1 text-gray-400">Search and select a product to add</p>
              </div>
            } @else {
              @for (item of cartSvc.items(); track item.id) {
                <div class="border-b border-gray-200 py-3 px-5 hover:bg-gray-50 transition-colors">

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
                    <span class="text-xl font-semibold text-gray-800 shrink-0">{{ getItemBasePrice(item) * item.quantity | currency }}</span>

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
          </div>

          <!-- ADD | Discount | Promo Code | Note -->
          <div class="mt-auto pb-3">
            <div class="flex flex-nowrap justify-between items-center mb-3 mt-5">
              <h2 class="text-gray-800 font-bold">ADD</h2>
              <div class="flex items-center gap-x-5">
                <p
                  class="text-gray-500 font-normal cursor-pointer hover:text-gray-700"
                  (click)="openDiscountModal()"
                >Discount</p>
                <p class="text-gray-500 font-normal cursor-pointer hover:text-gray-700">Promo Code</p>
                <p class="text-blue-500 font-normal cursor-pointer hover:text-gray-700">Note</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Tender button (outside white card) -->
        <button
          class="bg-blue-500 text-white px-4 py-6 rounded-md w-full hover:bg-blue-600 transition-colors mt-5 flex justify-between items-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          [disabled]="cartSvc.items().length === 0"
          (click)="checkout()"
        >
          <span>Tender ({{ cartSvc.count() }} Item{{ cartSvc.count() !== 1 ? 's' : '' }})</span>
          <span class="text-lg font-semibold">{{ cartSvc.total() | currency }}</span>
        </button>
      </div>
    </div>

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
  Math               = Math;
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

  // Custom values added during this transaction (not saved to backend)
  extraSizes     = signal<string[]>([]);
  extraColors    = signal<string[]>([]);
  showSizeInput  = signal(false);
  showColorInput = signal(false);
  newSizeInput   = signal('');
  newColorInput  = signal('');

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
    const filtered = sz ? p.variants.filter(v => v.size === sz) : p.variants;
    // If selected size is custom (no matching variants), fall back to all product colors
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
    // Custom size not in any variant — fall back to all product colors
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

    // Custom size/color not in backend — use best matching variant but override displayed values
    if (!variant) {
      const base = product.variants.find(v => !sz || v.size === sz) ?? product.variants[0];
      if (!base) return;
      // Generate a deterministic pseudo-ID so the custom combo gets its own cart slot
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

  isInCart(productId: number): boolean {
    return this.cartSvc.items().some(i => i.productId === productId);
  }

  resolveImageUrl(url?: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${environment.apiUrl.replace(/\/api$/, '')}${url}`;
  }
}

import {
  Component, inject, OnInit, OnDestroy, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../core/services/toast.service';
import { Product, ProductVariant } from '../../core/models/product.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="flex gap-4 h-[calc(100vh-3.5rem-2rem)]">

      <!-- ── LEFT: Product List ──────────────────────────────────────────── -->
      <div class="flex-1 flex flex-col min-w-0 bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">

        <!-- Search bar -->
        <div class="px-4 py-3 border-b border-slate-100">
          <div class="relative max-w-sm">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
            </svg>
            <input
              [formControl]="searchCtrl"
              type="text"
              placeholder="Search products…"
              class="field-input pl-9 !py-2"
            />
            @if (searchCtrl.value) {
              <button
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                (click)="searchCtrl.setValue('')"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            }
          </div>
        </div>

        <!-- Product table -->
        <div class="overflow-auto flex-1">
          @if (loading()) {
            <div class="flex items-center justify-center py-20">
              <div class="flex flex-col items-center gap-3 text-slate-400">
                <div class="spinner !border-t-brand-500 !border-slate-200 !w-8 !h-8 !border-[3px]"></div>
                <span class="text-sm">Loading products…</span>
              </div>
            </div>
          } @else if (products().length === 0) {
            <div class="flex flex-col items-center py-16 text-slate-400">
              <svg class="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                      d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
              </svg>
              <p class="text-sm font-semibold text-slate-600">
                {{ searchCtrl.value ? 'No results found' : 'No products yet' }}
              </p>
            </div>
          } @else {
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:52px">Image</th>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th class="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                @for (product of products(); track product.id) {
                  <tr>
                    <td>
                      @if (product.imageUrl) {
                        <img
                          [src]="resolveImageUrl(product.imageUrl)"
                          [alt]="product.name"
                          class="w-9 h-9 rounded-lg object-cover border border-slate-100"
                        />
                      } @else {
                        <div class="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                          <svg class="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="1.5"/>
                            <circle cx="8.5" cy="8.5" r="1.5" stroke-width="1.5"/>
                            <polyline points="21 15 16 10 5 21" stroke-width="1.5"/>
                          </svg>
                        </div>
                      }
                    </td>
                    <td><span class="sku-badge">{{ product.sku }}</span></td>
                    <td>
                      <p class="font-semibold text-slate-900 text-sm">{{ product.name }}</p>
                    </td>
                    <td>
                      @if (product.categoryName) {
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          {{ product.categoryName }}
                        </span>
                      } @else {
                        <span class="text-slate-300 text-sm">—</span>
                      }
                    </td>
                    <td>
                      <span class="text-sm font-bold text-slate-900">{{ product.price | currency }}</span>
                    </td>
                    <td class="text-right">
                      <button
                        class="btn-icon hover:!text-brand-600 hover:!bg-brand-50"
                        title="Add to Cart"
                        (click)="startAddToCart(product)"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </div>

      <!-- ── RIGHT: Cart Panel ───────────────────────────────────────────── -->
      <div class="w-80 shrink-0 flex flex-col bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">

        <!-- Cart header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
          <p class="text-sm font-semibold text-slate-800">
            Cart
            @if (cartSvc.count() > 0) {
              <span class="ml-1.5 text-xs font-normal text-slate-400">
                ({{ cartSvc.count() }} item{{ cartSvc.count() !== 1 ? 's' : '' }})
              </span>
            }
          </p>
          @if (cartSvc.items().length > 0) {
            <button
              class="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
              (click)="cartSvc.clear()"
            >
              Clear all
            </button>
          }
        </div>

        <!-- Items list -->
        <div class="flex-1 overflow-y-auto">
          @if (cartSvc.items().length === 0) {
            <div class="flex flex-col items-center justify-center h-full py-12 text-slate-400">
              <svg class="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              <p class="text-sm font-medium text-slate-500">No items added yet</p>
              <p class="text-xs mt-1">Click + on a product to add</p>
            </div>
          } @else {
            <div class="divide-y divide-slate-50">
              @for (item of cartSvc.items(); track item.id) {
                <div class="flex items-start gap-2.5 px-4 py-3 hover:bg-slate-50 transition-colors">

                  <!-- Image -->
                  @if (item.productImageUrl) {
                    <img [src]="resolveImageUrl(item.productImageUrl)"
                         class="w-9 h-9 rounded-lg object-cover border border-slate-100 shrink-0 mt-0.5" />
                  } @else {
                    <div class="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                      <svg class="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="1.5"/>
                        <circle cx="8.5" cy="8.5" r="1.5" stroke-width="1.5"/>
                        <polyline points="21 15 16 10 5 21" stroke-width="1.5"/>
                      </svg>
                    </div>
                  }

                  <!-- Details -->
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-semibold text-slate-800 truncate">{{ item.productName }}</p>
                    <p class="text-[10px] font-mono text-slate-400 truncate">{{ item.variant.sku }}</p>
                    @if (item.variant.size || item.variant.color) {
                      <div class="flex gap-1 mt-0.5">
                        @if (item.variant.size) {
                          <span class="text-[10px] px-1 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">{{ item.variant.size }}</span>
                        }
                        @if (item.variant.color) {
                          <span class="text-[10px] px-1 py-0.5 rounded bg-purple-50 text-purple-700 font-medium">{{ item.variant.color }}</span>
                        }
                      </div>
                    }
                    <!-- Qty stepper -->
                    <div class="flex items-center gap-1 mt-1.5">
                      <div class="flex items-center border border-slate-200 rounded overflow-hidden">
                        <button
                          class="w-6 h-6 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors text-xs"
                          (click)="cartSvc.setQuantity(item.id, item.quantity - 1)"
                        >−</button>
                        <span class="w-7 text-center text-[11px] font-semibold text-slate-700 select-none">{{ item.quantity }}</span>
                        <button
                          class="w-6 h-6 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors text-xs"
                          (click)="cartSvc.setQuantity(item.id, item.quantity + 1)"
                        >+</button>
                      </div>
                      <span class="text-xs font-bold text-slate-800 ml-1">
                        {{ (item.productPrice + (item.variant.priceAdjustment ?? 0)) * item.quantity | currency }}
                      </span>
                    </div>
                  </div>

                  <!-- Remove -->
                  <button
                    class="text-slate-300 hover:text-red-500 transition-colors shrink-0 mt-0.5"
                    (click)="cartSvc.remove(item.id)"
                    title="Remove"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              }
            </div>
          }
        </div>

        <!-- Cart footer -->
        <div class="border-t border-slate-100 px-4 py-4 bg-slate-50/80 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-slate-600">Total</span>
            <span class="text-base font-bold text-slate-900">{{ cartSvc.total() | currency }}</span>
          </div>
          <button
            class="btn-primary w-full justify-center"
            [disabled]="cartSvc.items().length === 0"
            (click)="checkout()"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            Checkout
          </button>
        </div>
      </div>
    </div>

    <!-- ── Variant Picker Modal ──────────────────────────────────────────── -->
    @if (selectingProduct()) {
      <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        (click)="cancelVariantPick()"
      >
        <div
          class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div class="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
            @if (selectingProduct()!.imageUrl) {
              <img [src]="resolveImageUrl(selectingProduct()!.imageUrl)"
                   class="w-10 h-10 rounded-lg object-cover border border-slate-100" />
            } @else {
              <div class="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
                <svg class="w-5 h-5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
              </div>
            }
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-slate-900 truncate">{{ selectingProduct()!.name }}</p>
              <p class="text-xs text-slate-400">{{ selectingProduct()!.price | currency }} · Select a variant</p>
            </div>
            <button class="btn-icon" (click)="cancelVariantPick()">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Variants list -->
          <div class="px-6 py-4 max-h-72 overflow-y-auto space-y-2">
            @if (selectingProduct()!.variants.length === 0) {
              <p class="text-sm text-slate-400 text-center py-6">No variants available for this product.</p>
            } @else {
              @for (v of selectingProduct()!.variants; track v.id) {
                <button
                  type="button"
                  class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all"
                  [class]="selectedVariantId() === v.id
                    ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-400'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'"
                  (click)="selectedVariantId.set(v.id)"
                >
                  <div class="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                       [class]="selectedVariantId() === v.id ? 'border-brand-500' : 'border-slate-300'">
                    @if (selectedVariantId() === v.id) {
                      <div class="w-2 h-2 rounded-full bg-brand-500"></div>
                    }
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-mono font-semibold text-slate-700">{{ v.sku }}</p>
                    <div class="flex items-center gap-2 mt-0.5">
                      @if (v.size) {
                        <span class="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{{ v.size }}</span>
                      }
                      @if (v.color) {
                        <span class="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{{ v.color }}</span>
                      }
                      @if (v.barcode) {
                        <span class="text-xs text-slate-400 font-mono">{{ v.barcode }}</span>
                      }
                    </div>
                  </div>
                  @if (v.priceAdjustment && v.priceAdjustment !== 0) {
                    <span class="text-xs font-medium"
                          [class]="v.priceAdjustment > 0 ? 'text-emerald-600' : 'text-red-500'">
                      {{ v.priceAdjustment > 0 ? '+' : '' }}{{ v.priceAdjustment | currency }}
                    </span>
                  }
                </button>
              }
            }
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
            <button class="btn-secondary" (click)="cancelVariantPick()">Cancel</button>
            <!-- Qty stepper -->
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-500 font-medium">Qty</span>
              <div class="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                <button type="button"
                  class="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-30"
                  [disabled]="pickQty() <= 1"
                  (click)="pickQty.set(pickQty() - 1)">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 12h14"/>
                  </svg>
                </button>
                <span class="w-9 text-center text-sm font-semibold text-slate-800 select-none">{{ pickQty() }}</span>
                <button type="button"
                  class="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                  (click)="pickQty.set(pickQty() + 1)">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 5v14M5 12h14"/>
                  </svg>
                </button>
              </div>
            </div>
            <button
              class="btn-primary"
              [disabled]="!selectedVariantId()"
              (click)="confirmAddToCart()"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              Add to Cart
            </button>
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
  private destroy$   = new Subject<void>();

  searchCtrl    = new FormControl('');
  loading       = signal(true);
  products      = signal<Product[]>([]);

  // Variant picker
  selectingProduct  = signal<Product | null>(null);
  selectedVariantId = signal<number | null>(null);
  pickQty           = signal(1);

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

  startAddToCart(product: Product) {
    if (product.variants.length === 0) {
      this.toast.error(`"${product.name}" has no variants.`);
      return;
    }
    this.selectingProduct.set(product);
    this.selectedVariantId.set(null);
    this.pickQty.set(1);
  }

  cancelVariantPick() {
    this.selectingProduct.set(null);
    this.selectedVariantId.set(null);
    this.pickQty.set(1);
  }

  confirmAddToCart() {
    const product = this.selectingProduct();
    const variantId = this.selectedVariantId();
    if (!product || variantId === null) return;
    const variant = product.variants.find(v => v.id === variantId);
    if (!variant) return;
    const qty = this.pickQty();
    this.cartSvc.add(product, variant, qty);
    this.toast.success(`"${product.name} · ${variant.sku}" ×${qty} added`);
    this.cancelVariantPick();
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

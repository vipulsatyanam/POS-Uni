import {
  Component, inject, OnInit, OnDestroy, signal, computed, effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { ProductService } from '../../../core/services/product.service';
import { ToastService } from '../../../core/services/toast.service';
import { CartService } from '../../../core/services/cart.service';
import { Product, ProductVariant } from '../../../core/models/product.model';
import { environment } from '../../../../environments/environment';
import { ProductDialogComponent } from '../product-dialog/product-dialog.component';
import { ProductListEventBus } from '../../../layout/header/header.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ProductDialogComponent],
  template: `
    <div class="max-w-7xl mx-auto space-y-4">

      <!-- Page controls -->
      <div class="flex items-center gap-3">
        <!-- Search -->
        <div class="relative flex-1 max-w-xs">
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

        <div class="flex-1"></div>

        <!-- Stats chips -->
        <div class="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <span class="pill-green">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
            {{ products().length }} products
          </span>
          @if (totalVariants() > 0) {
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-medium">
              {{ totalVariants() }} variants
            </span>
          }
        </div>

        <!-- Add button (also triggered from header) -->
        <button class="btn-primary" (click)="openDialog()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 5v14M5 12h14"/>
          </svg>
          Add Product
        </button>
      </div>

      <!-- Table card -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        @if (loading()) {
          <div class="flex items-center justify-center py-20">
            <div class="flex flex-col items-center gap-3 text-slate-400">
              <div class="spinner !border-t-brand-500 !border-slate-200 !w-8 !h-8 !border-[3px]"></div>
              <span class="text-sm">Loading products…</span>
            </div>
          </div>
        } @else if (products().length === 0) {
          <div class="flex flex-col items-center py-20 text-slate-400">
            <svg class="w-14 h-14 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
            </svg>
            <p class="text-base font-semibold text-slate-600 mb-1">
              {{ searchCtrl.value ? 'No results found' : 'No products yet' }}
            </p>
            <p class="text-sm">
              {{ searchCtrl.value ? 'Try a different search term.' : 'Click "Add Product" to get started.' }}
            </p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:64px">Image</th>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Variants</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (product of products(); track product.id) {
                  <tr>
                    <!-- Image -->
                    <td>
                      @if (product.imageUrl) {
                        <img
                          [src]="resolveImageUrl(product.imageUrl)"
                          [alt]="product.name"
                          class="w-10 h-10 rounded-lg object-cover border border-slate-100"
                          (error)="onImgErr($event)"
                        />
                      } @else {
                        <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                          <svg class="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="1.5"/>
                            <circle cx="8.5" cy="8.5" r="1.5" stroke-width="1.5"/>
                            <polyline points="21 15 16 10 5 21" stroke-width="1.5"/>
                          </svg>
                        </div>
                      }
                    </td>

                    <!-- SKU -->
                    <td><span class="sku-badge">{{ product.sku }}</span></td>

                    <!-- Name -->
                    <td>
                      <p class="font-semibold text-slate-900 text-sm">{{ product.name }}</p>
                      @if (product.barcode) {
                        <p class="text-xs text-slate-400 font-mono mt-0.5">{{ product.barcode }}</p>
                      }
                    </td>

                    <!-- Category -->
                    <td>
                      @if (product.categoryName) {
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          {{ product.categoryName }}
                        </span>
                      } @else {
                        <span class="text-slate-300 text-sm">—</span>
                      }
                    </td>

                    <!-- Price -->
                    <td>
                      <span class="text-sm font-bold text-slate-900">{{ product.price | currency }}</span>
                    </td>

                    <!-- Variants -->
                    <td>
                      @if (product.variants.length > 0) {
                        <div class="flex flex-wrap gap-1 max-w-[200px]">
                          @for (v of product.variants.slice(0, 4); track v.id) {
                            <span class="tag-variant">{{ variantLabel(v) }}</span>
                          }
                          @if (product.variants.length > 4) {
                            <span class="tag-variant text-slate-400">+{{ product.variants.length - 4 }}</span>
                          }
                        </div>
                      } @else {
                        <span class="text-slate-300 text-sm">—</span>
                      }
                    </td>

                    <!-- Actions -->
                    <td class="text-right">
                      <div class="flex items-center justify-end gap-1">
                        <!-- Add to Cart -->
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
                        <!-- Edit -->
                        <button
                          class="btn-icon"
                          title="Edit"
                          (click)="editProduct(product)"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                        <!-- Delete -->
                        <button
                          class="btn-icon hover:!text-red-600 hover:!bg-red-50"
                          title="Delete"
                          (click)="confirmDelete(product)"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div class="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <p class="text-xs text-slate-400">
              Showing {{ products().length }} of {{ products().length }} product{{ products().length !== 1 ? 's' : '' }}
            </p>
            <p class="text-xs text-slate-400 font-mono">
              {{ totalVariants() }} total variants generated
            </p>
          </div>
        }
      </div>
    </div>

    <!-- Add/Edit Dialog -->
    @if (dialogOpen()) {
      <app-product-dialog
        [editProduct]="editingProduct()"
        (saved)="onSaved()"
        (cancelled)="closeDialog()"
      />
    }

    <!-- ── Variant Picker Modal ─────────────────────────────────────── -->
    @if (selectingProduct()) {
      <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        (click)="cancelVariantPick()"
      >
        <div
          class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          (click)="$event.stopPropagation()"
        >
          <!-- Modal Header -->
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
              <p class="text-xs text-slate-400">{{ selectingProduct()!.price | currency }} · Select a variant to continue</p>
            </div>
            <button class="btn-icon" (click)="cancelVariantPick()">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Variants List -->
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
                  <!-- Selection indicator -->
                  <div class="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                       [class]="selectedVariantId() === v.id ? 'border-brand-500' : 'border-slate-300'">
                    @if (selectedVariantId() === v.id) {
                      <div class="w-2 h-2 rounded-full bg-brand-500"></div>
                    }
                  </div>
                  <!-- Variant info -->
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-mono font-semibold text-slate-700">{{ v.sku }}</p>
                    <div class="flex items-center gap-2 mt-0.5">
                      @if (v.size) {
                        <span class="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{{ v.size }}</span>
                      }
                      @if (v.color) {
                        <span class="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{{ v.color }}</span>
                      }
                    </div>
                  </div>
                  <!-- Price adjustment -->
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

          <!-- Modal Footer -->
          <div class="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
            <button class="btn-secondary" (click)="cancelVariantPick()">Cancel</button>

            <!-- Quantity stepper -->
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-500 font-medium">Qty</span>
              <div class="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  class="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-30"
                  [disabled]="pickQty() <= 1"
                  (click)="pickQty.set(pickQty() - 1)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 12h14"/>
                  </svg>
                </button>
                <span class="w-9 text-center text-sm font-semibold text-slate-800 select-none">{{ pickQty() }}</span>
                <button
                  type="button"
                  class="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                  (click)="pickQty.set(pickQty() + 1)"
                >
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
export class ProductListComponent implements OnInit, OnDestroy {
  private productSvc = inject(ProductService);
  private toast      = inject(ToastService);
  private cartSvc    = inject(CartService);
  private destroy$   = new Subject<void>();

  searchCtrl     = new FormControl('');
  loading        = signal(true);
  products       = signal<Product[]>([]);
  dialogOpen     = signal(false);
  editingProduct = signal<Product | null>(null);

  // Variant picker state
  selectingProduct  = signal<Product | null>(null);
  selectedVariantId = signal<number | null>(null);
  pickQty           = signal(1);

  totalVariants = computed(() =>
    this.products().reduce((acc, p) => acc + p.variants.length, 0)
  );

  constructor() {
    effect(() => {
      const ts = ProductListEventBus.openDialog();
      if (ts > 0) this.openDialog();
    });
  }

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

  // ── Add Product dialog ──────────────────────────────────────────────
  openDialog() { this.editingProduct.set(null); this.dialogOpen.set(true); }
  editProduct(product: Product) { this.editingProduct.set(product); this.dialogOpen.set(true); }
  closeDialog() { this.dialogOpen.set(false); }
  onSaved() { this.closeDialog(); this.load(this.searchCtrl.value ?? ''); }

  // ── Cart ────────────────────────────────────────────────────────────
  startAddToCart(product: Product) {
    if (product.variants.length === 0) {
      this.toast.error(`"${product.name}" has no variants. Add sizes/colors first.`);
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
    this.toast.success(`"${product.name} · ${variantLabel(variant)}" ×${qty} added to cart`);
    this.cancelVariantPick();
  }

  // ── Delete ──────────────────────────────────────────────────────────
  confirmDelete(product: Product) {
    if (!confirm(`Delete "${product.name}"? This action cannot be undone.`)) return;
    this.productSvc.delete(product.id).subscribe({
      next: () => { this.toast.success(`"${product.name}" deleted`); this.load(this.searchCtrl.value ?? ''); },
      error: () => this.toast.error('Delete failed')
    });
  }

  variantLabel(v: { size?: string; color?: string }) {
    return [v.size, v.color].filter(Boolean).join('-');
  }

  resolveImageUrl(url?: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const base = environment.apiUrl.replace(/\/api$/, '');
    return `${base}${url}`;
  }

  onImgErr(e: Event) { (e.target as HTMLImageElement).style.display = 'none'; }
}

function variantLabel(v: ProductVariant): string {
  return [v.size, v.color].filter(Boolean).join(' · ') || v.sku;
}

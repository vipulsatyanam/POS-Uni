import { Component, inject, signal } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs/operators';
import { CartService } from '../../core/services/cart.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 shrink-0">

      <!-- Breadcrumb / title -->
      <div class="flex-1">
        <h1 class="text-[15px] font-semibold text-slate-800">{{ pageTitle() }}</h1>
        <p class="text-xs text-slate-400">{{ pageSubtitle() }}</p>
      </div>

      <!-- Actions area -->
      <div class="flex items-center gap-3">

        <!-- Cart icon with flyout -->
        <div
          class="relative"
          (mouseenter)="showCart.set(true)"
          (mouseleave)="showCart.set(false)"
        >
          <button class="btn-icon relative">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            @if (cartSvc.count() > 0) {
              <span class="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold leading-none">
                {{ cartSvc.count() > 99 ? '99+' : cartSvc.count() }}
              </span>
            } @else {
              <span class="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-slate-300"></span>
            }
          </button>

          <!-- Cart flyout panel -->
          @if (showCart()) {
            <div class="absolute right-0 top-full mt-1 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">

              <!-- Flyout header -->
              <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p class="text-sm font-semibold text-slate-800">
                  Cart
                  @if (cartSvc.count() > 0) {
                    <span class="ml-1.5 text-xs font-normal text-slate-400">({{ cartSvc.count() }} item{{ cartSvc.count() !== 1 ? 's' : '' }})</span>
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
              @if (cartSvc.items().length === 0) {
                <div class="flex flex-col items-center py-8 text-slate-400">
                  <svg class="w-10 h-10 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                  <p class="text-sm">Your cart is empty</p>
                  <p class="text-xs mt-1">Add products from the list</p>
                </div>
              } @else {
                <div class="max-h-64 overflow-y-auto divide-y divide-slate-50">
                  @for (item of cartSvc.items(); track item.id) {
                    <div class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">

                      <!-- Product image -->
                      @if (item.productImageUrl) {
                        <img [src]="resolveImageUrl(item.productImageUrl)"
                             class="w-9 h-9 rounded-lg object-cover border border-slate-100 shrink-0" />
                      } @else {
                        <div class="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <svg class="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="1.5"/>
                            <circle cx="8.5" cy="8.5" r="1.5" stroke-width="1.5"/>
                            <polyline points="21 15 16 10 5 21" stroke-width="1.5"/>
                          </svg>
                        </div>
                      }

                      <!-- Item details -->
                      <div class="flex-1 min-w-0">
                        <p class="text-xs font-semibold text-slate-800 truncate">{{ item.productName }}</p>
                        <!-- Variant badges -->
                        <div class="flex items-center gap-1 mt-0.5 flex-wrap">
                          @if (item.variant.size) {
                            <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">{{ item.variant.size }}</span>
                          }
                          @if (item.variant.color) {
                            <span class="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-medium">{{ item.variant.color }}</span>
                          }
                          <span class="text-[10px] text-slate-400 font-mono">{{ item.variant.sku }}</span>
                        </div>
                      </div>

                      <!-- Qty stepper & price -->
                      <div class="flex flex-col items-end gap-1 shrink-0">
                        <p class="text-xs font-bold text-slate-800">
                          {{ (item.productPrice + (item.variant.priceAdjustment ?? 0)) * item.quantity | currency }}
                        </p>
                        <div class="flex items-center border border-slate-200 rounded-md overflow-hidden">
                          <button
                            class="w-6 h-6 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
                            (click)="cartSvc.setQuantity(item.id, item.quantity - 1)"
                            title="Decrease"
                          >
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 12h14"/>
                            </svg>
                          </button>
                          <span class="w-7 text-center text-[11px] font-semibold text-slate-700 select-none">{{ item.quantity }}</span>
                          <button
                            class="w-6 h-6 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
                            (click)="cartSvc.setQuantity(item.id, item.quantity + 1)"
                            title="Increase"
                          >
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 5v14M5 12h14"/>
                            </svg>
                          </button>
                        </div>
                      </div>

                      <!-- Remove -->
                      <button
                        class="text-slate-300 hover:text-red-500 transition-colors shrink-0"
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

                <!-- Total -->
                <div class="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                  <p class="text-xs text-slate-500 font-medium">Total</p>
                  <p class="text-sm font-bold text-slate-900">{{ cartSvc.total() | currency }}</p>
                </div>
              }
            </div>
          }
        </div>

        <!-- Avatar -->
        <div class="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer">
          A
        </div>
      </div>
    </header>
  `
})
export class HeaderComponent {
  private router = inject(Router);
  cartSvc = inject(CartService);

  showCart = signal(false);

  private url = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  pageTitle = () => {
    const url = this.url() ?? '';
    if (url.includes('products')) return 'Products';
    if (url.includes('categories')) return 'Categories';
    return 'Point of Sale';
  };

  pageSubtitle = () => {
    const url = this.url() ?? '';
    if (url.includes('products')) return 'Manage your product catalogue';
    if (url.includes('categories')) return 'Manage product categories';
    return 'Process transactions';
  };

  resolveImageUrl(url?: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${environment.apiUrl.replace(/\/api$/, '')}${url}`;
  }

}

// Simple event bus so header can trigger dialog in the product list
export class ProductListEventBus {
  static openDialog = signal(0);
}

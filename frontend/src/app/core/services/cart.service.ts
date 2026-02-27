import { Injectable, signal, computed } from '@angular/core';
import { CartItem, Product, ProductVariant } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly STORAGE_KEY = 'pm_cart';

  items = signal<CartItem[]>(this.loadFromSession());

  count = computed(() => this.items().reduce((sum, i) => sum + i.quantity, 0));

  total = computed(() =>
    this.items().reduce((sum, i) =>
      sum + (i.productPrice + (i.variant.priceAdjustment ?? 0)) * i.quantity, 0)
  );

  add(product: Product, variant: ProductVariant, quantity = 1): void {
    const key = `${product.id}-${variant.id}`;
    this.items.update(list => {
      const idx = list.findIndex(i => i.id === key);
      if (idx >= 0) {
        const updated = [...list];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + quantity };
        return updated;
      }
      return [...list, {
        id: key,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        productPrice: product.price,
        productImageUrl: product.imageUrl,
        variant,
        quantity
      }];
    });
    this.persist();
  }

  setQuantity(id: string, quantity: number): void {
    if (quantity <= 0) { this.remove(id); return; }
    this.items.update(list => list.map(i => i.id === id ? { ...i, quantity } : i));
    this.persist();
  }

  remove(id: string): void {
    this.items.update(list => list.filter(i => i.id !== id));
    this.persist();
  }

  clear(): void {
    this.items.set([]);
    sessionStorage.removeItem(this.STORAGE_KEY);
  }

  private loadFromSession(): CartItem[] {
    try {
      const raw = sessionStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) as CartItem[] : [];
    } catch {
      return [];
    }
  }

  private persist(): void {
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.items()));
  }
}

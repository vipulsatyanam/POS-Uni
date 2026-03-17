import { Injectable, signal, computed } from '@angular/core';
import { CartItem, Product, ProductVariant } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly STORAGE_KEY = 'pm_cart';

  items = signal<CartItem[]>(this.loadFromSession());

  cartDiscountType  = signal<'percentage' | 'fixed' | null>(null);
  cartDiscountValue = signal<number | null>(null);
  cartDiscountDesc  = signal<string | null>(null);

  count = computed(() => this.items().reduce((sum, i) => sum + i.quantity, 0));

  subtotal = computed(() =>
    this.items().reduce((sum, i) => {
      const linePrice = (i.productPrice + (i.variant.priceAdjustment ?? 0)) * i.quantity;
      let discount = 0;
      if (i.discountType === 'percentage' && i.discountValue) {
        discount = linePrice * (i.discountValue / 100);
      } else if (i.discountType === 'fixed' && i.discountValue) {
        discount = i.discountValue;
      }
      return sum + linePrice - discount;
    }, 0)
  );

  cartDiscountAmount = computed(() => {
    const sub = this.subtotal();
    const type = this.cartDiscountType();
    const val  = this.cartDiscountValue();
    if (!type || !val) return 0;
    return type === 'percentage' ? sub * (val / 100) : val;
  });

  total = computed(() => Math.max(0, this.subtotal() - this.cartDiscountAmount()));

  setCartDiscount(type: 'percentage' | 'fixed', value: number, desc?: string): void {
    this.cartDiscountType.set(type);
    this.cartDiscountValue.set(value);
    this.cartDiscountDesc.set(desc ?? null);
  }

  removeCartDiscount(): void {
    this.cartDiscountType.set(null);
    this.cartDiscountValue.set(null);
    this.cartDiscountDesc.set(null);
  }

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

  setItemNote(id: string, note: string): void {
    this.items.update(list => list.map(i => i.id === id ? { ...i, note } : i));
    this.persist();
  }

  setItemDiscount(id: string, discountType: 'percentage' | 'fixed', discountValue: number, discountDescription?: string): void {
    this.items.update(list => list.map(i => i.id === id ? { ...i, discountType, discountValue, discountDescription } : i));
    this.persist();
  }

  removeItemDiscount(id: string): void {
    this.items.update(list => list.map(i => i.id === id
      ? { ...i, discountType: undefined, discountValue: undefined, discountDescription: undefined }
      : i));
    this.persist();
  }

  addRaw(item: CartItem): void {
    this.items.update(list => {
      const idx = list.findIndex(i => i.id === item.id);
      if (idx >= 0) {
        const updated = [...list];
        updated[idx] = item;
        return updated;
      }
      return [...list, item];
    });
    this.persist();
  }

  remove(id: string): void {
    this.items.update(list => list.filter(i => i.id !== id));
    this.persist();
  }

  clear(): void {
    this.items.set([]);
    this.removeCartDiscount();
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

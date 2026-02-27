export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface ProductVariant {
  id: number;
  size?: string;
  color?: string;
  sku: string;
  barcode?: string;
  stock: number;
  priceAdjustment?: number;
}

export interface VariantBarcodeEntry {
  size?: string;
  color?: string;
  barcode?: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  imageUrl?: string;
  categoryId?: number;
  categoryName?: string;
  sizes: string[];
  colors: string[];
  variants: ProductVariant[];
  createdAt: string;
}

export interface CreateProductRequest {
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  imageUrl?: string;
  categoryId?: number;
  sizes: string[];
  colors: string[];
  variantBarcodes?: VariantBarcodeEntry[];
}

export type UpdateProductRequest = CreateProductRequest;

export interface CartItem {
  id: string;               // unique key: `${productId}-${variantId}`
  productId: number;
  productName: string;
  productSku: string;
  productPrice: number;
  productImageUrl?: string;
  variant: ProductVariant;
  quantity: number;
}

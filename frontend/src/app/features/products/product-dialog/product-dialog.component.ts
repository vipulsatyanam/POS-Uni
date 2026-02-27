import {
  Component, inject, OnInit, input, output, signal, computed
} from '@angular/core';
import {
  FormBuilder, FormGroup, FormControl, Validators, ReactiveFormsModule
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { ToastService } from '../../../core/services/toast.service';
import { Category, Product } from '../../../core/models/product.model';

@Component({
  selector: 'app-product-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <!-- Backdrop -->
    <div class="modal-backdrop" (click)="onBackdropClick($event)">

      <!-- Panel -->
      <div class="modal-panel mx-4" (click)="$event.stopPropagation()">

        <!-- ── Header ─────────────────────────────────────────────── -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
              <svg class="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                @if (isEdit()) {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                } @else {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 5v14M5 12h14"/>
                }
              </svg>
            </div>
            <div>
              <h2 class="text-[15px] font-bold text-slate-900">
                {{ isEdit() ? 'Edit Product' : 'Add New Product' }}
              </h2>
              <p class="text-xs text-slate-400">
                {{ isEdit() ? 'Update product details' : 'Fill in the details below' }}
              </p>
            </div>
          </div>
          <button class="btn-icon" (click)="cancelled.emit()">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- ── Body (scrollable) ──────────────────────────────────── -->
        <div class="overflow-y-auto flex-1 px-6 py-5">
          <form [formGroup]="form" class="space-y-5">

            <!-- Row 1: Name + SKU -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="field-label">Product Name <span class="text-red-500">*</span></label>
                <input formControlName="name" type="text" class="field-input"
                       [class.error]="invalid('name')"
                       placeholder="e.g. Classic T-Shirt" />
                @if (invalid('name')) {
                  <p class="field-error">Product name is required</p>
                }
              </div>
              <div>
                <label class="field-label">SKU <span class="text-red-500">*</span></label>
                <input formControlName="sku" type="text" class="field-input font-mono uppercase"
                       [class.error]="invalid('sku')"
                       placeholder="e.g. TEE-001" />
                @if (invalid('sku')) {
                  <p class="field-error">SKU is required</p>
                }
              </div>
            </div>

            <!-- Row 2: Barcode + Price -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="field-label">Barcode</label>
                <input formControlName="barcode" type="text" class="field-input font-mono"
                       placeholder="e.g. 012345678901" />
              </div>
              <div>
                <label class="field-label">Price <span class="text-red-500">*</span></label>
                <div class="relative">
                  <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium pointer-events-none">$</span>
                  <input formControlName="price" type="number" min="0" step="0.01"
                         class="field-input pl-7" [class.error]="invalid('price')"
                         placeholder="0.00" />
                </div>
                @if (invalid('price')) {
                  <p class="field-error">Valid price required</p>
                }
              </div>
            </div>

            <!-- Row 3: Category + Image Upload -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="field-label">Category</label>
                <select formControlName="categoryId" class="field-input">
                  <option [ngValue]="null">— Select category —</option>
                  @for (c of categories(); track c.id) {
                    <option [ngValue]="c.id">{{ c.name }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="field-label">Product Image</label>
                <div class="flex gap-2">
                  <input
                    #imageInput
                    type="file"
                    class="hidden"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    (change)="onImageSelected($event)"
                  />
                  <button
                    type="button"
                    class="btn-secondary flex-1"
                    (click)="imageInput.click()"
                    [disabled]="uploadingImage()"
                  >
                    @if (uploadingImage()) {
                      <span class="spinner"></span>
                      Uploading…
                    } @else {
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      Choose Image
                    }
                  </button>
                  @if (imagePreview()) {
                    <button
                      type="button"
                      class="btn-icon hover:!text-red-600 hover:!bg-red-50"
                      (click)="clearImage()"
                      title="Remove image"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  }
                </div>
              </div>
            </div>

            <!-- Image Preview -->
            @if (imagePreview()) {
              <div class="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <div class="flex gap-3">
                  <img
                    [src]="imagePreview()"
                    alt="Preview"
                    class="w-12 h-12 rounded-lg object-cover border border-blue-100"
                  />
                  <div class="flex-1 text-sm">
                    <p class="text-blue-900 font-medium">{{ imageFileName() }}</p>
                    <p class="text-blue-700 text-xs">Ready to upload</p>
                  </div>
                </div>
              </div>
            }

            <!-- Divider -->
            <div class="border-t border-slate-100 pt-1"></div>

            <!-- ── Sizes ──────────────────────────────────────────── -->
            <div>
              <label class="field-label">Sizes</label>
              <div class="flex gap-2">
                <input
                  [formControl]="sizeInput"
                  type="text"
                  class="field-input flex-1"
                  placeholder="e.g. S, M, L, XL, 42…"
                  (keydown.enter)="addSize(); $event.preventDefault()"
                />
                <button
                  type="button"
                  class="btn-secondary whitespace-nowrap"
                  (click)="addSize()"
                  [disabled]="!sizeInput.value?.trim()"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 5v14M5 12h14"/>
                  </svg>
                  Add
                </button>
              </div>

              @if (sizes().length > 0) {
                <div class="flex flex-wrap gap-2 mt-2.5">
                  @for (size of sizes(); track size) {
                    <span class="tag-size">
                      {{ size }}
                      <button type="button" class="hover:text-blue-900 ml-0.5" (click)="removeSize(size)">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </span>
                  }
                </div>
              }
            </div>

            <!-- ── Colors ─────────────────────────────────────────── -->
            <div>
              <label class="field-label">Colors</label>
              <div class="flex gap-2">
                <input
                  [formControl]="colorInput"
                  type="text"
                  class="field-input flex-1"
                  placeholder="e.g. Red, Blue, #FF5733…"
                  (keydown.enter)="addColor(); $event.preventDefault()"
                />
                <button
                  type="button"
                  class="btn-secondary whitespace-nowrap"
                  (click)="addColor()"
                  [disabled]="!colorInput.value?.trim()"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 5v14M5 12h14"/>
                  </svg>
                  Add
                </button>
              </div>

              @if (colors().length > 0) {
                <div class="flex flex-wrap gap-2 mt-2.5">
                  @for (color of colors(); track color) {
                    <span class="tag-color">
                      {{ color }}
                      <button type="button" class="hover:text-purple-900 ml-0.5" (click)="removeColor(color)">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </span>
                  }
                </div>
              }
            </div>

            <!-- ── Variant Preview ─────────────────────────────────── -->
            @if (previewVariants().length > 0) {
              <div class="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-4">
                <div class="flex items-center gap-2 mb-3">
                  <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                  </svg>
                  <p class="text-xs font-semibold text-slate-600">
                    {{ previewVariants().length }} variant{{ previewVariants().length !== 1 ? 's' : '' }} will be created
                  </p>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  @for (v of previewVariants(); track v) {
                    <span class="inline-flex items-center px-2.5 py-1 rounded-md
                                 bg-white border border-slate-200 text-slate-700
                                 text-xs font-mono shadow-sm">
                      {{ v }}
                    </span>
                  }
                </div>
              </div>
            }

          </form>
        </div>

        <!-- ── Footer ─────────────────────────────────────────────── -->
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <button class="btn-secondary" (click)="cancelled.emit()" [disabled]="saving()">
            Cancel
          </button>
          <button
            class="btn-primary min-w-[120px]"
            (click)="submit()"
            [disabled]="saving()"
          >
            @if (saving()) {
              <span class="spinner"></span>
              Saving…
            } @else {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                @if (isEdit()) {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M5 13l4 4L19 7"/>
                } @else {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 5v14M5 12h14"/>
                }
              </svg>
              {{ isEdit() ? 'Save Changes' : 'Create Product' }}
            }
          </button>
        </div>
      </div>
    </div>
  `
})
export class ProductDialogComponent implements OnInit {
  // Inputs / Outputs
  editProduct = input<Product | null>(null);
  saved       = output<void>();
  cancelled   = output<void>();

  // Services
  private fb           = inject(FormBuilder);
  private productSvc   = inject(ProductService);
  private categorySvc  = inject(CategoryService);
  private toast        = inject(ToastService);

  // State
  form       !: FormGroup;
  sizeInput    = new FormControl('');
  colorInput   = new FormControl('');
  sizes        = signal<string[]>([]);
  colors       = signal<string[]>([]);
  categories   = signal<Category[]>([]);
  saving       = signal(false);
  uploadingImage = signal(false);
  imagePreview = signal<string | null>(null);
  imageFileName = signal('');
  selectedImageFile: File | null = null;

  isEdit = computed(() => !!this.editProduct());

  // Real-time variant preview
  previewVariants = computed(() => {
    const s = this.sizes();
    const c = this.colors();
    const sku = (this.form?.value?.sku ?? 'SKU').toUpperCase().replace(/\s+/g, '-');
    if (s.length === 0 && c.length === 0) return [];
    if (s.length > 0 && c.length > 0)
      return s.flatMap(sz => c.map(cl => `${sku}-${sz.toUpperCase()}-${cl.toUpperCase().replace(/\s+/g, '-')}`));
    if (s.length > 0)
      return s.map(sz => `${sku}-${sz.toUpperCase()}`);
    return c.map(cl => `${sku}-${cl.toUpperCase().replace(/\s+/g, '-')}`);
  });

  ngOnInit() {
    const p = this.editProduct();
    this.form = this.fb.group({
      name:       [p?.name ?? '',   [Validators.required, Validators.maxLength(200)]],
      sku:        [p?.sku  ?? '',   [Validators.required, Validators.maxLength(100)]],
      barcode:    [p?.barcode ?? ''],
      price:      [p?.price ?? null, [Validators.required, Validators.min(0)]],
      categoryId: [p?.categoryId ?? null],
      imageUrl:   [p?.imageUrl ?? '']
    });

    if (p) {
      this.sizes.set([...p.sizes]);
      this.colors.set([...p.colors]);
    }

    this.categorySvc.getAll().subscribe(cats => this.categories.set(cats));
  }

  // ── Tag management ────────────────────────────────────────────────────────

  addSize() {
    const v = this.sizeInput.value?.trim();
    if (v && !this.sizes().includes(v)) this.sizes.update(s => [...s, v]);
    this.sizeInput.setValue('');
  }

  removeSize(s: string) { this.sizes.update(arr => arr.filter(x => x !== s)); }

  addColor() {
    const v = this.colorInput.value?.trim();
    if (v && !this.colors().includes(v)) this.colors.update(c => [...c, v]);
    this.colorInput.setValue('');
  }

  removeColor(c: string) { this.colors.update(arr => arr.filter(x => x !== c)); }

  // ── Submit ────────────────────────────────────────────────────────────────

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);

    // Upload image if selected
    if (this.selectedImageFile) {
      this.productSvc.uploadImage(this.selectedImageFile).subscribe({
        next: (res) => this.createOrUpdateProduct(res.imageUrl),
        error: (err) => {
          this.saving.set(false);
          this.toast.error(err?.error?.message ?? 'Image upload failed');
        }
      });
    } else {
      this.createOrUpdateProduct(this.form.value.imageUrl);
    }
  }

  private createOrUpdateProduct(imageUrl: string) {
    const payload = {
      ...this.form.value,
      sku:      this.form.value.sku.toUpperCase(),
      imageUrl: imageUrl,
      sizes:    this.sizes(),
      colors:   this.colors()
    };

    const req$ = this.isEdit()
      ? this.productSvc.update(this.editProduct()!.id, payload)
      : this.productSvc.create(payload);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(this.isEdit() ? 'Product updated!' : 'Product created!');
        this.saved.emit();
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message ?? (this.isEdit() ? 'Update failed' : 'Create failed');
        this.toast.error(msg);
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  invalid(field: string) {
    const c = this.form.get(field);
    return c?.invalid && c?.touched;
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.toast.error('Invalid file type. Allowed: JPEG, PNG, GIF, WebP');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.toast.error('File size must be less than 5MB');
      return;
    }

    this.selectedImageFile = file;
    this.imageFileName.set(file.name);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Clear the input so the same file can be selected again
    input.value = '';
  }

  clearImage() {
    this.selectedImageFile = null;
    this.imagePreview.set(null);
    this.imageFileName.set('');
  }

  onBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.cancelled.emit();
    }
  }
}

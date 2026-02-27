import {
  Component, inject, OnInit, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { CategoryService } from '../../core/services/category.service';
import { ToastService } from '../../core/services/toast.service';
import { Category } from '../../core/models/product.model';

@Component({
  selector: 'app-category-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="max-w-4xl mx-auto space-y-4">

      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Categories</h1>
          <p class="text-sm text-slate-500 mt-1">Manage product categories for your catalog</p>
        </div>
      </div>

      <!-- Create Form Card -->
      <div class="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h2 class="text-lg font-semibold text-slate-900 mb-4">Add New Category</h2>
        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="field-label">Category Name <span class="text-red-500">*</span></label>
              <input
                formControlName="name"
                type="text"
                class="field-input"
                [class.error]="invalid('name')"
                placeholder="e.g. Electronics, Clothing, Food"
              />
              @if (invalid('name')) {
                <p class="field-error">Category name is required</p>
              }
            </div>
            <div>
              <button
                type="submit"
                class="btn-primary mt-6"
                [disabled]="saving()"
              >
                @if (saving()) {
                  <span class="spinner"></span>
                  Creating…
                } @else {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 5v14M5 12h14"/>
                  </svg>
                  Add Category
                }
              </button>
            </div>
          </div>

          <div class="full-width">
            <label class="field-label">Description</label>
            <textarea
              formControlName="description"
              class="field-input resize-none"
              rows="2"
              placeholder="Optional description for this category"
            ></textarea>
          </div>
        </form>
      </div>

      <!-- Categories List -->
      <div class="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        @if (loading()) {
          <div class="flex items-center justify-center py-12">
            <div class="flex flex-col items-center gap-3 text-slate-400">
              <div class="spinner !border-t-brand-500 !border-slate-200 !w-8 !h-8 !border-[3px]"></div>
              <span class="text-sm">Loading categories…</span>
            </div>
          </div>
        } @else if (categories().length === 0) {
          <div class="flex flex-col items-center py-12 text-slate-400">
            <svg class="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M7 21a4 4 0 001.025-7.945 6 6 0 1115.95 3m-16.5-1.665A4 4 0 0119.5 19m0 0h.01"/>
            </svg>
            <p class="text-base font-semibold text-slate-600">No categories yet</p>
            <p class="text-sm">Create your first category above to get started</p>
          </div>
        } @else {
          <div class="divide-y divide-slate-100">
            @for (cat of categories(); track cat.id) {
              <div class="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                <div class="flex-1">
                  <p class="font-semibold text-slate-900">{{ cat.name }}</p>
                  @if (cat.description) {
                    <p class="text-sm text-slate-500 mt-1">{{ cat.description }}</p>
                  }
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                    ID: {{ cat.id }}
                  </span>
                  <button
                    type="button"
                    class="btn-icon hover:!text-red-600 hover:!bg-red-50"
                    title="Delete"
                    (click)="deleteCategory(cat)"
                    [disabled]="deleting() === cat.id"
                  >
                    @if (deleting() === cat.id) {
                      <span class="spinner !w-4 !h-4"></span>
                    } @else {
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    }
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      padding: 2rem;
    }

    .spinner {
      @apply inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin;
    }
  `]
})
export class CategoryManagementComponent implements OnInit {
  private fb = inject(FormBuilder);
  private categorySvc = inject(CategoryService);
  private toast = inject(ToastService);

  form!: FormGroup;
  categories = signal<Category[]>([]);
  saving = signal(false);
  loading = signal(true);
  deleting = signal(0);

  ngOnInit() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', Validators.maxLength(500)]
    });
    this.loadCategories();
  }

  loadCategories() {
    this.loading.set(true);
    this.categorySvc.getAll().subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error('Failed to load categories');
      }
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.categorySvc.create(this.form.value).subscribe({
      next: (cat) => {
        this.saving.set(false);
        this.categories.update(c => [...c, cat]);
        this.form.reset();
        this.toast.success('Category created!');
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message ?? 'Failed to create category';
        this.toast.error(msg);
      }
    });
  }

  deleteCategory(cat: Category) {
    if (!confirm(`Delete "${cat.name}"? This cannot be undone.`)) return;
    this.deleting.set(cat.id);
    // TODO: Add delete endpoint to backend and implement
    this.deleting.set(0);
    this.toast.info('Delete functionality coming soon');
  }

  invalid(field: string) {
    const c = this.form.get(field);
    return c?.invalid && c?.touched;
  }
}

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="max-w-2xl mx-auto mt-16 text-center">
      <!-- Icon -->
      <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-brand-50 border border-brand-100 mb-6">
        <svg class="w-10 h-10 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      </div>

      <h2 class="text-2xl font-bold text-slate-900 mb-2">Point of Sale</h2>
      <p class="text-slate-500 text-sm mb-8 leading-relaxed">
        The POS module is coming soon. Head over to the Products section<br>to manage your catalogue.
      </p>

      <a routerLink="/products" class="btn-primary inline-flex">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
        Go to Products
      </a>
    </div>
  `
})
export class PosComponent {}

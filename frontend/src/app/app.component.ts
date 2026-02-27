import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastService } from './core/services/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <router-outlet />

    <!-- Toast container -->
    <div class="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2" aria-live="polite">
      @for (toast of toastSvc.toasts(); track toast.id) {
        <div
          class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium
                 animate-[slideUp_0.2s_ease-out]"
          [class]="toastClasses(toast.type)"
        >
          <!-- Icon -->
          @if (toast.type === 'success') {
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
            </svg>
          } @else if (toast.type === 'error') {
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          }
          <span>{{ toast.message }}</span>
          <button class="ml-2 opacity-60 hover:opacity-100" (click)="toastSvc.dismiss(toast.id)">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      }
    </div>
  `
})
export class AppComponent {
  toastSvc = inject(ToastService);

  toastClasses(type: string) {
    const map: Record<string, string> = {
      success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      error:   'bg-red-50 border-red-200 text-red-800',
      info:    'bg-blue-50 border-blue-200 text-blue-800'
    };
    return map[type] ?? map['info'];
  }
}

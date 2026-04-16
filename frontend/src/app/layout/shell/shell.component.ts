import { Component, inject, signal, computed } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent, CommonModule],
  template: `
    <div class="flex h-screen overflow-hidden bg-slate-50">

      <!-- Mobile backdrop overlay -->
      @if (sidebarOpen()) {
        <div
          class="fixed inset-0 bg-black/40 z-20 lg:hidden"
          (click)="sidebarOpen.set(false)"
        ></div>
      }

      <!-- Sidebar wrapper: CSS class handles fixed/static per breakpoint -->
      <div class="sidebar-wrapper" [class.open]="sidebarOpen()">
        <app-sidebar />
      </div>

      <!-- Main content -->
      <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
        @if (!isPOS()) {
          <app-header (menuToggle)="toggleSidebar()" />
        }
        <main [class]="isPOS() ? 'flex-1 overflow-hidden' : 'flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6'">
          <router-outlet />
        </main>
      </div>

      <!-- ── Toast Notifications ── -->
      <div class="fixed top-5 right-5 z-[9999] flex flex-col gap-3 w-80">
        @for (t of toast.toasts(); track t.id) {
          <div
            class="flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-fade-in"
            [class]="t.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                     t.type === 'error'   ? 'bg-red-50 border-red-200 text-red-800' :
                                            'bg-blue-50 border-blue-200 text-blue-800'"
          >
            <!-- Icon -->
            <span class="text-lg shrink-0">
              {{ t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ' }}
            </span>
            <!-- Message -->
            <span class="flex-1">{{ t.message }}</span>
            <!-- Close -->
            <button class="shrink-0 opacity-50 hover:opacity-100 text-base leading-none" (click)="toast.dismiss(t.id)">✕</button>
          </div>
        }
      </div>

    </div>
  `
})
export class ShellComponent {
  toast = inject(ToastService);
  sidebarOpen = signal(false);
  toggleSidebar() { this.sidebarOpen.update(v => !v); }

  private router = inject(Router);
  private url = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );
  isPOS = computed(() => {
    const url = this.url() ?? '';
    return url === '/pos' || url.startsWith('/pos?');
  });
}

import { Component, inject, signal, computed } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
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

    </div>
  `
})
export class ShellComponent {
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
  isPOS = computed(() => (this.url() ?? '').includes('/pos'));
}

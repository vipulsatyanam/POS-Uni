import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
        <app-header (menuToggle)="toggleSidebar()" />
        <main class="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          <router-outlet />
        </main>
      </div>

    </div>
  `
})
export class ShellComponent {
  sidebarOpen = signal(false);
  toggleSidebar() { this.sidebarOpen.update(v => !v); }
}

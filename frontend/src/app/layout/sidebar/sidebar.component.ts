import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface NavItem { label: string; icon: SafeHtml; route: string; }

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="w-60 shrink-0 h-full bg-white border-r border-slate-200 flex flex-col select-none">

      <!-- Logo -->
      <div class="px-5 py-5 border-b border-slate-100">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shadow-sm">
            <svg class="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 3a1 1 0 110 2 1 1 0 010-2zm4 10H8a1 1 0 010-2h8a1 1 0 010 2zm0-4H8a1 1 0 010-2h8a1 1 0 010 2z"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-bold text-slate-900 leading-none">Uniform Australia</p>
            <p class="text-[10px] text-slate-400 mt-0.5">POS Management System</p>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 p-3 space-y-0.5 pt-4 overflow-y-auto">
        @for (item of navItems; track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="active"
            class="sidebar-link"
          >
            <span class="w-5 h-5 text-slate-400 transition-colors flex-shrink-0" [innerHTML]="item.icon"></span>
            <span>{{ item.label }}</span>
            <span class="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500 opacity-0 [.active_&]:opacity-100 transition-opacity"></span>
          </a>
        }

        <!-- Settings (expandable) -->
        <div>
          <button
            class="sidebar-link w-full"
            [class.active]="settingsOpen()"
            (click)="settingsOpen.set(!settingsOpen())"
          >
            <span class="w-5 h-5 text-slate-400 transition-colors flex-shrink-0" [innerHTML]="settingsIcon"></span>
            <span>Settings</span>
            <svg
              class="ml-auto w-4 h-4 text-slate-400 transition-transform duration-200"
              [class.rotate-90]="settingsOpen()"
              fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </button>

          @if (settingsOpen()) {
            <div class="ml-3 mt-0.5 space-y-0.5 border-l border-slate-100 pl-3">
              <a
                routerLink="/settings/eftpos"
                routerLinkActive="active"
                class="sidebar-link text-sm"
              >
                <span class="w-4 h-4 text-slate-400 flex-shrink-0" [innerHTML]="eftposIcon"></span>
                <span>EFTPOS Settings</span>
                <span class="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500 opacity-0 [.active_&]:opacity-100 transition-opacity"></span>
              </a>
            </div>
          }
        </div>
      </nav>

      <!-- Footer -->
      <div class="p-4 border-t border-slate-100">
        <div class="flex items-center gap-3 px-2 py-2 rounded-lg bg-slate-50">
          <div class="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold">
            A
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-slate-800 truncate">Admin</p>
            <p class="text-[10px] text-slate-400">admin&#64;store.com</p>
          </div>
        </div>
      </div>
    </aside>
  `
})
export class SidebarComponent {
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);

  settingsOpen = signal(this.router.url.startsWith('/settings'));

  private svg(content: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:100%;height:100%">${content}</svg>`
    );
  }

  settingsIcon = this.svg(`
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  `);

  eftposIcon = this.svg(`
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <line x1="2" y1="10" x2="22" y2="10"/>
  `);

  navItems: NavItem[] = [
    {
      label: 'POS',
      route: '/pos',
      icon: this.svg(`
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
        <line x1="3" x2="21" y1="6" y2="6"/>
        <path d="M16 10a4 4 0 0 1-8 0"/>
      `)
    },
    {
      label: 'Products',
      route: '/products',
      icon: this.svg(`
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      `)
    },
    {
      label: 'Categories',
      route: '/categories',
      icon: this.svg(`
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      `)
    }
  ];
}

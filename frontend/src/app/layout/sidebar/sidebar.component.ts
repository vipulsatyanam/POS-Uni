import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

interface NavItem { label: string; icon: string; route: string; }

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
      <nav class="flex-1 p-3 space-y-0.5">
        <p class="px-3 pt-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Main</p>

        @for (item of navItems; track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="active"
            class="sidebar-link"
          >
            <span class="sidebar-icon w-5 h-5 text-slate-400 transition-colors" [innerHTML]="item.icon"></span>
            <span>{{ item.label }}</span>

            <!-- Active indicator -->
            <span class="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500 opacity-0 [.active_&]:opacity-100 transition-opacity"></span>
          </a>
        }
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
  navItems: NavItem[] = [
    {
      label: 'POS',
      route: '/pos',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
               <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
             </svg>`
    },
    {
      label: 'Products',
      route: '/products',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
               <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
               <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
             </svg>`
    },
    {
      label: 'Categories',
      route: '/categories',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
               <circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
             </svg>`
    }
  ];
}

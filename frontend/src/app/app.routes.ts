import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // ── Auth pages (public) ────────────────────────────────────────────────────
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },

  // ── Protected app shell ────────────────────────────────────────────────────
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'pos', pathMatch: 'full' },
      {
        path: 'pos',
        loadComponent: () => import('./features/pos/pos.component').then(m => m.PosComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./features/products/product-list/product-list.component')
          .then(m => m.ProductListComponent)
      },
      {
        path: 'categories',
        loadComponent: () => import('./features/categories/category-management.component')
          .then(m => m.CategoryManagementComponent)
      }
    ]
  },

  { path: '**', redirectTo: 'pos' }
];

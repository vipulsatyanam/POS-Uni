import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell.component').then(m => m.ShellComponent),
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

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, UserInfo } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http   = inject(HttpClient);
  private router = inject(Router);
  private base   = `${environment.apiUrl}/auth`;

  private readonly TOKEN_KEY    = 'pm_token';
  private readonly USER_KEY     = 'pm_user';

  // ── Reactive state ────────────────────────────────────────────────────────
  currentUser = signal<AuthResponse | null>(this.loadUser());
  isLoggedIn  = computed(() => this.currentUser() !== null);
  tenantName  = computed(() => this.currentUser()?.tenantName ?? '');
  userFullName = computed(() => this.currentUser()?.fullName ?? '');
  userRole    = computed(() => this.currentUser()?.role ?? '');
  userInitials = computed(() => {
    const name = this.currentUser()?.fullName ?? '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  });

  // ── API calls ─────────────────────────────────────────────────────────────

  login(body: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/login`, body).pipe(
      tap(res => this.persist(res))
    );
  }

  register(body: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/register`, body).pipe(
      tap(res => this.persist(res))
    );
  }

  me(): Observable<UserInfo> {
    return this.http.get<UserInfo>(`${this.base}/me`);
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private persist(res: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, res.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(res));
    this.currentUser.set(res);
  }

  private loadUser(): AuthResponse | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      if (!raw) return null;
      const user = JSON.parse(raw) as AuthResponse;
      // Check if token has expired
      if (new Date(user.expiresAt) <= new Date()) {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        return null;
      }
      return user;
    } catch {
      return null;
    }
  }
}

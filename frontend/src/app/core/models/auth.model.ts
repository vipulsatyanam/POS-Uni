export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  tenantName: string;
  tenantSlug: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  fullName: string;
  role: string;
  tenantId: number;
  tenantName: string;
  tenantSlug: string;
  plan: string;
  expiresAt: string;
}

export interface UserInfo {
  id: string;
  email: string;
  fullName: string;
  role: string;
  tenantId: number;
  tenantName: string;
  tenantSlug: string;
  plan: string;
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  AuthResponse,
  LoginRequest,
  RefreshRequest,
  RefreshResponse,
  RegisterRequest,
  User
} from '../models/auth.model';
import { UserRole } from '../models/auth.model';

export interface SubscriptionStatus {
  isActive: boolean;
  expiresAt?: string;
  aiGenerations?: number;
  aiQuota?: number;
  pending?: boolean;
  pendingBillCode?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly paymentsUrl = `${environment.apiUrl}/payments`;
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';

  // Signals for reactive state
  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);

  constructor() {
    this.checkAuth();
  }

  /**
   * Check if user is authenticated on app init
   */
  private checkAuth(): void {
    const token = this.getAccessToken();
    if (token) {
      // Optionally validate token by calling /me endpoint
      this.isAuthenticated.set(true);
    }
  }

  /**
   * Register new user
   */
  register(data: RegisterRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  /**
   * Login user
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        this.setTokens(response.accessToken, response.refreshToken);
        this.currentUser.set(response.user);
        this.isAuthenticated.set(true);
      })
    );
  }

  /**
   * Logout user
   */
  logout(): void {
    this.clearTokens();
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
  }

  /**
   * Get current user info
   */
  me(): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${this.apiUrl}/me`).pipe(
      tap((response) => {
        this.currentUser.set(response.user);
        this.isAuthenticated.set(true);
      })
    );
  }

  /**
   * Refresh access token
   */
  refreshToken(): Observable<RefreshResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const payload: RefreshRequest = { refreshToken };
    return this.http.post<RefreshResponse>(`${this.apiUrl}/refresh`, payload).pipe(
      tap((response) => {
        this.setAccessToken(response.accessToken);
      })
    );
  }

  private refreshInFlight$: Observable<RefreshResponse> | null = null;

  /**
   * Same as refreshToken(), but coordinates concurrent callers (e.g. several
   * requests failing with 401 at once) so only one actual refresh call is made.
   */
  refreshTokenShared(): Observable<RefreshResponse> {
    if (!this.refreshInFlight$) {
      this.refreshInFlight$ = this.refreshToken().pipe(
        shareReplay(1),
        finalize(() => {
          this.refreshInFlight$ = null;
        })
      );
    }
    return this.refreshInFlight$;
  }

  /**
   * Decode the JWT payload to read the role without a server round-trip.
   * No signature verification — validation happens server-side on every API call.
   */
  getUserRole(): UserRole | null {
    const token = this.getAccessToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role as UserRole;
    } catch {
      return null;
    }
  }

  /**
   * Initiate a ToyyibPay subscription — returns a redirect URL
   */
  subscribe(name: string, plan: 'monthly' | 'weekly' = 'monthly'): Observable<{ redirectUrl: string; subscriptionId: number }> {
    return this.http.post<{ redirectUrl: string; subscriptionId: number }>(
      `${this.paymentsUrl}/subscribe`,
      { name, plan }
    );
  }

  /**
   * Get the current user's subscription status
   */
  getSubscriptionStatus(): Observable<SubscriptionStatus> {
    return this.http.get<SubscriptionStatus>(`${this.paymentsUrl}/status`);
  }

  /**
   * Request a password reset email
   */
  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/forgot-password`, { email });
  }

  /**
   * Complete a password reset using the token from the email link
   */
  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/reset-password`, { token, newPassword });
  }

  /**
   * Get access token from storage
   */
  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  /**
   * Get refresh token from storage
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Set tokens in storage
   */
  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  /**
   * Set access token only
   */
  private setAccessToken(accessToken: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
  }

  /**
   * Clear tokens from storage
   */
  private clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }
}

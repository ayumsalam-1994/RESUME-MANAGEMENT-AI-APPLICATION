import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * HTTP interceptor to attach JWT token to requests, and to transparently
 * refresh an expired access token on a 401 rather than letting every
 * component handle it (and show a raw error with an emptied form).
 * If the refresh itself fails, the session truly is over: log out and
 * redirect to login with a flag the login page can use to show a
 * friendly "please sign in again" message.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthEndpoint = req.url.includes('/auth/login') || req.url.includes('/auth/register');
  const isRefreshEndpoint = req.url.includes('/auth/refresh');

  const token = authService.getAccessToken();
  const authedReq = token && !isAuthEndpoint
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authedReq).pipe(
    catchError((error: unknown) => {
      const isUnauthorized = error instanceof HttpErrorResponse && error.status === 401;
      if (!isUnauthorized || isAuthEndpoint || isRefreshEndpoint || !authService.getRefreshToken()) {
        return throwError(() => error);
      }

      return authService.refreshTokenShared().pipe(
        switchMap((refreshed) => {
          const retriedReq = req.clone({ setHeaders: { Authorization: `Bearer ${refreshed.accessToken}` } });
          return next(retriedReq);
        }),
        catchError(() => {
          authService.logout();
          router.navigate(['/login'], { queryParams: { sessionExpired: '1' } });
          return throwError(() => error);
        })
      );
    })
  );
};

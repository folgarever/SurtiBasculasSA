import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();
  const isApiRequest = request.url.startsWith(environment.apiUrl) || request.url.includes('/api/');
  const esLogin = request.url.includes('/auth/login');

  const respuesta = (!token || !isApiRequest)
    ? next(request)
    : next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));

  return respuesta.pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || esLogin) return throwError(() => error);

      if (error.status === 401) {
        auth.logout();
        return throwError(() => error);
      }

      if (error.status === 403 && router.url !== '/dashboard') {
        void router.navigate(['/dashboard']);
      }

      return throwError(() => error);
    })
  );
};

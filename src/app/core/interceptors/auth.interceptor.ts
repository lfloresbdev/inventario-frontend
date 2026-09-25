import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { API_BASE } from '../../services/api-utils';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();
  const isApiRequest = req.url.startsWith(API_BASE) || req.url.startsWith('/api');

  let authedReq = isApiRequest ? req.clone({ withCredentials: true }) : req;
  if (token && isApiRequest) {
    authedReq = authedReq.clone({
      headers: authedReq.headers.set('Authorization', `Bearer ${token}`),
    });
  }

  return next(authedReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if ((err.status === 401 || err.status === 403) && !req.url.includes('/auth/')) {
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};

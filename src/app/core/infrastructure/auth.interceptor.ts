import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const rawToken = localStorage.getItem('mango81_token');
  let token = '';

  if (rawToken) {
    try {
      token = JSON.parse(rawToken);
    } catch {
      token = rawToken;
    }
  }

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  }

  return next(req);
};

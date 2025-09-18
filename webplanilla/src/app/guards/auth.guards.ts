import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  UrlTree
} from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    return this.authService.isLoggedIn$.pipe(
      take(1),
      map(isLoggedIn => {
        if (isLoggedIn) {
          // Verificar si se requiere un rol específico
          const requiredRole = route.data['role'];
          if (requiredRole) {
            const hasRole = this.authService.hasRole(requiredRole);
            if (!hasRole) {
              console.warn(`Acceso denegado. Se requiere rol: ${requiredRole}`);
              return this.router.createUrlTree(['/unauthorized']);
            }
          }
          return true;
        } else {
          console.warn('Usuario no autenticado. Redirigiendo al login...');
          return this.router.createUrlTree(['/login'], {
            queryParams: { returnUrl: state.url }
          });
        }
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class NoAuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.isLoggedIn$.pipe(
      take(1),
      map(isLoggedIn => {
        if (isLoggedIn) {
          // Si ya está logueado, redirigir al dashboard
          return this.router.createUrlTree(['/dashboard']);
        }
        return true;
      })
    );
  }
}
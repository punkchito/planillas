import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Obtener token del servicio de autenticación
    const token = this.authService.getToken();
    
    let authReq = req;
    
    // Agregar token a la petición si existe
    if (token) {
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    // Enviar petición y manejar errores de autenticación
    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Si hay un error 401 (No autorizado), cerrar sesión
        if (error.status === 401) {
          console.warn('Token expirado o inválido. Cerrando sesión...');
          this.authService.logout();
        }
        
        return throwError(() => error);
      })
    );
  }
}
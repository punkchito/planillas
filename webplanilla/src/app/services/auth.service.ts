import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import {
  User,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  ProfileResponse,
  ErrorResponse
} from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:3000/api';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'current_user';

  // Subject para el usuario actual
  private currentUserSubject = new BehaviorSubject<User | null>(this.getCurrentUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  // Subject para el estado de autenticación
  private isLoggedInSubject = new BehaviorSubject<boolean>(this.hasValidToken());
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  constructor(private http: HttpClient) {
    // Verificar token al inicializar el servicio
    this.checkTokenValidity();
  }

  /**
   * Iniciar sesión
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.setSession(response.data.token, response.data.user, credentials.remember);
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Registrar nuevo usuario
   */
  register(userData: RegisterData): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/register`, userData)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.setSession(response.data.token, response.data.user);
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Cerrar sesión
   */
  logout(): void {
    this.clearSession();
  }

  /**
   * Obtener perfil del usuario
   */
  getProfile(): Observable<ProfileResponse> {
    return this.http.get<ProfileResponse>(`${this.API_URL}/auth/profile`)
      .pipe(
        tap(response => {
          if (response.success) {
            this.currentUserSubject.next(response.data.user);
            localStorage.setItem(this.USER_KEY, JSON.stringify(response.data.user));
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
 * Verificar si el token es válido
 */
verifyToken(): Observable<boolean> {
  const token = this.getToken();
  if (!token) {
    return new Observable<boolean>(observer => {
      observer.next(false);
      observer.complete();
    });
  }

  return this.http.post<AuthResponse>(`${this.API_URL}/auth/verify-token`, {})
    .pipe(
      map(response => {
        if (response.success && response.data) {
          this.currentUserSubject.next(response.data.user);
          this.isLoggedInSubject.next(true);
          return true;
        }
        this.logout();
        return false;
      }),
      catchError(() => {
        this.logout();
        // Versión más simple usando of()
        return new Observable<boolean>(observer => {
          observer.next(false);
          observer.complete();
        });
      })
    );
}
  /**
   * Obtener token del localStorage
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Obtener usuario actual
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Verificar si el usuario tiene un rol específico
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user ? user.role === role : false;
  }

  /**
   * Verificar si es administrador
   */
  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  /**
   * Configurar sesión después del login
   */
  private setSession(token: string, user: User, remember = false): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    
    this.currentUserSubject.next(user);
    this.isLoggedInSubject.next(true);
  }

  /**
   * Limpiar sesión
   */
  private clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    
    this.currentUserSubject.next(null);
    this.isLoggedInSubject.next(false);
  }

  /**
   * Obtener usuario del localStorage
   */
  private getCurrentUserFromStorage(): User | null {
    try {
      const userStr = localStorage.getItem(this.USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  /**
   * Verificar si hay un token válido en localStorage
   */
  private hasValidToken(): boolean {
    return !!this.getToken();
  }

  /**
   * Verificar validez del token al inicializar
   */
  private checkTokenValidity(): void {
    if (this.hasValidToken()) {
      this.verifyToken().subscribe();
    }
  }

  /**
   * Manejar errores HTTP
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'Error desconocido';
    
    if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    console.error('Error en AuthService:', error);
    return throwError(() => new Error(errorMessage));
  }
}
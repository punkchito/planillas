import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, Event } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container">
      <!-- Spinner de carga global -->
      <div class="loading-spinner" *ngIf="isLoading">
        <div class="spinner"></div>
        <p>Cargando...</p>
      </div>
      
      <!-- Contenido de la aplicación -->
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      position: relative;
    }

    .loading-spinner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      gap: 1rem;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e1e5e9;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading-spinner p {
      color: #666;
      font-size: 1rem;
      margin: 0;
    }
  `]
})
export class AppComponent implements OnInit {
  title = 'Sistema de Planillas';
  isLoading = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Mostrar spinner durante navegación - VERSIÓN CORREGIDA
    this.router.events
      .pipe(
        filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd)
      )
      .subscribe((event: NavigationEnd) => {
        // Ocultar spinner cuando la navegación termine
        this.isLoading = false;
      });

    // Configurar título de la página dinámicamente - VERSIÓN CORREGIDA
    this.router.events
      .pipe(
        filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd)
      )
      .subscribe((event: NavigationEnd) => {
        this.updatePageTitle(event.url);
      });
  }

  /**
   * Actualizar título de la página según la ruta
   */
  private updatePageTitle(url: string): void {
    let title = 'Sistema de Planillas';
    
    if (url.includes('/login')) {
      title = 'Iniciar Sesión - Sistema de Planillas';
    } else if (url.includes('/dashboard')) {
      title = 'Dashboard - Sistema de Planillas';
    }
    
    document.title = title;
  }
}
// src/app/components/dashboard/dashboard.component.ts - ACTUALIZACIÓN
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

interface DashboardStats {
  totalWorkers: number;
  pendingPlanillas: number;
  pendingRequests: number;
  totalAmount: number;
  activePlanillas: number;
}

interface RecentActivity {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  icon: string;
  title: string;
  description: string;
  timestamp: Date;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  currentTime = new Date();
  currentDate = new Date();
  isLoading = false;

  stats: DashboardStats = {
    totalWorkers: 127,
    pendingPlanillas: 3,
    pendingRequests: 8,
    totalAmount: 245650,
    activePlanillas: 12
  };

  recentActivities: RecentActivity[] = [
    {
      id: '1',
      type: 'success',
      icon: '✅',
      title: 'Planilla de Julio procesada',
      description: 'Procesamiento exitoso para 127 trabajadores',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: '2',
      type: 'info',
      icon: '👤',
      title: 'Nuevo trabajador registrado',
      description: 'Carlos Mendoza ha sido agregado al sistema',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000)
    },
    {
      id: '3',
      type: 'warning',
      icon: '⏳',
      title: 'Contrato por vencer',
      description: 'Juan Pérez - Renovación hasta diciembre 2025',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000)
    },
    {
      id: '4',
      type: 'success',
      icon: '💾',
      title: 'Backup automático completado',
      description: 'Base de datos respaldada exitosamente',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000)
    },
    {
      id: '5',
      type: 'info',
      icon: '📝',
      title: 'Nueva solicitud de vacaciones',
      description: 'María González - Solicitud pendiente de aprobación',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Obtener usuario actual
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });

    // Configurar actualización de tiempo cada segundo
    this.initializeTimeUpdates();

    // Simular actualización de estadísticas cada 30 segundos
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateStats();
      });

    // Verificar autenticación
    this.verifyAuthentication();

    // Cargar datos iniciales
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializar actualizaciones de tiempo
   */
  private initializeTimeUpdates(): void {
    // Actualizar inmediatamente
    this.updateDateTime();

    // Actualizar cada segundo usando RxJS interval
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateDateTime();
      });
  }

  /**
   * Actualizar fecha y hora actual
   */
  private updateDateTime(): void {
    const now = new Date();
    this.currentTime = now;
    this.currentDate = now;
  }

  /**
   * Verificar que el usuario esté autenticado
   */
  private verifyAuthentication(): void {
    if (!this.currentUser) {
      this.authService.verifyToken()
        .pipe(takeUntil(this.destroy$))
        .subscribe(isValid => {
          if (!isValid) {
            this.router.navigate(['/login']);
          }
        });
    }
  }

  /**
   * Cargar datos del dashboard
   */
  private loadDashboardData(): void {
    this.isLoading = true;

    // Simular carga de datos
    setTimeout(() => {
      this.isLoading = false;
      this.animateCards();
    }, 1000);
  }

  /**
   * Animar las tarjetas al cargar
   */
  private animateCards(): void {
    const navCards = document.querySelectorAll('.nav-card');
    const statCards = document.querySelectorAll('.stat-card');

    navCards.forEach((card, index) => {
      (card as HTMLElement).style.setProperty('--delay', `${index * 100}ms`);
    });

    statCards.forEach((card, index) => {
      (card as HTMLElement).style.setProperty('--delay', `${index * 150}ms`);
    });
  }

  /**
   * Actualizar estadísticas (simulación)
   */
  private updateStats(): void {
    const randomChange = () => Math.floor(Math.random() * 3) - 1; // -1, 0, o 1

    this.stats = {
      ...this.stats,
      pendingPlanillas: Math.max(0, this.stats.pendingPlanillas + randomChange()),
      pendingRequests: Math.max(0, this.stats.pendingRequests + randomChange())
    };
  }

  /**
   * Cerrar sesión
   */
  logout(): void {
    const confirmLogout = confirm('¿Estás seguro de que deseas cerrar sesión?');
    if (confirmLogout) {
      this.isLoading = true;

      setTimeout(() => {
        this.authService.logout();
        this.router.navigate(['/login']);
      }, 500);
    }
  }

  /**
   * Navegar al perfil de usuario
   */
  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  /**
   * Navegar a un módulo específico
   */
  navigateToModule(module: string): void {
    switch (module) {
      case 'usuarios':
        this.router.navigate(['/usuarios']);
        break;
      case 'trabajadores':
        this.router.navigate(['/trabajadores']);
        break;
      case 'contratos':
        this.router.navigate(['/contratos']);
        break;
      case 'planillas':
        this.router.navigate(['/planillas']);
        break;
      case 'cargos':
        this.router.navigate(['/cargos']);
        break;
      case 'conceptos':
        this.router.navigate(['/conceptos']);
        break;
      case 'seguros':
        this.router.navigate(['/seguros']);
        break;
      case 'solicitudes':
        this.router.navigate(['/solicitudes']);
        break;
      case 'reportes':
        this.router.navigate(['/reportes']);
        break;
      case 'configuracion':
        this.router.navigate(['/configuracion']);
        break;
      case 'indicadores': // ← NUEVA NAVEGACIÓN AGREGADA
        this.router.navigate(['/indicadores']);
        break;
      case 'reports': // ← NUEVA NAVEGACIÓN AGREGADA
        this.router.navigate(['/reports']);
        break;
      default:
        console.warn(`Módulo no encontrado: ${module}`);
        this.showNotification(`Navegando a módulo: ${module.toUpperCase()}`, 'info');
    }
  }

  /**
   * Ejecutar acciones rápidas
   */
  quickAction(action: string): void {
    this.isLoading = true;

    setTimeout(() => {
      this.isLoading = false;

      switch (action) {
        case 'nueva-planilla':
          this.showNotification('Creando nueva planilla...', 'info');
          this.router.navigate(['/planillas/crear']);
          break;
        case 'agregar-empleado':
          this.showNotification('Formulario de nuevo empleado', 'info');
          this.router.navigate(['/trabajadores/crear']);
          break;
        case 'procesar-pagos':
          this.showNotification('Procesando pagos pendientes...', 'warning');
          this.router.navigate(['/planillas/procesar']);
          break;
        case 'generar-reporte':
          this.showNotification('Generando reporte mensual...', 'success');
          this.router.navigate(['/reportes/generar']);
          break;
        case 'nueva-solicitud':
          this.showNotification('Creando nueva solicitud...', 'info');
          this.router.navigate(['/solicitudes']);
          break;
        case 'backup':
          if (this.isAdmin()) {
            this.showNotification('Iniciando backup del sistema...', 'info');
            this.performBackup();
          }
          break;
        case 'indicadores': // ← NUEVA ACCIÓN RÁPIDA
          this.showNotification('Abriendo gestión de indicadores...', 'info');
          this.router.navigate(['/indicadores']);
          break;
        default:
          this.showNotification(`Ejecutando: ${action}`, 'info');
      }
    }, 800);
  }

  /**
   * Realizar backup del sistema (solo admin)
   */
  private performBackup(): void {
    if (!this.isAdmin()) return;

    // Simular proceso de backup
    this.showNotification('Backup iniciado correctamente', 'success');

    // Agregar actividad reciente
    const backupActivity: RecentActivity = {
      id: Date.now().toString(),
      type: 'success',
      icon: '💾',
      title: 'Backup manual ejecutado',
      description: `Iniciado por ${this.currentUser?.name}`,
      timestamp: new Date()
    };

    this.recentActivities.unshift(backupActivity);
    if (this.recentActivities.length > 5) {
      this.recentActivities.pop();
    }
  }

  /**
   * Mostrar notificación
   */
  private showNotification(message: string, type: 'success' | 'warning' | 'info' | 'error'): void {
    // En una aplicación real, esto mostraría un toast o snackbar
    console.log(`${type.toUpperCase()}: ${message}`);
  }

  /**
   * Obtener saludo según la hora
   */
  getGreeting(): string {
    const hour = this.currentTime.getHours();

    if (hour < 12) {
      return 'Buenos días';
    } else if (hour < 18) {
      return 'Buenas tardes';
    } else {
      return 'Buenas noches';
    }
  }

  /**
   * Verificar si el usuario es admin
   */
  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  /**
   * Formatear fecha completa
   */
  formatDate(date: Date = this.currentDate): string {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Formatear fecha corta
   */
  formatShortDate(date: Date = this.currentDate): string {
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  /**
   * Formatear hora
   */
  formatTime(date: Date = this.currentTime): string {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Formatear hora con segundos
   */
  formatTimeWithSeconds(date: Date = this.currentTime): string {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Formatear tiempo de actividad
   */
  formatActivityTime(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'Ahora mismo';
    } else if (diffMinutes < 60) {
      return `Hace ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    } else {
      return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Obtener iniciales del usuario
   */
  getUserInitials(): string {
    if (!this.currentUser?.name) return '??';

    const names = this.currentUser.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  }

  /**
   * Obtener color del avatar basado en el rol
   */
  getAvatarColor(): string {
    return this.isAdmin() ? '#dc2626' : '#059669';
  }

  /**
   * Obtener día de la semana en español
   */
  getDayOfWeek(): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[this.currentDate.getDay()];
  }

  /**
   * Obtener mes en español
   */
  getMonth(): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[this.currentDate.getMonth()];
  }

  /**
   * Refrescar datos del dashboard
   */
  refreshDashboard(): void {
    this.isLoading = true;

    // Simular refresh de datos
    setTimeout(() => {
      this.loadDashboardData();
      this.showNotification('Dashboard actualizado', 'success');
    }, 1000);
  }

  /**
   * Manejar errores
   */
  private handleError(error: any): void {
    console.error('Error en dashboard:', error);
    this.showNotification('Error al cargar datos del dashboard', 'error');
    this.isLoading = false;
  }
}
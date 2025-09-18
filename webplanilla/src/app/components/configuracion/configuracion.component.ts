// src/app/components/configuracion/configuracion.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { 
  ConfiguracionService, 
  GeneralConfig, 
  PlanillasConfig, 
  NotificationsConfig,
  SystemUser,
  Department,
  SystemLog
} from '../../services/configuracion.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-configuracion',
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.css']
})
export class ConfiguracionComponent implements OnInit, OnDestroy {
  // Estado del componente
  isLoading = false;
  currentSection = 'general';
  showModal = false;
  currentEditId: number | null = null;
  currentEditType: 'user' | 'department' | null = null;

  // Formularios
  generalForm?: FormGroup;
  planillasForm?: FormGroup;
  notificacionesForm?: FormGroup;
  userForm?: FormGroup;
  departmentForm?: FormGroup;

  // Datos
  generalConfig: GeneralConfig = {
    institution_name: '',
    institution_ruc: '',
    institution_address: '',
    institution_phone: '',
    institution_email: '',
    timezone: 'America/Lima',
    currency: 'PEN',
    fiscal_year: '2025'
  };

  planillasConfig: PlanillasConfig = {
    payroll_period: 'mensual',
    cutoff_day: 30,
    payment_day: 5,
    rounding_method: 'normal',
    decimal_places: 2,
    auto_process: true
  };

  notificacionesConfig: NotificationsConfig = {
    smtp_server: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    payroll_processed: true,
    contracts_expiring: true,
    new_requests: false,
    system_errors: true
  };

  users: SystemUser[] = [];
  departments: Department[] = [];
  logs: SystemLog[] = [];
  availableRoles: any[] = [];

  // Opciones para formularios
  readonly tiposMoneda = [
    { value: 'PEN', label: 'Soles Peruanos (S/)' },
    { value: 'USD', label: 'Dólares Americanos ($)' },
    { value: 'EUR', label: 'Euros (€)' }
  ];

  readonly zonasHorarias = [
    { value: 'America/Lima', label: 'Perú (UTC-5)' },
    { value: 'America/Bogota', label: 'Colombia (UTC-5)' },
    { value: 'America/Caracas', label: 'Venezuela (UTC-4)' }
  ];

  readonly tiposPeriodo = [
    { value: 'mensual', label: 'Mensual' },
    { value: 'quincenal', label: 'Quincenal' },
    { value: 'semanal', label: 'Semanal' }
  ];

  readonly metodosRedondeo = [
    { value: 'normal', label: 'Normal (0.5 hacia arriba)' },
    { value: 'up', label: 'Siempre hacia arriba' },
    { value: 'down', label: 'Siempre hacia abajo' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private configuracionService: ConfiguracionService,
    private authService: AuthService,
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================
  // INICIALIZACIÓN
  // ==================

  private initializeForms(): void {
    // Formulario de configuración general
    this.generalForm = this.formBuilder.group({
      institution_name: ['', [Validators.required, Validators.maxLength(200)]],
      institution_ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
      institution_address: ['', [Validators.required, Validators.maxLength(500)]],
      institution_phone: ['', [Validators.required, Validators.maxLength(20)]],
      institution_email: ['', [Validators.required, Validators.email]],
      timezone: ['America/Lima', Validators.required],
      currency: ['PEN', Validators.required],
      fiscal_year: ['2025', Validators.required]
    });

    // Formulario de configuración de planillas
    this.planillasForm = this.formBuilder.group({
      payroll_period: ['mensual', Validators.required],
      cutoff_day: [30, [Validators.required, Validators.min(1), Validators.max(31)]],
      payment_day: [5, [Validators.required, Validators.min(1), Validators.max(31)]],
      rounding_method: ['normal', Validators.required],
      decimal_places: [2, [Validators.required, Validators.min(2), Validators.max(4)]],
      auto_process: [true]
    });

    // Formulario de configuración de notificaciones
    this.notificacionesForm = this.formBuilder.group({
      smtp_server: ['', [Validators.required, Validators.maxLength(100)]],
      smtp_port: [587, [Validators.required, Validators.min(1), Validators.max(65535)]],
      smtp_user: ['', [Validators.required, Validators.email]],
      smtp_password: ['', Validators.maxLength(200)],
      payroll_processed: [true],
      contracts_expiring: [true],
      new_requests: [false],
      system_errors: [true]
    });

    // Formulario para usuarios
    this.userForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required],
      active: [true],
      dni: ['', Validators.pattern(/^\d{8}$/)],
      phone: ['', [Validators.minLength(6), Validators.maxLength(20)]],
      password: ['', [Validators.minLength(6), Validators.maxLength(50)]]
    });

    // Formulario para departamentos
    this.departmentForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', Validators.maxLength(500)],
      manager: [''],
      active: [true]
    });
  }

  private loadInitialData(): void {
    this.isLoading = true;
    
    Promise.all([
      this.loadGeneralConfig(),
      //this.loadPlanillasConfig(),
      //this.loadNotificationsConfig(),
      //this.loadUsers(),
      //this.loadDepartments(),
      //this.loadAvailableRoles(),
      //this.loadLogs()
    ]).finally(() => {
      this.isLoading = false;
    });
  }

  // ==================
  // CARGA DE DATOS
  // ==================

  private loadGeneralConfig(): Promise<void> {
    return new Promise((resolve) => {
      this.configuracionService.getGeneralConfig()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && response.data) {
              this.generalConfig = response.data;
              this.generalForm?.patchValue(response.data);
            }
            resolve();
          },
          error: (error) => {
            console.error('Error cargando configuración general:', error);
            this.showNotification('Error cargando configuración general', 'error');
            resolve();
          }
        });
    });
  }

  private loadPlanillasConfig(): Promise<void> {
    return new Promise((resolve) => {
      this.configuracionService.getPlanillasConfig()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && response.data) {
              this.planillasConfig = response.data;
              this.planillasForm?.patchValue(response.data);
            }
            resolve();
          },
          error: (error) => {
            console.error('Error cargando configuración de planillas:', error);
            resolve();
          }
        });
    });
  }

  private loadNotificationsConfig(): Promise<void> {
    return new Promise((resolve) => {
      this.configuracionService.getNotificationsConfig()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && response.data) {
              this.notificacionesConfig = response.data;
              this.notificacionesForm?.patchValue(response.data);
            }
            resolve();
          },
          error: (error) => {
            console.error('Error cargando configuración de notificaciones:', error);
            resolve();
          }
        });
    });
  }

  private loadUsers(): Promise<void> {
    return new Promise((resolve) => {
      this.configuracionService.getSystemUsers({ limit: 50 })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && response.data) {
              this.users = response.data;
            }
            resolve();
          },
          error: (error) => {
            console.error('Error cargando usuarios:', error);
            resolve();
          }
        });
    });
  }

  private loadDepartments(): Promise<void> {
    return new Promise((resolve) => {
      this.configuracionService.getDepartments()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && response.data) {
              this.departments = response.data;
            }
            resolve();
          },
          error: (error) => {
            console.error('Error cargando departamentos:', error);
            resolve();
          }
        });
    });
  }

  private loadAvailableRoles(): Promise<void> {
    return new Promise((resolve) => {
      this.configuracionService.getAvailableRoles()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && response.data) {
              this.availableRoles = response.data;
            }
            resolve();
          },
          error: (error) => {
            console.error('Error cargando roles:', error);
            resolve();
          }
        });
    });
  }

  private loadLogs(): Promise<void> {
    return new Promise((resolve) => {
      this.configuracionService.getSystemLogs({ limit: 20 })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && response.data) {
              this.logs = response.data;
            }
            resolve();
          },
          error: (error) => {
            console.error('Error cargando logs:', error);
            resolve();
          }
        });
    });
  }

  // ==================
  // NAVEGACIÓN
  // ==================

  showSection(sectionId: string): void {
    this.currentSection = sectionId;
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  // ==================
  // GESTIÓN DE FORMULARIOS
  // ==================

  saveGeneralConfig(): void {
    if (this.generalForm?.valid) {
      this.isLoading = true;
      const formData = this.generalForm.value;
      
      this.configuracionService.updateGeneralConfig(formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.generalConfig = { ...this.generalConfig, ...formData };
              this.showNotification('Configuración general guardada exitosamente', 'success');
            }
          },
          error: (error) => {
            console.error('Error guardando configuración general:', error);
            this.showNotification('Error guardando configuración general', 'error');
          },
          complete: () => {
            this.isLoading = false;
          }
        });
    }
  }

  savePlanillasConfig(): void {
    if (this.planillasForm?.valid) {
      this.isLoading = true;
      const formData = this.planillasForm.value;
      
      this.configuracionService.updatePlanillasConfig(formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.planillasConfig = { ...this.planillasConfig, ...formData };
              this.showNotification('Configuración de planillas guardada exitosamente', 'success');
            }
          },
          error: (error) => {
            console.error('Error guardando configuración de planillas:', error);
            this.showNotification('Error guardando configuración de planillas', 'error');
          },
          complete: () => {
            this.isLoading = false;
          }
        });
    }
  }

  saveNotificationsConfig(): void {
    if (this.notificacionesForm?.valid) {
      this.isLoading = true;
      const formData = this.notificacionesForm.value;
      
      this.configuracionService.updateNotificationsConfig(formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.notificacionesConfig = { ...this.notificacionesConfig, ...formData };
              this.showNotification('Configuración de notificaciones guardada exitosamente', 'success');
            }
          },
          error: (error) => {
            console.error('Error guardando configuración de notificaciones:', error);
            this.showNotification('Error guardando configuración de notificaciones', 'error');
          },
          complete: () => {
            this.isLoading = false;
          }
        });
    }
  }

  saveAllConfig(): void {
    Promise.all([
      this.generalForm?.valid ? this.saveGeneralConfig() : Promise.resolve(),
      this.planillasForm?.valid ? this.savePlanillasConfig() : Promise.resolve(),
      this.notificacionesForm?.valid ? this.saveNotificationsConfig() : Promise.resolve()
    ]).then(() => {
      this.showNotification('Toda la configuración guardada exitosamente', 'success');
    });
  }

  // ==================
  // GESTIÓN DE MODAL
  // ==================

  openUserModal(userId?: number): void {
    this.currentEditType = 'user';
    this.currentEditId = userId || null;

    if (userId) {
      const user = this.users.find(u => u.id === userId);
      if (user) {
        this.userForm?.patchValue({
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active,
          dni: user.dni,
          phone: user.phone
        });
      }
    } else {
      this.userForm?.reset({ active: true });
    }

    this.showModal = true;
  }

  openDepartmentModal(deptId?: number): void {
    this.currentEditType = 'department';
    this.currentEditId = deptId || null;

    if (deptId) {
      const dept = this.departments.find(d => d.id === deptId);
      if (dept) {
        this.departmentForm?.patchValue({
          name: dept.name,
          description: dept.description,
          manager: dept.manager,
          active: dept.active
        });
      }
    } else {
      this.departmentForm?.reset({ active: true });
    }

    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.currentEditType = null;
    this.currentEditId = null;
    this.userForm?.reset();
    this.departmentForm?.reset();
  }

  saveModalData(): void {
    if (this.currentEditType === 'user') {
      this.saveUser();
    } else if (this.currentEditType === 'department') {
      this.saveDepartment();
    }
  }

  // ==================
  // GESTIÓN DE USUARIOS
  // ==================

  saveUser(): void {
    if (!this.userForm?.valid) {
      this.showNotification('Por favor complete todos los campos requeridos', 'error');
      return;
    }

    this.isLoading = true;
    const formData = this.userForm.value;

    const request = this.currentEditId 
      ? this.configuracionService.updateUser(this.currentEditId, formData)
      : this.configuracionService.createUser(formData);

    request.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showNotification(
              `Usuario ${this.currentEditId ? 'actualizado' : 'creado'} exitosamente`, 
              'success'
            );
            this.closeModal();
            this.loadUsers();
          }
        },
        error: (error) => {
          console.error('Error guardando usuario:', error);
          this.showNotification('Error guardando usuario', 'error');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  toggleUserStatus(userId: number): void {
    const user = this.users.find(u => u.id === userId);
    if (!user) return;

    this.configuracionService.toggleUserStatus(userId, !user.active)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            user.active = !user.active;
            this.showNotification(
              `Usuario ${user.active ? 'activado' : 'desactivado'} exitosamente`, 
              'success'
            );
          }
        },
        error: (error) => {
          console.error('Error cambiando estado del usuario:', error);
          this.showNotification('Error cambiando estado del usuario', 'error');
        }
      });
  }

  deleteUser(userId: number): void {
    if (confirm('¿Está seguro de eliminar este usuario?')) {
      this.configuracionService.deleteUser(userId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.users = this.users.filter(u => u.id !== userId);
              this.showNotification('Usuario eliminado exitosamente', 'success');
            }
          },
          error: (error) => {
            console.error('Error eliminando usuario:', error);
            this.showNotification('Error eliminando usuario', 'error');
          }
        });
    }
  }

  // ==================
  // GESTIÓN DE DEPARTAMENTOS
  // ==================

  saveDepartment(): void {
    if (!this.departmentForm?.valid) {
      this.showNotification('Por favor complete todos los campos requeridos', 'error');
      return;
    }

    this.isLoading = true;
    const formData = this.departmentForm.value;

    const request = this.currentEditId 
      ? this.configuracionService.updateDepartment(this.currentEditId, formData)
      : this.configuracionService.createDepartment(formData);

    request.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showNotification(
              `Departamento ${this.currentEditId ? 'actualizado' : 'creado'} exitosamente`, 
              'success'
            );
            this.closeModal();
            this.loadDepartments();
          }
        },
        error: (error) => {
          console.error('Error guardando departamento:', error);
          this.showNotification('Error guardando departamento', 'error');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  toggleDepartmentStatus(deptId: number): void {
    const dept = this.departments.find(d => d.id === deptId);
    if (!dept) return;

    this.configuracionService.toggleDepartmentStatus(deptId, !dept.active)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            dept.active = !dept.active;
            this.showNotification(
              `Departamento ${dept.active ? 'activado' : 'desactivado'} exitosamente`, 
              'success'
            );
          }
        },
        error: (error) => {
          console.error('Error cambiando estado del departamento:', error);
          this.showNotification('Error cambiando estado del departamento', 'error');
        }
      });
  }

  deleteDepartment(deptId: number): void {
    if (confirm('¿Está seguro de eliminar este departamento?')) {
      this.configuracionService.deleteDepartment(deptId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.departments = this.departments.filter(d => d.id !== deptId);
              this.showNotification('Departamento eliminado exitosamente', 'success');
            }
          },
          error: (error) => {
            console.error('Error eliminando departamento:', error);
            this.showNotification('Error eliminando departamento', 'error');
          }
        });
    }
  }

  // ==================
  // UTILIDADES
  // ==================

  exportCSV(): void {
    this.configuracionService.exportUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `configuracion_${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          this.showNotification('Exportación completada', 'success');
        },
        error: (error) => {
          console.error('Error exportando:', error);
          this.showNotification('Error al exportar', 'error');
        }
      });
  }

  refreshLogs(): void {
    this.loadLogs();
    this.showNotification('Logs actualizados', 'success');
  }

  clearLogs(): void {
    if (confirm('¿Está seguro de limpiar los logs antiguos?')) {
      this.configuracionService.clearOldLogs(30)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.showNotification('Logs limpiados exitosamente', 'success');
              this.loadLogs();
            }
          },
          error: (error) => {
            console.error('Error limpiando logs:', error);
            this.showNotification('Error limpiando logs', 'error');
          }
        });
    }
  }

  private showNotification(message: string, type: 'success' | 'warning' | 'info' | 'error'): void {
    // En una aplicación real, esto mostraría un toast o snackbar
    console.log(`${type.toUpperCase()}: ${message}`);
    alert(message); // Temporal, puedes reemplazar con un servicio de notificaciones
  }

  logout(): void {
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }
}
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, forkJoin } from 'rxjs';

import {
  UsersService,
  User,
  Role,
  Permission,
  UsersFilters,
  EstadisticasResponse,
  ImportResult
} from '../../services/users.service';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css']
})
export class UsuariosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Estados de la vista
  loading = false;
  saving = false;
  importing = false;

  // Datos principales
  usuarios: User[] = [];
  selectedUsuario: User | null = null;
  roles: Role[] = [];
  permissions: Permission[] = [];
  estadisticas: any = null;

  // Paginación y filtros
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;

  filters: UsersFilters = {
    page: 1,
    limit: 10,
    status: '',
    sortBy: 'name',
    sortOrder: 'ASC'
  };

  // Formularios
  usuarioForm: FormGroup | undefined;
  roleForm: FormGroup | undefined;
  filtrosForm: FormGroup | undefined;

  // Estados de modales
  showModal = false;
  showDetailModal = false;
  showRoleModal = false;
  showImportModal = false;
  showPermissionsPanel = false;
  modalMode: 'create' | 'edit' = 'create';

  // Búsqueda
  private searchSubject = new Subject<string>();

  // Archivos de importación
  selectedFile: File | null = null;
  importResults: any = null;

  // Permisos y roles seleccionados
  selectedRole: string | null = null;
  selectedRolePermissions: Permission[] = [];

  constructor(
    private fb: FormBuilder,
    private usersService: UsersService
  ) {
    this.initializeForms();
    this.setupSearchDebounce();
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializar formularios
   */
  private initializeForms(): void {
    this.usuarioForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
      email: ['', [Validators.required, Validators.email]],
      password: [''], // Opcional para edición
      role: ['', Validators.required],
      dni: ['', [Validators.pattern(/^\d{8,12}$/)]],
      phone: [''],
      status: ['active']
    });

    this.roleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      type: ['user', Validators.required],
      description: ['', Validators.maxLength(500)]
    });

    this.filtrosForm = this.fb.group({
      search: [''],
      role: [''],
      status: [''],
      sortBy: ['name'],
      sortOrder: ['ASC']
    });
  }

  /**
   * Configurar debounce para búsqueda
   */
  private setupSearchDebounce(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(term => {
        this.filters.search = term;
        this.filters.page = 1;
        this.loadUsuarios();
      });

    // Escuchar cambios en filtros
    this.filtrosForm?.valueChanges
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(values => {
        this.applyFilters(values);
      });
  }

  /**
   * Cargar datos iniciales
   */
  private loadInitialData(): void {
    this.loading = true;

    // Cargar datos uno por uno para identificar qué falla
    this.usersService.getUsers(this.filters).subscribe({
        next: (usuariosResponse) => {
            console.log('Usuarios loaded:', usuariosResponse);
            if (usuariosResponse.success) {
                this.usuarios = usuariosResponse.data.users || [];
                this.updatePagination(usuariosResponse.data.pagination);
            }
            
            // Cargar roles
            this.usersService.getRoles().subscribe({
                next: (rolesResponse) => {
                    console.log('Roles loaded:', rolesResponse);
                    this.roles = Array.isArray(rolesResponse.data) ? rolesResponse.data : [];
                    
                    // Cargar estadísticas
                    this.usersService.getEstadisticas().subscribe({
                        next: (statsResponse) => {
                            console.log('Stats loaded:', statsResponse);
                            this.estadisticas = statsResponse.data;
                            this.loading = false;
                        },
                        error: (error) => {
                            console.error('Error loading stats:', error);
                            this.loading = false;
                        }
                    });
                },
                error: (error) => {
                    console.error('Error loading roles:', error);
                    this.loading = false;
                }
            });
        },
        error: (error) => {
            console.error('Error loading usuarios:', error);
            this.usuarios = [];
            this.loading = false;
        }
    });
}

  /**
   * Cargar usuarios con filtros
   */
  loadUsuarios(): void {
    this.loading = true;
    
    // Asegurar que los parámetros sean válidos
    const filters = {
        ...this.filters,
        page: this.filters.page || 1,
        limit: this.filters.limit || 10
    };
    
    console.log('Loading usuarios with filters:', filters);

    this.usersService.getUsers(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Users response:', response);
          if (response.success) {
            this.usuarios = response.data.users || [];
            this.updatePagination(response.data.pagination);
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading usuarios:', error);
          this.usuarios = [];
          this.loading = false;
          
          // Mostrar mensaje de error al usuario
          alert('Error cargando usuarios: ' + (error.error?.message || error.message));
        }
      });
}

  /**
   * Actualizar información de paginación
   */
  private updatePagination(pagination: any): void {
    this.currentPage = pagination.current_page;
    this.pageSize = pagination.per_page;
    this.totalItems = pagination.total;
    this.totalPages = pagination.total_pages;
  }

  /**
   * Aplicar filtros
   */
  applyFilters(filterValues: any): void {
    this.filters = {
      ...this.filters,
      page: 1,
      role: filterValues.role !== '' ? filterValues.role : undefined,
      status: filterValues.status !== '' ? filterValues.status : undefined,
      sortBy: filterValues.sortBy,
      sortOrder: filterValues.sortOrder
    };

    this.loadUsuarios();
  }

  /**
   * Manejar búsqueda
   */
  onSearch(term: string): void {
    this.searchSubject.next(term);
  }

  /**
   * Cambiar página
   */
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.filters.page = page;
      this.loadUsuarios();
    }
  }

  /**
   * Abrir modal para crear usuario
   */
  openCreateModal(): void {
    this.modalMode = 'create';
    this.usuarioForm?.reset();
    this.usuarioForm?.patchValue({
      status: 'active'
    });
    this.showModal = true;
  }

  /**
   * Abrir modal para editar usuario
   */
  openEditModal(usuario: User): void {
    this.modalMode = 'edit';
    this.loading = true;

    this.usersService.getUserById(usuario.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            const usuarioCompleto = response.data.user;

            this.selectedUsuario = usuarioCompleto;

            this.usuarioForm?.patchValue({
              name: usuarioCompleto.name,
              email: usuarioCompleto.email,
              role: usuarioCompleto.role,
              dni: usuarioCompleto.dni,
              phone: usuarioCompleto.phone,
              status: usuarioCompleto.status
              // No incluir password en edición
            });

            this.showModal = true;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading usuario details:', error);
          this.loading = false;
        }
      });
  }

  /**
   * Cerrar modal de formulario
   */
  closeModal(): void {
    this.showModal = false;
    this.usuarioForm?.reset();
    this.selectedUsuario = null;
  }

  /**
   * Guardar usuario (crear o actualizar)
   */
  onSave(): void {
    if (this.usuarioForm?.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.saving = true;
    const formData = this.usuarioForm?.value;

    const request = this.modalMode === 'create'
      ? this.usersService.createUser(formData)
      : this.usersService.updateUser(this.selectedUsuario!.id!, formData);

    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response.success) {
          this.closeModal();
          this.loadUsuarios();
          console.log(response.message);
        }
        this.saving = false;
      },
      error: (error) => {
        console.error('Error saving usuario:', error);
        this.saving = false;
      }
    });
  }

  /**
   * Marcar todos los campos del formulario como tocados
   */
  private markFormGroupTouched(): void {
    Object.keys(this.usuarioForm!.controls).forEach(key => {
      const control = this.usuarioForm?.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Ver detalles del usuario
   */
  viewUsuario(id: number): void {
    this.loading = true;
    this.usersService.getUserById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.selectedUsuario = response.data.user;
            this.showDetailModal = true;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading usuario details:', error);
          this.loading = false;
        }
      });
  }

  /**
   * Cambiar estado del usuario
   */
  toggleEstado(usuario: User): void {
    const nuevoEstado = usuario.status === 'active' ? 'inactive' : 'active';

    this.usersService.cambiarEstado(usuario.id!, nuevoEstado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            usuario.status = nuevoEstado;
            console.log(response.message);
          }
        },
        error: (error) => {
          console.error('Error changing status:', error);
        }
      });
  }

  /**
   * Eliminar usuario
   */
  deleteUsuario(usuario: User): void {
    if (confirm(`¿Está seguro que desea eliminar al usuario ${usuario.name}?`)) {
      this.usersService.deleteUser(usuario.id!)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.loadUsuarios();
              console.log(response.message);
            }
          },
          error: (error) => {
            console.error('Error deleting usuario:', error);
          }
        });
    }
  }

  /**
   * Seleccionar rol para gestión de permisos
   */
  selectRole(roleId: string): void {
    this.selectedRole = roleId;
    this.loading = true;

    this.usersService.getRolePermissions(roleId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.selectedRolePermissions = response.data;
            this.showPermissionsPanel = true;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading role permissions:', error);
          this.loading = false;
        }
      });
  }

  /**
   * Guardar permisos del rol
   */
  savePermissions(): void {
    if (!this.selectedRole) return;

    const permissionIds = this.selectedRolePermissions.map(p => p.id);
    
    this.usersService.updateRolePermissions(this.selectedRole, permissionIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            console.log('Permisos guardados exitosamente');
          }
        },
        error: (error) => {
          console.error('Error saving permissions:', error);
        }
      });
  }

  /**
   * Actualizar permiso
   */
  updatePermission(permissionId: string, hasPermission: boolean): void {
    if (hasPermission) {
      const permission = this.permissions.find(p => p.id === permissionId);
      if (permission && !this.selectedRolePermissions.find(p => p.id === permissionId)) {
        this.selectedRolePermissions.push(permission);
      }
    } else {
      this.selectedRolePermissions = this.selectedRolePermissions.filter(p => p.id !== permissionId);
    }
  }

  /**
   * Exportar usuarios a CSV
   */
  exportarCSV(): void {
    this.usersService.exportarCSV()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `usuarios_${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Error exporting CSV:', error);
        }
      });
  }

  /**
   * Manejar selección de archivo para importar
   */
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      this.selectedFile = file;
    } else {
      alert('Por favor seleccione un archivo CSV válido');
      this.selectedFile = null;
    }
  }

  /**
   * Importar usuarios desde CSV
   */
  importarCSV(): void {
    if (!this.selectedFile) {
      alert('Por favor seleccione un archivo CSV');
      return;
    }

    this.importing = true;
    
    // En una implementación real, aquí procesarías el archivo CSV
    // Por ahora simularemos el proceso
    setTimeout(() => {
      this.importing = false;
      this.selectedFile = null;
      this.showImportModal = false;
      this.loadUsuarios();
    }, 2000);
  }

  /**
   * Cerrar modal de importación
   */
  closeImportModal(): void {
    this.showImportModal = false;
    this.selectedFile = null;
    this.importResults = null;
  }

  /**
   * Cerrar modal de detalles
   */
  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedUsuario = null;
  }

  /**
   * Abrir modal para crear rol
   */
  openRoleModal(mode: 'create' | 'edit' = 'create'): void {
    this.modalMode = mode;
    if (mode === 'create') {
      this.roleForm?.reset();
      this.roleForm?.patchValue({ type: 'user' });
    }
    this.showRoleModal = true;
  }

  /**
   * Cerrar modal de rol
   */
  closeRoleModal(): void {
    this.showRoleModal = false;
    this.roleForm?.reset();
  }

  /**
   * Guardar rol
   */
  saveRole(): void {
    if (this.roleForm?.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.saving = true;
    const formData = this.roleForm?.value;

    this.usersService.createRole(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.closeRoleModal();
            this.loadInitialData(); // Recargar roles
            console.log(response.message);
          }
          this.saving = false;
        },
        error: (error) => {
          console.error('Error saving role:', error);
          this.saving = false;
        }
      });
  }

  /**
   * Obtener páginas para paginación
   */
  getPages(): number[] {
    const pages = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  /**
   * Función trackBy para optimización de rendimiento - Usuarios
   */
  trackByUsuario(index: number, usuario: User): any {
    return usuario.id || index;
  }

  /**
   * Función trackBy para optimización de rendimiento - Roles
   */
  trackByRole(index: number, role: Role): any {
    return role.id || index;
  }

  /**
   * Obtener cantidad de usuarios para un rol específico
   */
  getUserCountForRole(roleName: string): number {
    if (!this.estadisticas?.by_role) return 0;
    
    const roleStats = this.estadisticas.by_role.find((r: any) => r.role_name === roleName);
    return roleStats ? roleStats.user_count : 0;
  }

  /**
   * Verificar si un campo del formulario tiene errores
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.usuarioForm?.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * Obtener mensaje de error para un campo
   */
  getFieldError(fieldName: string): string {
    const field = this.usuarioForm?.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} es requerido`;
      if (field.errors['email']) return 'Email inválido';
      if (field.errors['pattern']) return 'Formato inválido';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['maxlength']) return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
    }
    return '';
  }

  /**
   * Helper methods para evitar errores de tipos
   */
  getControl(controlName: string): any {
    return this.usuarioForm?.get(controlName);
  }

  getControlValue(controlName: string): any {
    return this.usuarioForm?.get(controlName)?.value;
  }

  /**
   * Obtener texto del rol
   */
  getRoleDisplayName(roleId: string): string {
    const role = this.roles.find(r => r.id === roleId);
    return role ? role.name : roleId;
  }

  /**
   * Obtener iniciales del usuario
   */
  getUserInitials(name: string): string {
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  }

  /**
   * Formatear fecha
   */
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES');
  }

  /**
   * Formatear último acceso
   */
  formatLastLogin(date: string | null): string {
    if (!date) return 'Nunca';
    
    const loginDate = new Date(date);
    const now = new Date();
    const diff = now.getTime() - loginDate.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (days < 7) return `Hace ${days} día${days > 1 ? 's' : ''}`;
    return `Hace ${Math.floor(days / 7)} semana${Math.floor(days / 7) > 1 ? 's' : ''}`;
  }

  /**
   * Obtener clase del badge de rol
   */
  getRoleBadgeClass(roleType: string): string {
    switch (roleType) {
      case 'admin': return 'badge-admin';
      case 'user': return 'badge-user';
      case 'viewer': return 'badge-viewer';
      default: return 'badge-user';
    }
  }

  /**
   * Verificar si el permiso está activo
   */
  hasPermission(permissionId: string): boolean {
    return this.selectedRolePermissions.some(p => p.id === permissionId);
  }

  /**
   * Agrupar permisos por grupo
   */
  getPermissionGroups(): { [key: string]: Permission[] } {
    return this.permissions.reduce((groups, permission) => {
      const group = permission.group_id;
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(permission);
      return groups;
    }, {} as { [key: string]: Permission[] });
  }

  /**
   * Obtener nombre del grupo de permisos
   */
  getGroupName(groupId: string): string {
    const permission = this.permissions.find(p => p.group_id === groupId);
    return permission ? permission.group_name : groupId;
  }
}
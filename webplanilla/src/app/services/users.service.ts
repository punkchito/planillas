import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

// Interfaces
export interface User {
  id?: number;
  name: string;
  email: string;
  dni?: string;
  phone?: string;
  status: 'active' | 'inactive';
  role: string;
  role_name?: string;
  role_type?: string;
  last_login?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  created_by_name?: string;
  avatar?: string;
}

export interface Role {
  id: string;
  name: string;
  type: 'admin' | 'user' | 'viewer';
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Permission {
  id: string;
  name: string;
  group_id: string;
  group_name: string;
  description?: string;
}

export interface UsersResponse {
  success: boolean;
  data: {
    users: User[];
    pagination: {
      current_page: number;
      per_page: number;
      total: number;
      total_pages: number;
      has_next_page: boolean;
      has_prev_page: boolean;
    };
  };
  message?: string;
}

export interface UserResponse {
  success: boolean;
  data: {
    user: User;
    permissions: Permission[];
    recent_logs: AuditLog[];
  };
  message?: string;
}

export interface EstadisticasResponse {
  success: boolean;
  data: {
    general: {
      total_usuarios: number;
      usuarios_activos: number;
      usuarios_inactivos: number;
      total_roles: number;
      activos_ultima_semana: number;
      activos_ultimo_mes: number;
    };
    by_role: {
      role_name: string;
      role_type: string;
      user_count: number;
    }[];
  };
}

export interface AuditLog {
  id: number;
  user_id: number;
  action: 'login' | 'logout' | 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated' | 'role_changed';
  description: string;
  ip_address?: string;
  user_agent?: string;
  performed_by?: number;
  created_at: string;
  user_name?: string;
  user_email?: string;
  performed_by_name?: string;
}

export interface AuditLogsResponse {
  success: boolean;
  data: {
    logs: AuditLog[];
    pagination: {
      current_page: number;
      per_page: number;
      total: number;
      total_pages: number;
    };
  };
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  errors?: any[];
}

export interface UsersFilters {
  page?: number;
  limit?: number;
  role?: string;
  status?: 'active' | 'inactive' | '';
  search?: string;
  sortBy?: 'name' | 'email' | 'role' | 'status' | 'created_at' | 'last_login';
  sortOrder?: 'ASC' | 'DESC';
}

export interface ImportResult {
  imported: number;
  errors: number;
  error_details: string[];
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private readonly apiUrl = `${environment.apiUrl}/users`;
  private readonly rolesUrl = `${environment.apiUrl}/roles`;

  constructor(private http: HttpClient) {}

  // ========================
  // MÉTODOS DE USUARIOS
  // ========================

  /**
   * Obtener lista de usuarios con filtros y paginación
   */
  getUsers(filters: UsersFilters = {}): Observable<UsersResponse> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof UsersFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<UsersResponse>(this.apiUrl, { params });
  }

  /**
   * Obtener estadísticas de usuarios
   */
  getEstadisticas(): Observable<EstadisticasResponse> {
    return this.http.get<EstadisticasResponse>(`${this.apiUrl}/estadisticas`);
  }

  /**
   * Obtener usuario por ID
   */
  getUserById(id: number): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear nuevo usuario
   */
  createUser(user: User): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.apiUrl, user);
  }

  /**
   * Actualizar usuario
   */
  updateUser(id: number, user: Partial<User>): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/${id}`, user);
  }

  /**
   * Cambiar estado del usuario
   */
  cambiarEstado(id: number, status: 'active' | 'inactive'): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.apiUrl}/${id}/status`, { status });
  }

  /**
   * Eliminar usuario
   */
  deleteUser(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Exportar usuarios a CSV
   */
  exportarCSV(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export`, { 
      responseType: 'blob',
      observe: 'body'
    });
  }

  /**
   * Importar usuarios desde CSV
   */
  importarUsuarios(csvData: any[]): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/import`, { csvData });
  }

  /**
   * Obtener logs de auditoría
   */
  getAuditLogs(filters: {
    page?: number;
    limit?: number;
    userId?: number;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}): Observable<AuditLogsResponse> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof typeof filters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<AuditLogsResponse>(`${this.apiUrl}/audit-logs`, { params });
  }

  // ==================
  // MÉTODOS DE ROLES
  // ==================

  /**
   * Obtener todos los roles
   */
  getRoles(): Observable<{ success: boolean; data: Role[] }> {
    return this.http.get<{ success: boolean; data: Role[] }>(this.rolesUrl);
  }

  /**
   * Obtener rol por ID
   */
  getRoleById(id: string): Observable<{ success: boolean; data: Role }> {
    return this.http.get<{ success: boolean; data: Role }>(`${this.rolesUrl}/${id}`);
  }

  /**
   * Crear nuevo rol
   */
  createRole(role: { name: string; type: string; description?: string }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.rolesUrl, role);
  }

  /**
   * Actualizar rol
   */
  updateRole(id: string, role: { name?: string; type?: string; description?: string }): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.rolesUrl}/${id}`, role);
  }

  /**
   * Eliminar rol
   */
  deleteRole(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.rolesUrl}/${id}`);
  }

  /**
   * Obtener permisos de un rol
   */
  getRolePermissions(roleId: string): Observable<{ success: boolean; data: Permission[] }> {
    return this.http.get<{ success: boolean; data: Permission[] }>(`${this.rolesUrl}/${roleId}/permissions`);
  }

  /**
   * Actualizar permisos de un rol
   */
  updateRolePermissions(roleId: string, permissions: string[]): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.rolesUrl}/${roleId}/permissions`, { permissions });
  }

  // ====================
  // MÉTODOS DE PERMISOS
  // ====================

  /**
   * Obtener todos los permisos disponibles
   */
  getPermissions(): Observable<{ success: boolean; data: Permission[] }> {
    return this.http.get<{ success: boolean; data: Permission[] }>(`${environment.apiUrl}/permissions`);
  }

  // ====================
  // MÉTODOS DE UTILIDAD
  // ====================

  /**
   * Validar si existe un usuario con el email especificado
   */
  validarEmail(email: string, excludeId?: number): Observable<{ exists: boolean }> {
    let params = new HttpParams().set('email', email);
    if (excludeId) {
      params = params.set('exclude_id', excludeId.toString());
    }
    
    return this.http.get<{ exists: boolean }>(`${this.apiUrl}/validate-email`, { params });
  }

  /**
   * Validar si existe un usuario con el DNI especificado
   */
  validarDNI(dni: string, excludeId?: number): Observable<{ exists: boolean }> {
    let params = new HttpParams().set('dni', dni);
    if (excludeId) {
      params = params.set('exclude_id', excludeId.toString());
    }
    
    return this.http.get<{ exists: boolean }>(`${this.apiUrl}/validate-dni`, { params });
  }

  /**
   * Buscar usuarios por término de búsqueda
   */
  buscarUsuarios(termino: string, limit: number = 10): Observable<UsersResponse> {
    return this.getUsers({
      search: termino,
      limit,
      status: 'active'
    });
  }
}
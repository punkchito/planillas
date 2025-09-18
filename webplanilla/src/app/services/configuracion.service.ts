// src/app/services/configuracion.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

// Interfaces
export interface GeneralConfig {
  institution_name: string;
  institution_ruc: string;
  institution_address: string;
  institution_phone: string;
  institution_email: string;
  timezone: string;
  currency: string;
  fiscal_year: string;
}

export interface PlanillasConfig {
  payroll_period: string;
  cutoff_day: number;
  payment_day: number;
  rounding_method: string;
  decimal_places: number;
  auto_process: boolean;
}

export interface NotificationsConfig {
  smtp_server: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  payroll_processed: boolean;
  contracts_expiring: boolean;
  new_requests: boolean;
  system_errors: boolean;
}

export interface SystemUser {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  active: boolean;
  dni?: string;
  phone?: string;
  last_login?: string;
  created_at: string;
  created_by_name?: string;
}

export interface Department {
  id: number;
  name: string;
  description: string;
  manager: string;
  active: boolean;
  worker_count: number;
  position_count: number;
  created_at: string;
  updated_at: string;
}

export interface SystemLog {
  id: number;
  action: string;
  description: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
  performed_by_name?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalUsers: number;
    limit: number;
  };
}

export interface SystemStatistics {
  users: {
    total_users: number;
    active_users: number;
    inactive_users: number;
    admin_users: number;
  };
  workers: {
    total_workers: number;
    active_workers: number;
    total_areas: number;
  };
  payrolls: {
    total_payrolls: number;
    processed_payrolls: number;
    total_paid: number;
  };
  logs: {
    recent_logs: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ConfiguracionService {
  private readonly apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  // =====================================
  // CONFIGURACIÓN GENERAL
  // =====================================

  getGeneralConfig(): Observable<ApiResponse<GeneralConfig>> {
    return this.http.get<ApiResponse<GeneralConfig>>(`${this.apiUrl}/system-config/general`);
  }

  updateGeneralConfig(config: Partial<GeneralConfig>): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/system-config/general`, config);
  }

  // =====================================
  // CONFIGURACIÓN DE PLANILLAS
  // =====================================

  getPlanillasConfig(): Observable<ApiResponse<PlanillasConfig>> {
    return this.http.get<ApiResponse<PlanillasConfig>>(`${this.apiUrl}/system-config/planillas`);
  }

  updatePlanillasConfig(config: Partial<PlanillasConfig>): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/system-config/planillas`, config);
  }

  // =====================================
  // CONFIGURACIÓN DE NOTIFICACIONES
  // =====================================

  getNotificationsConfig(): Observable<ApiResponse<NotificationsConfig>> {
    return this.http.get<ApiResponse<NotificationsConfig>>(`${this.apiUrl}/system-config/notifications`);
  }

  updateNotificationsConfig(config: Partial<NotificationsConfig>): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/system-config/notifications`, config);
  }

  testSmtpConnection(testEmail: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/system-config/notifications/test`, {
      test_email: testEmail
    });
  }

  // =====================================
  // GESTIÓN DE USUARIOS DEL SISTEMA
  // =====================================

  getSystemUsers(filters: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  } = {}): Observable<ApiResponse<SystemUser[]>> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof typeof filters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<ApiResponse<SystemUser[]>>(`${this.apiUrl}/system-users`, { params });
  }

  getUserById(id: number): Observable<ApiResponse<SystemUser>> {
    return this.http.get<ApiResponse<SystemUser>>(`${this.apiUrl}/system-users/${id}`);
  }

  createUser(userData: Partial<SystemUser>): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/system-users`, userData);
  }

  updateUser(id: number, userData: Partial<SystemUser>): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/system-users/${id}`, userData);
  }

  toggleUserStatus(id: number, active: boolean): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.apiUrl}/system-users/${id}/status`, { active });
  }

  deleteUser(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/system-users/${id}`);
  }

  resetUserPassword(id: number, newPassword?: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/system-users/${id}/reset-password`, {
      new_password: newPassword
    });
  }

  getUserStatistics(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/system-users/statistics`);
  }

  exportUsers(filters: { role?: string; status?: string } = {}): Observable<Blob> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof typeof filters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get(`${this.apiUrl}/system-users/export`, { 
      params,
      responseType: 'blob'
    });
  }

  getAvailableRoles(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/system-users/roles`);
  }

  // =====================================
  // GESTIÓN DE DEPARTAMENTOS
  // =====================================

  getDepartments(status: string = 'all'): Observable<ApiResponse<Department[]>> {
    let params = new HttpParams();
    if (status !== 'all') {
      params = params.set('status', status);
    }
    return this.http.get<ApiResponse<Department[]>>(`${this.apiUrl}/departments`, { params });
  }

  getDepartmentById(id: number): Observable<ApiResponse<Department>> {
    return this.http.get<ApiResponse<Department>>(`${this.apiUrl}/departments/${id}`);
  }

  createDepartment(deptData: Partial<Department>): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/departments`, deptData);
  }

  updateDepartment(id: number, deptData: Partial<Department>): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/departments/${id}`, deptData);
  }

  toggleDepartmentStatus(id: number, active: boolean): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.apiUrl}/departments/${id}/status`, { active });
  }

  deleteDepartment(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/departments/${id}`);
  }

  getDepartmentStatistics(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/departments/statistics`);
  }

  // =====================================
  // LOGS Y AUDITORÍA
  // =====================================

  getSystemLogs(filters: {
    page?: number;
    limit?: number;
    level?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  } = {}): Observable<ApiResponse<SystemLog[]>> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof typeof filters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<ApiResponse<SystemLog[]>>(`${this.apiUrl}/system-config/logs`, { params });
  }

  clearOldLogs(days: number = 30): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/system-config/logs/clear`, {
      body: { days }
    });
  }

  exportLogs(filters: {
    dateFrom?: string;
    dateTo?: string;
    level?: string;
  } = {}): Observable<Blob> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof typeof filters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get(`${this.apiUrl}/system-config/logs/export`, { 
      params,
      responseType: 'blob'
    });
  }

  // =====================================
  // ESTADÍSTICAS GENERALES
  // =====================================

  getSystemStatistics(): Observable<ApiResponse<SystemStatistics>> {
    return this.http.get<ApiResponse<SystemStatistics>>(`${this.apiUrl}/system-config/statistics`);
  }

  getSystemHealth(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/system-config/health`);
  }

  // =====================================
  // IMPORTAR/EXPORTAR CONFIGURACIÓN
  // =====================================

  exportConfig(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/system-config/export`, { 
      responseType: 'blob'
    });
  }

  importConfig(settings: any, overwrite: boolean = false): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/system-config/import`, {
      settings,
      overwrite
    });
  }

  // =====================================
  // UTILIDADES
  // =====================================

  importCSV(file: File, endpoint: string): Observable<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse>(`${this.apiUrl}/${endpoint}/import`, formData);
  }

  downloadCSVTemplate(endpoint: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${endpoint}/plantilla-csv`, { 
      responseType: 'blob'
    });
  }
}
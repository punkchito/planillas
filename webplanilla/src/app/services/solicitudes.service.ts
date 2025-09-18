// src/app/services/solicitudes.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

// Interfaces
export interface Solicitud {
  id?: number;
  tipo_solicitud: 'vacaciones' | 'permiso' | 'licencia' | 'adelanto' | 'certificado' | 'otros';
  titulo: string;
  trabajador_id: number;
  solicitante?: string;
  empleado_dni?: string;
  fecha_creacion?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  motivo: string;
  estado: 'pendiente' | 'en-revision' | 'aprobada' | 'rechazada';
  urgencia: 'normal' | 'alta' | 'urgente';
  dias_solicitados?: number;
  horario?: string;
  monto?: number;
  proposito?: string;
  fecha_limite?: string;
  observaciones?: string;
  fecha_aprobacion?: string;
  fecha_rechazo?: string;
  area?: string;
  cargo?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SolicitudDetalle extends Solicitud {
  timeline?: TimelineItem[];
}

export interface TimelineItem {
  id?: number;
  solicitud_id: number;
  fecha: string;
  evento: 'created' | 'reviewed' | 'approved' | 'rejected' | 'updated' | 'reactivated';
  descripcion: string;
  usuario: string;
  observaciones?: string;
}

export interface TrabajadorBasico {
  id: number;
  dni: string;
  nombre_completo: string;
  cargo?: string;
  area?: string;
}

export interface SolicitudesResponse {
  success: boolean;
  data: Solicitud[];
  message?: string;
}

export interface SolicitudResponse {
  success: boolean;
  data: {
    solicitud: SolicitudDetalle;
    timeline: TimelineItem[];
  };
  message?: string;
}

export interface TrabajadoresActivosResponse {
  success: boolean;
  data: TrabajadorBasico[];
  message?: string;
}

export interface EstadisticasSolicitudesResponse {
  success: boolean;
  data: {
    total_solicitudes: number;
    pendientes: number;
    en_revision: number;
    aprobadas: number;
    rechazadas: number;
    vacaciones: number;
    permisos: number;
    licencias: number;
    adelantos: number;
    certificados: number;
    urgentes: number;
  };
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  errors?: any[];
}

export interface SolicitudesFilters {
  tipo?: 'vacaciones' | 'permiso' | 'licencia' | 'adelanto' | 'certificado' | 'otros' | 'todas';
  estado?: 'pendiente' | 'en-revision' | 'aprobada' | 'rechazada' | 'todos';
  fecha?: string;
  search?: string;
  sortBy?: 'fecha_creacion' | 'tipo_solicitud' | 'estado' | 'urgencia' | 'titulo';
  sortOrder?: 'ASC' | 'DESC';
  trabajador_id?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SolicitudesService {
  private readonly apiUrl = `${environment.apiUrl}/solicitudes`;

  constructor(private http: HttpClient) {}

  // ========================
  // MÉTODOS DE SOLICITUDES
  // ========================

  /**
   * Obtener lista de solicitudes con filtros
   */
  getSolicitudes(filters: SolicitudesFilters = {}): Observable<SolicitudesResponse> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof SolicitudesFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<SolicitudesResponse>(this.apiUrl, { params });
  }

  /**
   * Obtener solicitud específica con timeline
   */
  getSolicitudById(id: number): Observable<SolicitudResponse> {
    return this.http.get<SolicitudResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear nueva solicitud
   */
  createSolicitud(solicitud: Partial<Solicitud>): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.apiUrl, solicitud);
  }

  /**
   * Actualizar solicitud
   */
  updateSolicitud(id: number, solicitud: Partial<Solicitud>): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/${id}`, solicitud);
  }

  /**
   * Cambiar estado de solicitud (aprobar/rechazar)
   */
  cambiarEstado(id: number, estado: 'pendiente' | 'en-revision' | 'aprobada' | 'rechazada', observaciones?: string, usuario?: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.apiUrl}/${id}/estado`, {
      estado,
      observaciones,
      usuario
    });
  }

  /**
   * Reactivar solicitud rechazada
   */
  reactivarSolicitud(id: number, usuario?: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/${id}/reactivar`, { usuario });
  }

  /**
   * Eliminar solicitud
   */
  deleteSolicitud(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Obtener estadísticas de solicitudes
   */
  getEstadisticas(): Observable<EstadisticasSolicitudesResponse> {
    return this.http.get<EstadisticasSolicitudesResponse>(`${this.apiUrl}/estadisticas`);
  }

  /**
   * Obtener solicitudes pendientes de aprobación
   */
  getPendientesAprobacion(): Observable<SolicitudesResponse> {
    return this.http.get<SolicitudesResponse>(`${this.apiUrl}/pendientes`);
  }

  /**
   * Obtener historial de solicitudes procesadas
   */
  getHistorial(): Observable<SolicitudesResponse> {
    return this.http.get<SolicitudesResponse>(`${this.apiUrl}/historial`);
  }

  /**
   * Obtener trabajadores activos para select
   */
  getTrabajadoresActivos(): Observable<TrabajadoresActivosResponse> {
    return this.http.get<TrabajadoresActivosResponse>(`${this.apiUrl}/trabajadores`);
  }

  /**
   * Exportar solicitudes a CSV
   */
  exportarCSV(filters: SolicitudesFilters = {}): Observable<Blob> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof SolicitudesFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get(`${this.apiUrl}/export`, { 
      params,
      responseType: 'blob',
      observe: 'body'
    });
  }

  // ====================
  // MÉTODOS DE UTILIDAD
  // ====================

  /**
   * Buscar solicitudes por término
   */
  buscarSolicitudes(termino: string): Observable<SolicitudesResponse> {
    return this.getSolicitudes({
      search: termino
    });
  }

  /**
   * Obtener solicitudes de un trabajador específico (Mis Solicitudes)
   */
  getMisSolicitudes(trabajadorId: number): Observable<SolicitudesResponse> {
    return this.getSolicitudes({
      trabajador_id: trabajadorId
    });
  }

  /**
   * Validar datos de solicitud antes de enviar
   */
  validarSolicitud(solicitud: Partial<Solicitud>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!solicitud.tipo_solicitud) {
      errors.push('Tipo de solicitud es requerido');
    }

    if (!solicitud.trabajador_id) {
      errors.push('Trabajador solicitante es requerido');
    }

    if (!solicitud.motivo || solicitud.motivo.trim().length < 10) {
      errors.push('El motivo debe tener al menos 10 caracteres');
    }

    // Validaciones específicas por tipo
    if (solicitud.tipo_solicitud === 'vacaciones' || solicitud.tipo_solicitud === 'licencia') {
      if (!solicitud.fecha_inicio || !solicitud.fecha_fin) {
        errors.push('Fechas de inicio y fin son requeridas para vacaciones y licencias');
      } else if (new Date(solicitud.fecha_fin) <= new Date(solicitud.fecha_inicio)) {
        errors.push('La fecha de fin debe ser posterior a la fecha de inicio');
      }
    }

    if (solicitud.tipo_solicitud === 'adelanto') {
      if (!solicitud.monto || solicitud.monto <= 0) {
        errors.push('El monto del adelanto debe ser mayor a 0');
      }
    }

    if (solicitud.tipo_solicitud === 'certificado') {
      if (!solicitud.proposito) {
        errors.push('El propósito del certificado es requerido');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calcular días solicitados entre fechas
   */
  calcularDiasSolicitados(fechaInicio: string, fechaFin: string): number {
    if (!fechaInicio || !fechaFin) return 0;
    
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const diffTime = Math.abs(fin.getTime() - inicio.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Obtener título por tipo de solicitud
   */
  getTituloPorTipo(tipo: string): string {
    const titulos: { [key: string]: string } = {
      'vacaciones': 'Solicitud de Vacaciones',
      'permiso': 'Permiso',
      'licencia': 'Licencia Médica',
      'adelanto': 'Adelanto de Sueldo',
      'certificado': 'Certificado Laboral',
      'otros': 'Otros'
    };
    return titulos[tipo] || 'Solicitud';
  }

  /**
   * Obtener etiqueta de estado
   */
  getEstadoLabel(estado: string): string {
    const estados: { [key: string]: string } = {
      'pendiente': 'Pendiente',
      'en-revision': 'En Revisión',
      'aprobada': 'Aprobada',
      'rechazada': 'Rechazada'
    };
    return estados[estado] || estado;
  }

  /**
   * Obtener etiqueta de urgencia
   */
  getUrgenciaLabel(urgencia: string): string {
    const urgencias: { [key: string]: string } = {
      'normal': 'Normal',
      'alta': 'Alta',
      'urgente': 'Urgente'
    };
    return urgencias[urgencia] || urgencia;
  }
}
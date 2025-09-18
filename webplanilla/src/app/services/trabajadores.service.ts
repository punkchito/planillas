import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

// Interfaces
export interface Trabajador {
  id?: number;
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombre_completo?: string;
  fecha_nacimiento?: string;
  genero?: 'masculino' | 'femenino' | 'otro';
  estado_civil?: 'soltero' | 'casado' | 'divorciado' | 'viudo' | 'conviviente';
  nacionalidad?: string;
  direccion?: string;
  fecha_ingreso: string;
  cargo_id: number;
  area_id: number;
  sueldo_basico: number;
  tipo_contrato?: 'indefinido' | 'plazo_fijo' | 'temporal' | 'practicas';  // NUEVO
  fecha_fin?: string;  // NUEVO
  tipo_jornada?: 'tiempo_completo' | 'medio_tiempo' | 'por_horas';
  supervisor_directo_id?: number;
  essalud?: boolean;
  afp?: boolean;
  snp?: boolean;
  seguro_vida?: boolean;
  telefono_principal?: string;
  telefono_secundario?: string;
  correo_electronico?: string;
  correo_personal?: string;
  contacto_emergencia_nombre?: string;
  contacto_emergencia_relacion?: string;
  contacto_emergencia_telefono?: string;
  contacto_emergencia_correo?: string;
  estado?: 'activo' | 'inactivo';
  cargo?: string;
  area?: string;
  dias_servicio?: number;
  tiempo_servicio?: string;
  tiene_contrato_activo?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TrabajadorDetalle extends Trabajador {
  cargo_nombre?: string;
  area_nombre?: string;
  supervisor_nombre?: string;
  contratos?: Contrato[];
}

export interface Contrato {
  id: number;
  trabajador_id: number;
  tipo_contrato: string;
  fecha_inicio: string;
  fecha_fin?: string;
  estado: string;
  sueldo: number;
  created_at: string;
  updated_at: string;
}

export interface TrabajadoresResponse {
  success: boolean;
  data: {
    trabajadores: Trabajador[];
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

export interface TrabajadorResponse {
  success: boolean;
  data: {
    trabajador: TrabajadorDetalle;
    contratos: Contrato[];
  };
  message?: string;
}

export interface EstadisticasResponse {
  success: boolean;
  data: {
    total_trabajadores: number;
    trabajadores_activos: number;
    trabajadores_inactivos: number;
    con_contratos_activos: number;
  };
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  errors?: any[];
}

export interface TrabajadoresFilters {
  page?: number;
  limit?: number;
  cargo?: string;
  estado?: 'activo' | 'inactivo' | 'todos';
  area?: string;
  search?: string;
  sortBy?: 'nombres' | 'apellido_paterno' | 'fecha_ingreso' | 'sueldo_basico';
  sortOrder?: 'ASC' | 'DESC';
}

export interface Area {
  id: number;
  nombre: string;
  descripcion?: string;
  estado: 'activo' | 'inactivo';
}

export interface Cargo {
  id: number;
  nombre: string;
  descripcion?: string;
  area_id: number;
  area_nombre?: string;
  estado: 'activo' | 'inactivo';
}

@Injectable({
  providedIn: 'root'
})
export class TrabajadoresService {
  private readonly apiUrl = `${environment.apiUrl}/trabajadores`;
  private readonly areasUrl = `${environment.apiUrl}/areas`;
  private readonly cargosUrl = `${environment.apiUrl}/cargos`;

  constructor(private http: HttpClient) {}

  // ========================
  // MÉTODOS DE TRABAJADORES
  // ========================

  /**
   * Obtener lista de trabajadores con filtros y paginación
   */
  getTrabajadores(filters: TrabajadoresFilters = {}): Observable<TrabajadoresResponse> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof TrabajadoresFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<TrabajadoresResponse>(this.apiUrl, { params });
  }

  /**
   * Obtener estadísticas de trabajadores
   */
  getEstadisticas(): Observable<EstadisticasResponse> {
    return this.http.get<EstadisticasResponse>(`${this.apiUrl}/estadisticas`);
  }

  /**
   * Obtener trabajador por ID
   */
  getTrabajadorById(id: number): Observable<TrabajadorResponse> {
    return this.http.get<TrabajadorResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear nuevo trabajador
   */
  createTrabajador(trabajador: Trabajador): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.apiUrl, trabajador);
  }

  /**
   * Actualizar trabajador
   */
  updateTrabajador(id: number, trabajador: Partial<Trabajador>): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/${id}`, trabajador);
  }

  /**
   * Cambiar estado del trabajador
   */
  cambiarEstado(id: number, estado: 'activo' | 'inactivo'): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.apiUrl}/${id}/estado`, { estado });
  }

  /**
   * Eliminar trabajador
   */
  deleteTrabajador(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Exportar trabajadores a CSV
   */
  exportarCSV(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export`, { 
      responseType: 'blob',
      observe: 'body'
    });
  }

  /**
   * Descargar plantilla CSV
   */
  descargarPlantillaCSV(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/plantilla-csv`, { 
      responseType: 'blob',
      observe: 'body'
    });
  }

  /**
   * Importar trabajadores desde CSV
   */
  importarTrabajadores(file: File): Observable<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.post<ApiResponse>(`${this.apiUrl}/import`, formData);
  }

  // ==================
  // MÉTODOS DE ÁREAS
  // ==================

  /**
   * Obtener todas las áreas
   */
  getAreas(): Observable<{ success: boolean; data: Area[] }> {
    return this.http.get<{ success: boolean; data: Area[] }>(this.areasUrl);
  }

  /**
   * Obtener solo áreas activas
   */
  getAreasActivas(): Observable<{ success: boolean; data: Area[] }> {
    return this.http.get<{ success: boolean; data: Area[] }>(
      `${this.areasUrl}/activas`
    );
  }

  /**
   * Crear nueva área
   */
  createArea(area: { nombre: string; descripcion?: string }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.areasUrl, area);
  }

  /**
   * Actualizar área
   */
  updateArea(id: number, area: { nombre: string; descripcion?: string; estado?: string }): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.areasUrl}/${id}`, area);
  }

  // ==================
  // MÉTODOS DE CARGOS
  // ==================

  /**
   * Obtener todos los cargos
   */
  getCargos(areaId?: number): Observable<{ success: boolean; data: Cargo[] }> {
    let params = new HttpParams();
    if (areaId) {
      params = params.set('area_id', areaId.toString());
    }
    
    return this.http.get<{ success: boolean; data: Cargo[] }>(this.cargosUrl, { params });
  }

  /**
   * Obtener solo cargos activos
   */
  getCargosActivos(areaId?: number): Observable<{ success: boolean; data: Cargo[] }> {
    let params = new HttpParams();
    if (areaId) {
      params = params.set('area_id', areaId.toString());
    }
    
    return this.http.get<{ success: boolean; data: Cargo[] }>(
      `${this.cargosUrl}/activos`,
      { params }
    );
  }

  /**
   * Crear nuevo cargo
   */
  createCargo(cargo: { nombre: string; descripcion?: string; area_id: number }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.cargosUrl, cargo);
  }

  /**
   * Actualizar cargo
   */
  updateCargo(id: number, cargo: { nombre: string; descripcion?: string; area_id: number; estado?: string }): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.cargosUrl}/${id}`, cargo);
  }

  // ====================
  // MÉTODOS DE UTILIDAD
  // ====================

  /**
   * Obtener supervisores disponibles (trabajadores activos que pueden ser supervisores)
   */
  getSupervisores(): Observable<{ success: boolean; data: Trabajador[] }> {
    return this.http.get<{ success: boolean; data: Trabajador[] }>(
      `${this.apiUrl}?estado=activo&limit=100`
    );
  }

  /**
   * Validar si existe un trabajador con el DNI especificado
   */
  validarDNI(dni: string, excludeId?: number): Observable<{ exists: boolean }> {
    let params = new HttpParams().set('dni', dni);
    if (excludeId) {
      params = params.set('exclude_id', excludeId.toString());
    }
    
    return this.http.get<{ exists: boolean }>(`${this.apiUrl}/validate-dni`, { params });
  }

  /**
   * Buscar trabajadores por término de búsqueda
   */
  buscarTrabajadores(termino: string, limit: number = 10): Observable<TrabajadoresResponse> {
    return this.getTrabajadores({
      search: termino,
      limit,
      estado: 'activo'
    });
  }
}
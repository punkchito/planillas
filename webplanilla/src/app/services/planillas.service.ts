// src/app/services/planillas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

// Interfaces
export interface DetallePlanilla {
  trabajador_id: number;
  dni: string;
  nombre_completo: string;
  cargo: string;
  sueldo_basico: number;
  total_ingresos: number;
  total_descuentos: number;
  total_aportes: number;
  neto_pagar: number;
  conceptos_aplicados?: ConceptoAplicado[];
}

export interface ConceptoAplicado {
  concepto_id: number;
  codigo: string;
  nombre: string;
  tipo: 'ingreso' | 'descuento' | 'aporte';
  valor_calculado: number;
}

export interface Planilla {
  id?: number;
  periodo: string;
  tipo_planilla: 'regular' | 'aguinaldo' | 'gratificacion' | 'cts';
  tipo_personal: 'todos' | 'docente' | 'administrativo' | 'servicio';
  estado: 'borrador' | 'calculada' | 'procesada' | 'anulada';
  total_trabajadores: number;
  total_ingresos: number;
  total_descuentos: number;
  total_aportes: number;
  total_neto: number;
  fecha_proceso?: string;
  observaciones?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PlanillaCalculada {
  planilla: Planilla;
  detalle: DetallePlanilla[];
}

export interface PlanillasResponse {
  success: boolean;
  data: {
    planillas: Planilla[];
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

export interface PlanillaResponse {
  success: boolean;
  data: {
    planilla: Planilla;
    detalle: DetallePlanilla[];
  };
  message?: string;
}

export interface CalcularPlanillaRequest {
  periodo: string;
  tipo_planilla?: 'regular' | 'aguinaldo' | 'gratificacion' | 'cts';
  tipo_personal?: 'todos' | 'docente' | 'administrativo' | 'servicio';
}

export interface CalcularPlanillaResponse {
  success: boolean;
  data: PlanillaCalculada;
  message?: string;
}

export interface ProcesarPlanillaRequest {
  periodo: string;
  tipo_planilla?: 'regular' | 'aguinaldo' | 'gratificacion' | 'cts';
  tipo_personal?: 'todos' | 'docente' | 'administrativo' | 'servicio';
  detalle: DetallePlanilla[];
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  errors?: any[];
}

export interface PlanillasFilters {
  page?: number;
  limit?: number;
  tipo_planilla?: 'regular' | 'aguinaldo' | 'gratificacion' | 'cts' | 'todos';
  estado?: 'borrador' | 'calculada' | 'procesada' | 'anulada' | 'todos';
  desde_periodo?: string;
  hasta_periodo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PlanillasService {
  private readonly apiUrl = `${environment.apiUrl}/planillas`;

  constructor(private http: HttpClient) {}

  // ========================
  // MÉTODOS DE PLANILLAS
  // ========================

  /**
   * Calcular planilla (vista previa)
   */
  calcularPlanilla(request: CalcularPlanillaRequest): Observable<CalcularPlanillaResponse> {
    return this.http.post<CalcularPlanillaResponse>(`${this.apiUrl}/calcular`, request);
  }

  /**
   * Procesar planilla definitivamente
   */
  procesarPlanilla(request: ProcesarPlanillaRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/procesar`, request);
  }

  /**
   * Obtener historial de planillas con filtros
   */
  getHistorial(filters: PlanillasFilters = {}): Observable<PlanillasResponse> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof PlanillasFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<PlanillasResponse>(`${this.apiUrl}/historial`, { params });
  }

  /**
   * Obtener detalle de una planilla específica
   */
  getDetallePlanilla(id: number): Observable<PlanillaResponse> {
    return this.http.get<PlanillaResponse>(`${this.apiUrl}/${id}/detalle`);
  }

  /**
   * Obtener planilla por ID (alias para detalle)
   */
  getPlanillaById(id: number): Observable<PlanillaResponse> {
    return this.http.get<PlanillaResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Exportar planilla a CSV
   */
  exportarPlanillaCSV(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/export`, { 
      responseType: 'blob',
      observe: 'body'
    });
  }

  // ====================
  // MÉTODOS DE UTILIDAD
  // ====================

  /**
   * Buscar planillas por período
   */
  buscarPorPeriodo(periodo: string): Observable<PlanillasResponse> {
    return this.getHistorial({
      desde_periodo: periodo,
      hasta_periodo: periodo
    });
  }

  /**
   * Obtener planillas recientes
   */
  getPlanillasRecientes(limit: number = 10): Observable<PlanillasResponse> {
    return this.getHistorial({
      limit,
      page: 1
    });
  }

  /**
   * Validar período para nueva planilla
   */
  validarPeriodo(periodo: string, tipoPlanilla: string): Observable<{ puede_crear: boolean; mensaje?: string }> {
    const params = new HttpParams()
      .set('periodo', periodo)
      .set('tipo_planilla', tipoPlanilla);
    
    return this.http.get<{ puede_crear: boolean; mensaje?: string }>(`${this.apiUrl}/validar-periodo`, { params });
  }

  /**
   * Obtener estadísticas de planillas
   */
  getEstadisticas(): Observable<{ success: boolean; data: any }> {
    return this.http.get<{ success: boolean; data: any }>(`${this.apiUrl}/estadisticas`);
  }

  /**
   * Anular planilla
   */
  anularPlanilla(id: number, motivo?: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.apiUrl}/${id}/anular`, { motivo });
  }

  /**
   * Duplicar planilla
   */
  duplicarPlanilla(id: number, nuevoPeriodo: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/${id}/duplicar`, { periodo: nuevoPeriodo });
  }
}
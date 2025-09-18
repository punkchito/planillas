// src/app/services/indicadores.service.ts - CORREGIDO
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

// Interfaces
export interface Variable {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  total_dimensions?: number;
  total_indicators?: number;
  dimensions?: Dimension[];
  created_at?: string;
  updated_at?: string;
}

export interface Dimension {
  id: string;
  name: string;
  description?: string;
  variable_id: string;
  status: 'active' | 'inactive';
  total_indicators?: number;
  indicators?: Indicator[];
  variable_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Indicator {
  id: string;
  name: string;
  description?: string;
  dimension_id: string;
  type: 'porcentaje' | 'cantidad' | 'tiempo' | 'costo' | 'ratio';
  current_value: number;
  target_value: number;
  unit: string;
  formula?: string;
  status: 'active' | 'inactive';
  dimension_name?: string;
  variable_name?: string;
  performance_percentage?: number;
  status_level?: 'excellent' | 'good' | 'warning' | 'poor';
  historical_data?: number[];
  created_at?: string;
  updated_at?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
}

export interface DashboardStats {
  summary: {
    total_indicators: number;
    total_variables: number;
    total_dimensions: number;
    average_value: number;
    met_targets: number;
    critical_indicators: number;
  };
  dimension_stats: any[];
  top_indicators: any[];
  worst_indicators: any[];
}

export interface TreeStructure {
  variables: Variable[];
}

export interface TrendsReport {
  period_months: number;
  indicators: {
    id: string;
    name: string;
    unit: string;
    dimension_name: string;
    data: Array<{
      period: string;
      value: number;
    }>;
    trend: {
      change: number;
      change_percentage: number;
      direction: 'up' | 'down' | 'stable';
    };
  }[];
}

export interface IndicadoresFilters {
  dimensionId?: string;
  variableId?: string;
  type?: 'porcentaje' | 'cantidad' | 'tiempo' | 'costo' | 'ratio';
  status?: 'active' | 'inactive';
  includeHistorical?: boolean;
  search?: string;
  sortBy?: 'name' | 'type' | 'current_value' | 'target_value' | 'created_at';
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable({
  providedIn: 'root'
})
export class IndicadoresService {
  private readonly apiUrl = `${environment.apiUrl}/indicadores`;

  constructor(private http: HttpClient) {}

  // =============================
  // MÉTODOS DE VARIABLES
  // =============================

  /**
   * Obtener todas las variables
   */
  getVariables(includeStats: boolean = false): Observable<ApiResponse<Variable[]>> {
    let params = new HttpParams();
    if (includeStats) {
      params = params.set('includeStats', 'true');
    }
    return this.http.get<ApiResponse<Variable[]>>(`${this.apiUrl}/variables`, { params });
  }

  /**
   * Crear nueva variable
   */
  createVariable(variable: Partial<Variable>): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/variables`, variable);
  }

  /**
   * Actualizar variable
   */
  updateVariable(id: string, variable: Partial<Variable>): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/variables/${id}`, variable);
  }

  /**
   * Eliminar variable
   */
  deleteVariable(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/variables/${id}`);
  }

  // =============================
  // MÉTODOS DE DIMENSIONES
  // =============================

  /**
   * Obtener dimensiones con filtros
   */
  getDimensions(variableId?: string, includeIndicators: boolean = false): Observable<ApiResponse<Dimension[]>> {
    let params = new HttpParams();
    if (variableId) {
      params = params.set('variableId', variableId);
    }
    if (includeIndicators) {
      params = params.set('includeIndicators', 'true');
    }
    return this.http.get<ApiResponse<Dimension[]>>(`${this.apiUrl}/dimensions`, { params });
  }

  /**
   * Crear nueva dimensión - CORREGIDO
   */
  createDimension(dimension: Partial<Dimension>): Observable<ApiResponse> {
    // CORREGIDO: Mapear los campos correctamente para el backend
    const dimensionData = {
      id: dimension.id,
      name: dimension.name,
      description: dimension.description,
      variableId: dimension.variable_id || (dimension as any).variableId, // El backend espera 'variableId'
      status: dimension.status || 'active'
    };
    
    console.log('Datos enviados para crear dimensión:', dimensionData); // DEBUG
    return this.http.post<ApiResponse>(`${this.apiUrl}/dimensions`, dimensionData);
  }

  /**
   * Actualizar dimensión - CORREGIDO
   */
  updateDimension(id: string, dimension: Partial<Dimension>): Observable<ApiResponse> {
    // CORREGIDO: Mapear los campos correctamente para el backend
    const dimensionData = {
      name: dimension.name,
      description: dimension.description,
      variable_id: dimension.variable_id || (dimension as any).variableId, // El backend espera 'variable_id' para updates
      status: dimension.status
    };
    
    // Limpiar campos undefined
    Object.keys(dimensionData).forEach(key => {
      if (dimensionData[key as keyof typeof dimensionData] === undefined) {
        delete dimensionData[key as keyof typeof dimensionData];
      }
    });
    
    console.log('Datos enviados para actualizar dimensión:', dimensionData); // DEBUG
    return this.http.put<ApiResponse>(`${this.apiUrl}/dimensions/${id}`, dimensionData);
  }

  /**
   * Eliminar dimensión
   */
  deleteDimension(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/dimensions/${id}`);
  }

  // =============================
  // MÉTODOS DE INDICADORES
  // =============================

  /**
   * Obtener indicadores con filtros
   */
  getIndicators(filters: IndicadoresFilters = {}): Observable<ApiResponse<Indicator[]>> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof IndicadoresFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<ApiResponse<Indicator[]>>(this.apiUrl, { params });
  }

  /**
   * Obtener indicador por ID
   */
  getIndicatorById(id: string): Observable<ApiResponse<Indicator>> {
    return this.http.get<ApiResponse<Indicator>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear nuevo indicador - CORREGIDO
   */
  createIndicator(indicator: Partial<Indicator>): Observable<ApiResponse> {
    // CORREGIDO: Mapear los campos correctamente para el backend
    const indicatorData = {
      id: indicator.id,
      name: indicator.name,
      description: indicator.description,
      dimensionId: indicator.dimension_id || (indicator as any).dimensionId, // El backend espera 'dimensionId'
      type: indicator.type,
      currentValue: indicator.current_value || (indicator as any).currentValue, // El backend espera 'currentValue'
      targetValue: indicator.target_value || (indicator as any).targetValue, // El backend espera 'targetValue'
      unit: indicator.unit,
      formula: indicator.formula,
      status: indicator.status || 'active'
    };
    
    console.log('Datos enviados para crear indicador:', indicatorData); // DEBUG
    return this.http.post<ApiResponse>(this.apiUrl, indicatorData);
  }

  /**
   * Actualizar indicador - CORREGIDO
   */
  updateIndicator(id: string, indicator: Partial<Indicator>): Observable<ApiResponse> {
    // CORREGIDO: Mapear los campos correctamente para el backend
    const indicatorData = {
      name: indicator.name,
      description: indicator.description,
      dimension_id: indicator.dimension_id || (indicator as any).dimensionId,
      type: indicator.type,
      current_value: indicator.current_value || (indicator as any).currentValue,
      target_value: indicator.target_value || (indicator as any).targetValue,
      unit: indicator.unit,
      formula: indicator.formula,
      status: indicator.status
    };
    
    // Limpiar campos undefined
    Object.keys(indicatorData).forEach(key => {
      if (indicatorData[key as keyof typeof indicatorData] === undefined) {
        delete indicatorData[key as keyof typeof indicatorData];
      }
    });
    
    console.log('Datos enviados para actualizar indicador:', indicatorData); // DEBUG
    return this.http.put<ApiResponse>(`${this.apiUrl}/${id}`, indicatorData);
  }

  /**
   * Eliminar indicador
   */
  deleteIndicator(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`);
  }

  // =============================
  // DASHBOARD Y REPORTES
  // =============================

  /**
   * Obtener estadísticas del dashboard
   */
  getDashboardStats(): Observable<ApiResponse<DashboardStats>> {
    return this.http.get<ApiResponse<DashboardStats>>(`${this.apiUrl}/dashboard`);
  }

  /**
   * Obtener estructura del árbol - MEJORADO
   */
  getTreeStructure(): Observable<ApiResponse<Variable[]>> {
    return this.http.get<ApiResponse<Variable[]>>(`${this.apiUrl}/tree`);
  }

  /**
   * Obtener reporte de tendencias
   */
  getTrendsReport(months: number = 6): Observable<ApiResponse<TrendsReport>> {
    const params = new HttpParams().set('months', months.toString());
    return this.http.get<ApiResponse<TrendsReport>>(`${this.apiUrl}/trends`, { params });
  }

  /**
   * Validar fórmula
   */
  validateFormula(formula: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/validate-formula`, { formula });
  }

  /**
   * Exportar datos
   */
  exportData(type: 'indicators' | 'dimensions' | 'variables' = 'indicators'): Observable<Blob> {
    const params = new HttpParams().set('type', type);
    return this.http.get(`${this.apiUrl}/export`, { 
      params,
      responseType: 'blob',
      observe: 'body'
    });
  }

  // =============================
  // MÉTODOS DE UTILIDAD
  // =============================

  /**
   * Buscar indicadores por término
   */
  searchIndicators(searchTerm: string): Observable<ApiResponse<Indicator[]>> {
    return this.getIndicators({
      search: searchTerm,
      status: 'active'
    });
  }

  /**
   * Obtener indicadores por dimensión
   */
  getIndicatorsByDimension(dimensionId: string): Observable<ApiResponse<Indicator[]>> {
    return this.getIndicators({
      dimensionId,
      status: 'active',
      includeHistorical: true
    });
  }

  /**
   * Obtener indicadores por variable
   */
  getIndicatorsByVariable(variableId: string): Observable<ApiResponse<Indicator[]>> {
    return this.getIndicators({
      variableId,
      status: 'active',
      includeHistorical: true
    });
  }

  /**
   * Obtener métricas de rendimiento
   */
  getPerformanceMetrics(): Observable<ApiResponse<Indicator[]>> {
    return this.getIndicators({
      status: 'active',
      sortBy: 'current_value',
      sortOrder: 'DESC'
    });
  }
}
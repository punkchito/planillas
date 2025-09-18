// src/app/services/conceptos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

// Interfaces
export interface Concepto {
  id?: number;
  codigo: string;
  nombre: string;
  tipo_concepto: 'ingreso' | 'descuento' | 'aporte';
  tipo_calculo: 'fijo' | 'porcentual' | 'calculado' | 'variable';
  valor_fijo?: number;
  porcentaje?: number;
  formula?: string;
  orden: number;
  estado: 'activo' | 'inactivo';
  descripcion?: string;
  afecta_a?: string;
  created_at?: string;
  updated_at?: string;
}

export interface VariableFormula {
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: 'numeric' | 'string';
}

export interface ConceptosResponse {
  success: boolean;
  data: Concepto[];
  message?: string;
}

export interface ConceptoResponse {
  success: boolean;
  data: Concepto;
  message?: string;
}

export interface EstadisticasConceptosResponse {
  success: boolean;
  data: {
    total_conceptos: number;
    ingresos: number;
    descuentos: number;
    aportes: number;
    activos: number;
    inactivos: number;
  };
}

export interface VariablesResponse {
  success: boolean;
  data: VariableFormula[];
}

export interface ValidacionFormulaResponse {
  success: boolean;
  data: {
    formula: string;
    es_valida: boolean;
    variables_encontradas: string[];
    funciones_encontradas: string[];
    mensaje: string;
  };
}

export interface PruebaConceptoResponse {
  success: boolean;
  data: {
    concepto: string;
    codigo: string;
    tipo_calculo: string;
    datos_usados: any;
    resultado: number;
    formula_aplicada: string;
  };
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  errors?: any[];
}

export interface ConceptosFilters {
  tipo?: 'ingreso' | 'descuento' | 'aporte' | 'todos';
  estado?: 'activo' | 'inactivo' | 'todos';
  search?: string;
  sortBy?: 'codigo' | 'nombre' | 'tipo_concepto' | 'orden' | 'estado';
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable({
  providedIn: 'root'
})
export class ConceptosService {
  private readonly apiUrl = `${environment.apiUrl}/conceptos`;

  constructor(private http: HttpClient) {}

  // ========================
  // MÉTODOS DE CONCEPTOS
  // ========================

  /**
   * Obtener lista de conceptos con filtros
   */
  getConceptos(filters: ConceptosFilters = {}): Observable<ConceptosResponse> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof ConceptosFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<ConceptosResponse>(this.apiUrl, { params });
  }

  /**
   * Obtener conceptos por tipo específico
   */
  getConceptosPorTipo(tipo: 'ingreso' | 'descuento' | 'aporte'): Observable<ConceptosResponse> {
    return this.http.get<ConceptosResponse>(`${this.apiUrl}/tipo/${tipo}`);
  }

  /**
   * Obtener concepto por ID
   */
  getConceptoById(id: number): Observable<ConceptoResponse> {
    return this.http.get<ConceptoResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Obtener concepto por código
   */
  getConceptoByCodigo(codigo: string): Observable<ConceptoResponse> {
    return this.http.get<ConceptoResponse>(`${this.apiUrl}/codigo/${codigo}`);
  }

  /**
   * Crear nuevo concepto
   */
  createConcepto(concepto: Concepto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.apiUrl, concepto);
  }

  /**
   * Actualizar concepto
   */
  updateConcepto(id: number, concepto: Partial<Concepto>): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/${id}`, concepto);
  }

  /**
   * Cambiar estado del concepto
   */
  cambiarEstado(id: number, estado: 'activo' | 'inactivo'): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.apiUrl}/${id}/estado`, { estado });
  }

  /**
   * Eliminar concepto
   */
  deleteConcepto(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Probar concepto con datos de muestra
   */
  probarConcepto(id: number, datosPrueba?: any): Observable<PruebaConceptoResponse> {
    return this.http.post<PruebaConceptoResponse>(`${this.apiUrl}/${id}/probar`, {
      datos_prueba: datosPrueba
    });
  }

  /**
   * Validar fórmula
   */
  validarFormula(formula: string): Observable<ValidacionFormulaResponse> {
    return this.http.post<ValidacionFormulaResponse>(`${this.apiUrl}/validar-formula`, {
      formula
    });
  }

  /**
   * Obtener estadísticas de conceptos
   */
  getEstadisticas(): Observable<EstadisticasConceptosResponse> {
    return this.http.get<EstadisticasConceptosResponse>(`${this.apiUrl}/estadisticas`);
  }

  /**
   * Obtener variables disponibles para fórmulas
   */
  getVariablesFormula(): Observable<VariablesResponse> {
    return this.http.get<VariablesResponse>(`${this.apiUrl}/variables`);
  }

  /**
   * Exportar conceptos a CSV
   */
  exportarCSV(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export`, { 
      responseType: 'blob',
      observe: 'body'
    });
  }

  // ====================
  // MÉTODOS DE UTILIDAD
  // ====================

  /**
   * Buscar conceptos por término
   */
  buscarConceptos(termino: string): Observable<ConceptosResponse> {
    return this.getConceptos({
      search: termino,
      estado: 'activo'
    });
  }

  /**
   * Validar si existe un concepto con el código especificado
   */
  validarCodigo(codigo: string, excludeId?: number): Observable<{ exists: boolean }> {
    let params = new HttpParams().set('codigo', codigo);
    if (excludeId) {
      params = params.set('exclude_id', excludeId.toString());
    }
    
    return this.http.get<{ exists: boolean }>(`${this.apiUrl}/validate-codigo`, { params });
  }

  /**
   * Obtener siguiente número de orden para un tipo de concepto
   */
  getSiguienteOrden(tipo: 'ingreso' | 'descuento' | 'aporte'): Observable<{ siguiente_orden: number }> {
    return this.http.get<{ siguiente_orden: number }>(`${this.apiUrl}/siguiente-orden/${tipo}`);
  }

  /**
   * Descargar archivo de ejemplo para importación
   */
  descargarPlantillaCSV(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/plantilla-csv`, { 
      responseType: 'blob',
      observe: 'body'
    });
  }

  /**
   * Importar conceptos desde CSV
   */
  importarConceptos(file: File): Observable<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.post<ApiResponse>(`${this.apiUrl}/import`, formData);
  }
}
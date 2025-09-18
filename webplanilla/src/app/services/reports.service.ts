// src/app/services/reports.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface ReportFilters {
  periodo?: string;
  tipoPersonal?: string;
  area?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface DashboardStats {
  resumen_general: {
    total_trabajadores: number;
    trabajadores_activos: number;
    trabajadores_inactivos: number;
    salario_promedio: number;
    masa_salarial_total: number;
  };
  planillas_periodo: {
    total_planillas: number;
    trabajadores_en_planilla: number;
    total_ingresos: number;
    total_descuentos: number;
    total_neto: number;
  };
  estadisticas_areas: Array<{
    area_nombre: string;
    cantidad_empleados: number;
    salario_promedio: number;
    masa_salarial: number;
  }>;
  conceptos_frecuentes: Array<{
    nombre: string;
    tipo_concepto: string;
    frecuencia_uso: number;
    valor_promedio: number;
  }>;
  periodo_analizado: string;
  filtros_aplicados: ReportFilters;
}

export interface SummaryCards {
  total_salarios_brutos: {
    valor: number;
    cambio_porcentual: number;
    direccion: string;
    descripcion: string;
  };
  empleados_activos: {
    valor: number;
    cambio_absoluto: number;
    direccion: string;
    descripcion: string;
  };
  total_descuentos: {
    valor: number;
    cambio_porcentual: number;
    direccion: string;
    descripcion: string;
  };
  salario_promedio: {
    valor: number;
    cambio_porcentual: number;
    direccion: string;
    descripcion: string;
  };
}

export interface PayrollEvolution {
  evolucion: Array<{
    periodo: string;
    total_empleados: number;
    total_ingresos: number;
    total_descuentos: number;
    total_neto: number;
    salario_promedio: number;
  }>;
  meses_analizados: number;
  total_periodos: number;
}

export interface AreaDistribution {
  distribucion: Array<{
    area_nombre: string;
    cantidad_empleados: number;
    masa_salarial: number;
    salario_promedio: number;
    porcentaje: number;
  }>;
  total_areas: number;
  filtros_aplicados: ReportFilters;
}

export interface CostsAnalysis {
  salarios_brutos: number;
  descuentos: {
    afp: number;
    salud: number;
    otros: number;
    total: number;
  };
  salarios_netos: number;
  filtros_aplicados: ReportFilters;
}

export interface DetailByArea {
  detalle_areas: Array<{
    area_nombre: string;
    total_personal: number;
    sueldo_bruto: number;
    descuentos: number;
    sueldo_neto: number;
    promedio_persona: number;
    salario_minimo: number;
    salario_maximo: number;
    contratos_indefinidos: number;
    contratos_plazo_fijo: number;
  }>;
  total_areas: number;
  filtros_aplicados: ReportFilters;
}

export interface EmployeesDetail {
  empleados: Array<{
    id: number;
    dni: string;
    nombre_completo: string;
    area: string;
    cargo: string;
    sueldo_basico: number;
    tipo_contrato: string;
    fecha_ingreso: string;
    dias_servicio: number;
    estado: string;
    correo_electronico: string;
    telefono_principal: string;
  }>;
  total_empleados: number;
  filtros_aplicados: ReportFilters;
}

export interface FilterOptions {
  areas: Array<{
    id: number;
    nombre: string;
  }>;
  cargos: Array<{
    id: number;
    nombre: string;
  }>;
  tipos_personal: Array<{
    value: string;
    label: string;
  }>;
  periodos: Array<{
    value: string;
    label: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private apiUrl = `${environment.apiUrl}/reportes`;

  constructor(private http: HttpClient) {}

  // =============================
  // DASHBOARD Y ESTADÍSTICAS GENERALES
  // =============================

  getDashboardStats(filters?: ReportFilters): Observable<{ success: boolean; data: DashboardStats }> {
    const params = this.buildHttpParams(filters);
    return this.http.get<{ success: boolean; data: DashboardStats }>(`${this.apiUrl}/dashboard`, { params });
  }

  getSummaryCards(filters?: ReportFilters): Observable<{ success: boolean; data: SummaryCards }> {
    const params = this.buildHttpParams(filters);
    return this.http.get<{ success: boolean; data: SummaryCards }>(`${this.apiUrl}/summary`, { params });
  }

  // =============================
  // DATOS PARA GRÁFICOS
  // =============================

  getPayrollEvolution(meses: number = 12, filters?: ReportFilters): Observable<{ success: boolean; data: PayrollEvolution }> {
    const params = this.buildHttpParams({ ...filters, meses: meses.toString() });
    return this.http.get<{ success: boolean; data: PayrollEvolution }>(`${this.apiUrl}/payroll-evolution`, { params });
  }

  getAreaDistribution(filters?: ReportFilters): Observable<{ success: boolean; data: AreaDistribution }> {
    const params = this.buildHttpParams(filters);
    return this.http.get<{ success: boolean; data: AreaDistribution }>(`${this.apiUrl}/area-distribution`, { params });
  }

  getCostsAnalysis(filters?: ReportFilters): Observable<{ success: boolean; data: CostsAnalysis }> {
    const params = this.buildHttpParams(filters);
    return this.http.get<{ success: boolean; data: CostsAnalysis }>(`${this.apiUrl}/costs-analysis`, { params });
  }

  getTrends(meses: number = 12, filters?: ReportFilters): Observable<{ success: boolean; data: any }> {
    const params = this.buildHttpParams({ ...filters, meses: meses.toString() });
    return this.http.get<{ success: boolean; data: any }>(`${this.apiUrl}/trends`, { params });
  }

  // =============================
  // TABLAS DETALLADAS
  // =============================

  getDetailByArea(filters?: ReportFilters): Observable<{ success: boolean; data: DetailByArea }> {
    const params = this.buildHttpParams(filters);
    return this.http.get<{ success: boolean; data: DetailByArea }>(`${this.apiUrl}/detail-by-area`, { params });
  }

  getEmployeesDetail(filters?: ReportFilters): Observable<{ success: boolean; data: EmployeesDetail }> {
    const params = this.buildHttpParams(filters);
    return this.http.get<{ success: boolean; data: EmployeesDetail }>(`${this.apiUrl}/employees-detail`, { params });
  }

  getPayrollHistory(limite: number = 20): Observable<{ success: boolean; data: any }> {
    const params = new HttpParams().set('limite', limite.toString());
    return this.http.get<{ success: boolean; data: any }>(`${this.apiUrl}/payroll-history`, { params });
  }

  // =============================
  // EXPORTACIÓN
  // =============================

  exportCompletePDF(filters?: ReportFilters): Observable<{ success: boolean; data: any }> {
    const params = this.buildHttpParams(filters);
    return this.http.post<{ success: boolean; data: any }>(`${this.apiUrl}/export/pdf`, {}, { params });
  }

  exportToExcel(filters?: ReportFilters): Observable<{ success: boolean; data: any }> {
    const params = this.buildHttpParams(filters);
    return this.http.post<{ success: boolean; data: any }>(`${this.apiUrl}/export/excel`, {}, { params });
  }

  exportTablePDF(tabla: string, filters?: ReportFilters): Observable<{ success: boolean; data: any }> {
    const params = this.buildHttpParams({ ...filters, tabla });
    return this.http.post<{ success: boolean; data: any }>(`${this.apiUrl}/export/table-pdf`, {}, { params });
  }

  exportTableExcel(tabla: string, filters?: ReportFilters): Observable<{ success: boolean; data: any }> {
    const params = this.buildHttpParams({ ...filters, tabla });
    return this.http.post<{ success: boolean; data: any }>(`${this.apiUrl}/export/table-excel`, {}, { params });
  }

  // =============================
  // REPORTES ESPECÍFICOS
  // =============================

  generatePayrollReport(formato: string, detallado: boolean = false): Observable<{ success: boolean; data: any }> {
    const params = new HttpParams()
      .set('formato', formato)
      .set('detallado', detallado.toString());
    return this.http.post<{ success: boolean; data: any }>(`${this.apiUrl}/generate/payroll`, {}, { params });
  }

  generateStaffReport(formato: string, incluirHistorial: boolean = false): Observable<{ success: boolean; data: any }> {
    const params = new HttpParams()
      .set('formato', formato)
      .set('incluirHistorial', incluirHistorial.toString());
    return this.http.post<{ success: boolean; data: any }>(`${this.apiUrl}/generate/staff`, {}, { params });
  }

  generateFinancialReport(formato: string, incluirProyecciones: boolean = false): Observable<{ success: boolean; data: any }> {
    const params = new HttpParams()
      .set('formato', formato)
      .set('incluirProyecciones', incluirProyecciones.toString());
    return this.http.post<{ success: boolean; data: any }>(`${this.apiUrl}/generate/financial`, {}, { params });
  }

  generateExecutiveReport(formato: string, incluirGraficos: boolean = true): Observable<{ success: boolean; data: any }> {
    const params = new HttpParams()
      .set('formato', formato)
      .set('incluirGraficos', incluirGraficos.toString());
    return this.http.post<{ success: boolean; data: any }>(`${this.apiUrl}/generate/executive`, {}, { params });
  }

  generateComparativeReport(formato: string, periodoComparacion: string = 'trimestre-anterior'): Observable<{ success: boolean; data: any }> {
    const params = new HttpParams()
      .set('formato', formato)
      .set('periodoComparacion', periodoComparacion);
    return this.http.post<{ success: boolean; data: any }>(`${this.apiUrl}/generate/comparative`, {}, { params });
  }

  generateCustomReport(formato: string, customConfig: any): Observable<{ success: boolean; data: any }> {
    const params = new HttpParams().set('formato', formato);
    return this.http.post<{ success: boolean; data: any }>(`${this.apiUrl}/generate/custom`, customConfig, { params });
  }

  // =============================
  // RUTAS AUXILIARES
  // =============================

  getFilterOptions(): Observable<{ success: boolean; data: FilterOptions }> {
    return this.http.get<{ success: boolean; data: FilterOptions }>(`${this.apiUrl}/filters/options`);
  }

  getAvailablePeriods(): Observable<{ success: boolean; data: any }> {
    return this.http.get<{ success: boolean; data: any }>(`${this.apiUrl}/periods/available`);
  }

  getQuickStats(): Observable<{ success: boolean; data: any }> {
    return this.http.get<{ success: boolean; data: any }>(`${this.apiUrl}/stats/quick`);
  }

  // =============================
  // FUNCIONES AUXILIARES
  // =============================

  private buildHttpParams(filters?: ReportFilters & { [key: string]: any }): HttpParams {
    let params = new HttpParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] != null && filters[key] !== '') {
          params = params.set(key, filters[key].toString());
        }
      });
    }
    
    return params;
  }

  // Utilidades para formateo
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  }

  formatPercentage(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'percent',
      minimumFractionDigits: 1
    }).format(value / 100);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('es-PE').format(value);
  }
}
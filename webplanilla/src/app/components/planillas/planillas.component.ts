// src/app/components/planillas/planillas.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import {
  PlanillasService,
  Planilla,
  DetallePlanilla,
  PlanillaCalculada,
  PlanillasFilters,
  CalcularPlanillaRequest,
  ProcesarPlanillaRequest
} from '../../services/planillas.service';

import { TrabajadoresService, Trabajador } from '../../services/trabajadores.service';
import { ConceptosService, Concepto } from '../../services/conceptos.service';

@Component({
  selector: 'app-planillas',
  templateUrl: './planillas.component.html',
  styleUrls: ['./planillas.component.css']
})
export class PlanillasComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Estados principales
  isLoading = false;
  isSaving = false;
  isCalculating = false;
  isProcessing = false;

  // Tabs
  currentTab: 'procesar' | 'historial' | 'estadisticas' = 'procesar';

  // Datos
  planillas: Planilla[] = [];
  planillaCalculada: PlanillaCalculada | null = null;
  planillaSeleccionada: Planilla | null = null;
  detallePlanilla: DetallePlanilla[] = [];
  trabajadores: Trabajador[] = [];
  conceptos: Concepto[] = [];
  estadisticas: any = {};

  // Formularios
  procesarForm: FormGroup;
  filtrosForm: FormGroup;

  // Paginación
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;

  // Filtros
  filters: PlanillasFilters = {
    page: 1,
    limit: 10,
    tipo_planilla: 'todos',
    estado: 'todos'
  };

  // Modales
  showDetailModal = false;
  showProcessModal = false;

  // Opciones para formularios
  readonly tiposPlanilla = [
    { value: 'regular', label: 'Planilla Regular' },
    { value: 'aguinaldo', label: 'Aguinaldo' },
    { value: 'gratificacion', label: 'Gratificación' },
    { value: 'cts', label: 'CTS' }
  ];

  readonly tiposPersonal = [
    { value: 'todos', label: 'Todos los trabajadores' },
    { value: 'docente', label: 'Solo Docentes' },
    { value: 'administrativo', label: 'Solo Administrativos' },
    { value: 'servicio', label: 'Solo Personal de Servicio' }
  ];

  readonly estadosPlanilla = [
    { value: 'todos', label: 'Todos los estados' },
    { value: 'borrador', label: 'Borrador' },
    { value: 'calculada', label: 'Calculada' },
    { value: 'procesada', label: 'Procesada' },
    { value: 'anulada', label: 'Anulada' }
  ];

  constructor(
    private planillasService: PlanillasService,
    private trabajadoresService: TrabajadoresService,
    private conceptosService: ConceptosService,
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    this.procesarForm = this.initializeProcesarForm();
    this.filtrosForm = this.initializeFiltrosForm();
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupFormSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================
  // INICIALIZACIÓN
  // ==================

  private initializeProcesarForm(): FormGroup {
    const currentDate = new Date();
    const currentMonth = currentDate.toISOString().slice(0, 7);

    return this.formBuilder.group({
      periodo: [currentMonth, Validators.required],
      tipo_planilla: ['regular', Validators.required],
      tipo_personal: ['todos', Validators.required],
      observaciones: ['']
    });
  }

  private initializeFiltrosForm(): FormGroup {
    return this.formBuilder.group({
      tipo_planilla: ['todos'],
      estado: ['todos'],
      desde_periodo: [''],
      hasta_periodo: ['']
    });
  }

  private setupFormSubscriptions(): void {
    // Resetear cálculo cuando cambian los parámetros
    this.procesarForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.planillaCalculada = null;
      });

    // Filtros de historial
    this.filtrosForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((values) => {
        this.applyFilters(values);
      });
  }

  private loadInitialData(): void {
    this.isLoading = true;
    
    Promise.all([
      this.loadPlanillasHistorial(),
      this.loadEstadisticas()
    ]).finally(() => {
      this.isLoading = false;
    });
  }

  // ==================
  // CARGA DE DATOS
  // ==================

  private loadPlanillasHistorial(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.planillasService.getHistorial(this.filters)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.planillas = response.data.planillas;
              this.updatePagination(response.data.pagination);
            }
            resolve();
          },
          error: (error) => {
            console.error('Error cargando historial:', error);
            this.showNotification('Error cargando historial de planillas', 'error');
            reject(error);
          }
        });
    });
  }

  private loadEstadisticas(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.planillasService.getEstadisticas()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.estadisticas = response.data;
            }
            resolve();
          },
          error: (error) => {
            console.error('Error cargando estadísticas:', error);
            reject(error);
          }
        });
    });
  }

  private updatePagination(pagination: any): void {
    this.currentPage = pagination.current_page;
    this.pageSize = pagination.per_page;
    this.totalItems = pagination.total;
    this.totalPages = pagination.total_pages;
  }

  // ==================
  // NAVEGACIÓN DE TABS
  // ==================

  showTab(tabId: 'procesar' | 'historial' | 'estadisticas'): void {
    this.currentTab = tabId;
    
    if (tabId === 'historial' && this.planillas.length === 0) {
      this.loadPlanillasHistorial();
    }
  }

  // ==================
  // PROCESAMIENTO DE PLANILLAS
  // ==================

  calcularPlanilla(): void {
    if (this.procesarForm.invalid) {
      this.showNotification('Por favor complete todos los campos requeridos', 'warning');
      return;
    }

    this.isCalculating = true;
    const formData = this.procesarForm.value;

    const request: CalcularPlanillaRequest = {
      periodo: formData.periodo,
      tipo_planilla: formData.tipo_planilla,
      tipo_personal: formData.tipo_personal
    };

    this.planillasService.calcularPlanilla(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.planillaCalculada = response.data;
            this.showNotification('Planilla calculada exitosamente', 'success');
          }
        },
        error: (error) => {
          console.error('Error calculando planilla:', error);
          this.showNotification('Error al calcular la planilla', 'error');
        },
        complete: () => {
          this.isCalculating = false;
        }
      });
  }

  procesarPlanilla(): void {
    if (!this.planillaCalculada) {
      this.showNotification('Primero debe calcular la planilla', 'warning');
      return;
    }

    const confirmMessage = `¿Está seguro que desea procesar esta planilla?

Período: ${this.planillaCalculada.planilla.periodo}
Trabajadores: ${this.planillaCalculada.planilla.total_trabajadores}
Total neto: S/ ${this.planillaCalculada.planilla.total_neto.toFixed(2)}

Una vez procesada no podrá modificarse.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    this.isProcessing = true;
    const formData = this.procesarForm.value;

    const request: ProcesarPlanillaRequest = {
      periodo: formData.periodo,
      tipo_planilla: formData.tipo_planilla,
      tipo_personal: formData.tipo_personal,
      detalle: this.planillaCalculada.detalle
    };

    this.planillasService.procesarPlanilla(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showNotification('Planilla procesada exitosamente', 'success');
            this.planillaCalculada = null;
            this.procesarForm.reset({
              tipo_planilla: 'regular',
              tipo_personal: 'todos'
            });
            this.loadPlanillasHistorial();
          }
        },
        error: (error) => {
          console.error('Error procesando planilla:', error);
          this.showNotification('Error al procesar la planilla', 'error');
        },
        complete: () => {
          this.isProcessing = false;
        }
      });
  }

  // ==================
  // GESTIÓN DE HISTORIAL
  // ==================

  applyFilters(filterValues: any): void {
    this.filters = {
      ...this.filters,
      page: 1,
      tipo_planilla: filterValues.tipo_planilla !== 'todos' ? filterValues.tipo_planilla : undefined,
      estado: filterValues.estado !== 'todos' ? filterValues.estado : undefined,
      desde_periodo: filterValues.desde_periodo || undefined,
      hasta_periodo: filterValues.hasta_periodo || undefined
    };

    this.loadPlanillasHistorial();
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.filters.page = page;
      this.loadPlanillasHistorial();
    }
  }

  viewPlanillaDetail(planilla: Planilla): void {
    if (!planilla.id) return;

    this.isLoading = true;
    this.planillasService.getDetallePlanilla(planilla.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.planillaSeleccionada = response.data.planilla;
            this.detallePlanilla = response.data.detalle;
            this.showDetailModal = true;
          }
        },
        error: (error) => {
          console.error('Error cargando detalle:', error);
          this.showNotification('Error cargando detalle de planilla', 'error');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  exportarPlanilla(planilla: Planilla): void {
    if (!planilla.id) return;

    this.planillasService.exportarPlanillaCSV(planilla.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `planilla_${planilla.periodo}_${planilla.tipo_planilla}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          
          this.showNotification('Planilla exportada exitosamente', 'success');
        },
        error: (error) => {
          console.error('Error exportando planilla:', error);
          this.showNotification('Error al exportar planilla', 'error');
        }
      });
  }

  anularPlanilla(planilla: Planilla): void {
    const motivo = prompt('Ingrese el motivo de anulación:');
    if (!motivo) return;

    if (!planilla.id) return;

    this.planillasService.anularPlanilla(planilla.id, motivo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showNotification('Planilla anulada exitosamente', 'success');
            this.loadPlanillasHistorial();
          }
        },
        error: (error) => {
          console.error('Error anulando planilla:', error);
          this.showNotification('Error al anular planilla', 'error');
        }
      });
  }

  // ==================
  // MODALES
  // ==================

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.planillaSeleccionada = null;
    this.detallePlanilla = [];
  }

  // ==================
  // UTILIDADES
  // ==================

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  getStatusClass(estado: string): string {
    switch (estado) {
      case 'borrador': return 'status-draft';
      case 'calculada': return 'status-calculated';
      case 'procesada': return 'status-processed';
      case 'anulada': return 'status-cancelled';
      default: return '';
    }
  }

  getStatusLabel(estado: string): string {
    switch (estado) {
      case 'borrador': return 'Borrador';
      case 'calculada': return 'Calculada';
      case 'procesada': return 'Procesada';
      case 'anulada': return 'Anulada';
      default: return estado;
    }
  }

  getTipoLabel(tipo: string): string {
    const tipoObj = this.tiposPlanilla.find(t => t.value === tipo);
    return tipoObj ? tipoObj.label : tipo;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getPages(): number[] {
    const pages = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  trackByPlanilla(index: number, planilla: Planilla): any {
    return planilla.id || index;
  }

  trackByDetalle(index: number, detalle: DetallePlanilla): any {
    return detalle.trabajador_id || index;
  }

  private showNotification(message: string, type: 'success' | 'warning' | 'info' | 'error'): void {
    // En una implementación real, esto sería un toast o snackbar
    alert(message);
    console.log(`${type.toUpperCase()}: ${message}`);
  }

  refreshData(): void {
    this.loadInitialData();
  }
}
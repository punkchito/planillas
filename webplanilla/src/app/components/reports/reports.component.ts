// src/app/components/reports/reports.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { 
  Chart, 
  ChartConfiguration, 
  ChartType, 
  registerables,
  ChartOptions,
  ChartData,
  TooltipItem
} from 'chart.js';
import Swal from 'sweetalert2';

import { 
  ReportsService, 
  ReportFilters, 
  DashboardStats, 
  SummaryCards, 
  PayrollEvolution,
  AreaDistribution,
  CostsAnalysis,
  DetailByArea,
  EmployeesDetail,
  FilterOptions 
} from '../../services/reports.service';

// Registrar Chart.js plugins
Chart.register(...registerables);

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
export class ReportsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('payrollChart') payrollChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('distributionChart') distributionChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('costsChart') costsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('trendsChart') trendsChartRef!: ElementRef<HTMLCanvasElement>;

  private destroy$ = new Subject<void>();
  private charts: { [key: string]: Chart | undefined } = {};

  // Loading states
  loading = {
    dashboard: false,
    summary: false,
    charts: false,
    tables: false,
    export: false
  };

  // Data properties
  dashboardStats: DashboardStats | null = null;
  summaryCards: SummaryCards | null = null;
  payrollEvolution: PayrollEvolution | null = null;
  areaDistribution: AreaDistribution | null = null;
  costsAnalysis: CostsAnalysis | null = null;
  detailByArea: DetailByArea | null = null;
  employeesDetail: EmployeesDetail | null = null;
  filterOptions: FilterOptions | null = null;

  // Filter form
  filters: ReportFilters = {
    periodo: 'mes-actual',
    tipoPersonal: 'todos',
    area: 'todas'
  };

  // UI Control
  activeView = 'dashboard';
  chartTypes: { [key: string]: ChartType } = {
    payrollChart: 'line',
    distributionChart: 'doughnut',
    costsChart: 'bar',
    trendsChart: 'line'
  };

  constructor(
    private reportsService: ReportsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadFilterOptions();
    this.loadInitialData();
  }

  ngAfterViewInit(): void {
    // Inicializar gráficos después de que la vista esté lista
    setTimeout(() => {
      this.loadChartsData();
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyAllCharts();
  }

  // =============================
  // DATA LOADING METHODS
  // =============================

  loadInitialData(): void {
    this.loadDashboardStats();
    this.loadSummaryCards();
    this.loadTableData();
  }

  loadFilterOptions(): void {
    this.reportsService.getFilterOptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.filterOptions = response.data;
          }
        },
        error: (error) => {
          console.error('Error loading filter options:', error);
          this.showAlert('Error cargando opciones de filtros', 'error');
        }
      });
  }

  loadDashboardStats(): void {
    this.loading.dashboard = true;
    this.reportsService.getDashboardStats(this.filters)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.dashboard = false)
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.dashboardStats = response.data;
          }
        },
        error: (error) => {
          console.error('Error loading dashboard stats:', error);
          this.showAlert('Error cargando estadísticas del dashboard', 'error');
        }
      });
  }

  loadSummaryCards(): void {
    this.loading.summary = true;
    this.reportsService.getSummaryCards(this.filters)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.summary = false)
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.summaryCards = response.data;
          }
        },
        error: (error) => {
          console.error('Error loading summary cards:', error);
          this.showAlert('Error cargando tarjetas de resumen', 'error');
        }
      });
  }

  loadChartsData(): void {
    this.loading.charts = true;

    // Cargar datos para gráfico de evolución de planillas
    this.reportsService.getPayrollEvolution(12, this.filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.payrollEvolution = response.data;
            this.createPayrollChart();
          }
        },
        error: (error) => console.error('Error loading payroll evolution:', error)
      });

    // Cargar datos para gráfico de distribución por área
    this.reportsService.getAreaDistribution(this.filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.areaDistribution = response.data;
            this.createDistributionChart();
          }
        },
        error: (error) => console.error('Error loading area distribution:', error)
      });

    // Cargar datos para análisis de costos
    this.reportsService.getCostsAnalysis(this.filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.costsAnalysis = response.data;
            this.createCostsChart();
          }
        },
        error: (error) => console.error('Error loading costs analysis:', error)
      });

    // Cargar datos para tendencias
    this.reportsService.getTrends(12, this.filters)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.charts = false)
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.createTrendsChart(response.data);
          }
        },
        error: (error) => console.error('Error loading trends:', error)
      });
  }

  loadTableData(): void {
    this.loading.tables = true;

    // Cargar detalle por área
    this.reportsService.getDetailByArea(this.filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.detailByArea = response.data;
          }
        },
        error: (error) => console.error('Error loading detail by area:', error)
      });

    // Cargar detalle de empleados
    this.reportsService.getEmployeesDetail(this.filters)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.tables = false)
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.employeesDetail = response.data;
          }
        },
        error: (error) => console.error('Error loading employees detail:', error)
      });
  }

  // =============================
  // CHART METHODS
  // =============================

  createPayrollChart(): void {
    if (!this.payrollEvolution || !this.payrollChartRef) return;

    this.destroyChart('payrollChart');

    const ctx = this.payrollChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const chartData: ChartData<'line'> = {
      labels: this.payrollEvolution.evolucion.map(item => item.periodo),
      datasets: [{
        label: 'Total Ingresos',
        data: this.payrollEvolution.evolucion.map(item => item.total_ingresos),
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    };

    const chartOptions: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: (context: TooltipItem<'line'>) => {
              return `${context.dataset.label}: ${this.reportsService.formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value: string | number) => this.reportsService.formatCurrency(Number(value))
          }
        }
      }
    };

    const config: ChartConfiguration<'line'> = {
      type: this.chartTypes["payrollChart"] as 'line',
      data: chartData,
      options: chartOptions
    };

    this.charts["payrollChart"] = new Chart(ctx, config);
  }

  createDistributionChart(): void {
    if (!this.areaDistribution || !this.distributionChartRef) return;

    this.destroyChart('distributionChart');

    const ctx = this.distributionChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const chartData: ChartData<'doughnut'> = {
      labels: this.areaDistribution.distribucion.map(item => item.area_nombre),
      datasets: [{
        data: this.areaDistribution.distribucion.map(item => item.cantidad_empleados),
        backgroundColor: [
          '#667eea',
          '#28a745',
          '#ffc107',
          '#dc3545',
          '#17a2b8'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    };

    const chartOptions: ChartOptions<'doughnut'> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    };

    const config: ChartConfiguration<'doughnut'> = {
      type: this.chartTypes["distributionChart"] as 'doughnut',
      data: chartData,
      options: chartOptions
    };

    //this.charts["distributionChart"] = new Chart(ctx, config);
  }

  createCostsChart(): void {
    if (!this.costsAnalysis || !this.costsChartRef) return;

    this.destroyChart('costsChart');

    const ctx = this.costsChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const chartData: ChartData<'bar'> = {
      labels: ['Salarios Brutos', 'Descuentos', 'Salarios Netos'],
      datasets: [{
        label: 'Montos',
        data: [
          this.costsAnalysis.salarios_brutos,
          this.costsAnalysis.descuentos.total,
          this.costsAnalysis.salarios_netos
        ],
        backgroundColor: [
          '#28a745',
          '#dc3545',
          '#667eea'
        ],
        borderWidth: 1
      }]
    };

    const chartOptions: ChartOptions<'bar'> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context: TooltipItem<'bar'>) => {
              return `${context.label}: ${this.reportsService.formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value: string | number) => this.reportsService.formatCurrency(Number(value))
          }
        }
      }
    };

    const config: ChartConfiguration<'bar'> = {
      type: this.chartTypes["costsChart"] as 'bar',
      data: chartData,
      options: chartOptions
    };

    this.charts["costsChart"] = new Chart(ctx, config);
  }

  createTrendsChart(trendsData: any): void {
    if (!trendsData || !this.trendsChartRef) return;

    this.destroyChart('trendsChart');

    const ctx = this.trendsChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const chartData: ChartData<'line'> = {
      labels: trendsData.tendencias.map((item: any) => item.periodo),
      datasets: [{
        label: 'Empleados',
        data: trendsData.tendencias.map((item: any) => item.empleados),
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderWidth: 2,
        yAxisID: 'y'
      }, {
        label: 'Total Planilla',
        data: trendsData.tendencias.map((item: any) => item.total_planilla),
        borderColor: '#28a745',
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        borderWidth: 2,
        yAxisID: 'y1'
      }]
    };

    const chartOptions: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (context: TooltipItem<'line'>) => {
              if (context.datasetIndex === 1) {
                return `${context.dataset.label}: ${this.reportsService.formatCurrency(context.parsed.y)}`;
              }
              return `${context.dataset.label}: ${context.parsed.y}`;
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            callback: (value: string | number) => this.reportsService.formatCurrency(Number(value))
          }
        },
      }
    };

    const config: ChartConfiguration<'line'> = {
      type: this.chartTypes["trendsChart"] as 'line',
      data: chartData,
      options: chartOptions
    };

    this.charts["trendsChart"] = new Chart(ctx, config);
  }

  destroyChart(chartId: keyof typeof this.charts): void {
    if (this.charts[chartId]) {
      this.charts[chartId]!.destroy();
      this.charts[chartId] = undefined;
    }
  }

  destroyAllCharts(): void {
    const chartIds: (keyof typeof this.charts)[] = ['payrollChart', 'distributionChart', 'costsChart', 'trendsChart'];
    chartIds.forEach(chartId => {
      this.destroyChart(chartId);
    });
  }

  // =============================
  // EVENT HANDLERS
  // =============================

  onFiltersChanged(): void {
    this.showAlert('Actualizando reportes con nuevos filtros...', 'info');
    
    // Recargar todos los datos
    setTimeout(() => {
      this.loadInitialData();
      this.loadChartsData();
      this.showAlert('Reportes actualizados exitosamente', 'success');
    }, 1000);
  }

  refreshData(): void {
    this.showAlert('Actualizando todos los datos...', 'info');
    
    setTimeout(() => {
      this.loadInitialData();
      this.loadChartsData();
      this.showAlert('Datos actualizados exitosamente', 'success');
    }, 2000);
  }

  toggleChartType(chartId: keyof typeof this.chartTypes, newType: ChartType): void {
    this.chartTypes[chartId] = newType;
    
    // Recrear el gráfico específico
    switch (chartId) {
      case 'payrollChart':
        this.createPayrollChart();
        break;
      case 'costsChart':
        this.createCostsChart();
        break;
    }
    
    this.showAlert(`Tipo de gráfico cambiado a ${newType}`, 'success');
  }

  // =============================
  // EXPORT METHODS
  // =============================

  exportChart(chartId: string): void {
    const chart = this.charts[chartId];
    if (!chart) return;

    const canvas = chart.canvas;
    const link = document.createElement('a');
    link.download = `${chartId}_${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL();
    link.click();
    
    this.showAlert('Gráfico exportado como PNG', 'success');
  }

  exportCompleteReport(): void {
    this.loading.export = true;
    this.showAlert('Generando reporte PDF completo...', 'info');
    
    this.reportsService.exportCompletePDF(this.filters)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.export = false)
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showAlert('Reporte PDF generado exitosamente', 'success');
          }
        },
        error: (error) => {
          console.error('Error exporting complete report:', error);
          this.showAlert('Error generando reporte PDF', 'error');
        }
      });
  }

  exportToExcel(): void {
    this.loading.export = true;
    this.showAlert('Generando archivo Excel...', 'info');
    
    this.reportsService.exportToExcel(this.filters)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.export = false)
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showAlert('Archivo Excel generado exitosamente', 'success');
          }
        },
        error: (error) => {
          console.error('Error exporting to Excel:', error);
          this.showAlert('Error generando archivo Excel', 'error');
        }
      });
  }

  exportTablePDF(tabla: string): void {
    this.showAlert('Exportando tabla como PDF...', 'info');
    
    this.reportsService.exportTablePDF(tabla, this.filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showAlert('Tabla exportada como PDF', 'success');
          }
        },
        error: (error) => {
          console.error('Error exporting table PDF:', error);
          this.showAlert('Error exportando tabla PDF', 'error');
        }
      });
  }

  exportTableExcel(tabla: string): void {
    this.showAlert('Exportando tabla como Excel...', 'info');
    
    this.reportsService.exportTableExcel(tabla, this.filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showAlert('Tabla exportada como Excel', 'success');
          }
        },
        error: (error) => {
          console.error('Error exporting table Excel:', error);
          this.showAlert('Error exportando tabla Excel', 'error');
        }
      });
  }

  // =============================
  // REPORT GENERATION METHODS
  // =============================

  generatePayrollReport(formato: string): void {
    this.showAlert(`Generando reporte de planillas en ${formato.toUpperCase()}...`, 'info');
    
    this.reportsService.generatePayrollReport(formato, false)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showAlert(`Reporte de planillas ${formato.toUpperCase()} generado exitosamente`, 'success');
          }
        },
        error: (error) => {
          console.error('Error generating payroll report:', error);
          this.showAlert('Error generando reporte de planillas', 'error');
        }
      });
  }

  generateStaffReport(formato: string): void {
    this.showAlert(`Generando reporte de personal en ${formato.toUpperCase()}...`, 'info');
    
    this.reportsService.generateStaffReport(formato, false)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showAlert(`Reporte de personal ${formato.toUpperCase()} generado exitosamente`, 'success');
          }
        },
        error: (error) => {
          console.error('Error generating staff report:', error);
          this.showAlert('Error generando reporte de personal', 'error');
        }
      });
  }

  generateFinancialReport(formato: string): void {
    this.showAlert(`Generando análisis financiero en ${formato.toUpperCase()}...`, 'info');
    
    this.reportsService.generateFinancialReport(formato, false)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showAlert(`Análisis financiero ${formato.toUpperCase()} generado exitosamente`, 'success');
          }
        },
        error: (error) => {
          console.error('Error generating financial report:', error);
          this.showAlert('Error generando análisis financiero', 'error');
        }
      });
  }

  generateExecutiveReport(formato: string): void {
    this.showAlert(`Generando dashboard ejecutivo en ${formato.toUpperCase()}...`, 'info');
    
    this.reportsService.generateExecutiveReport(formato, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showAlert(`Dashboard ejecutivo ${formato.toUpperCase()} generado exitosamente`, 'success');
          }
        },
        error: (error) => {
          console.error('Error generating executive report:', error);
          this.showAlert('Error generando dashboard ejecutivo', 'error');
        }
      });
  }

  generateComparativeReport(formato: string): void {
    this.showAlert(`Generando análisis comparativo en ${formato.toUpperCase()}...`, 'info');
    
    this.reportsService.generateComparativeReport(formato, 'trimestre-anterior')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showAlert(`Análisis comparativo ${formato.toUpperCase()} generado exitosamente`, 'success');
          }
        },
        error: (error) => {
          console.error('Error generating comparative report:', error);
          this.showAlert('Error generando análisis comparativo', 'error');
        }
      });
  }

  openCustomReportBuilder(): void {
    this.showAlert('Abriendo constructor de reportes personalizados...', 'info');
    setTimeout(() => {
      this.showAlert('Constructor de reportes disponible próximamente', 'info');
    }, 1000);
  }

  // =============================
  // NAVIGATION METHODS
  // =============================

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  logout(): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¿Deseas cerrar sesión?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545'
    }).then((result) => {
      if (result.isConfirmed) {
        this.showAlert('Cerrando sesión...', 'info');
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      }
    });
  }

  // =============================
  // UTILITY METHODS
  // =============================

  showAlert(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
    const config = {
      success: { icon: 'success' as const, timer: 3000 },
      error: { icon: 'error' as const, timer: 5000 },
      info: { icon: 'info' as const, timer: 3000 },
      warning: { icon: 'warning' as const, timer: 4000 }
    };

    Swal.fire({
      text: message,
      icon: config[type].icon,
      timer: config[type].timer,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  }

  formatCurrency(amount: number): string {
    return this.reportsService.formatCurrency(amount);
  }

  formatNumber(value: number): string {
    return this.reportsService.formatNumber(value);
  }

  getChangeIcon(direction: string): string {
    return direction === 'up' ? '↗' : direction === 'down' ? '↘' : '→';
  }

  getChangeClass(direction: string): string {
    return direction === 'up' ? 'change-positive' : direction === 'down' ? 'change-negative' : 'change-neutral';
  }
}
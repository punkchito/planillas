// src/app/components/conceptos/conceptos.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import {
  ConceptosService,
  Concepto,
  VariableFormula,
  ConceptosFilters
} from '../../services/conceptos.service';

@Component({
  selector: 'app-conceptos',
  templateUrl: './conceptos.component.html',
  styleUrls: ['./conceptos.component.css']
})
export class ConceptosComponent implements OnInit, OnDestroy {
  // Propiedades principales
  conceptos: Concepto[] = [];
  conceptosPorTipo: { [key: string]: Concepto[] } = {
    ingreso: [],
    descuento: [],
    aporte: []
  };
  variables: VariableFormula[] = [];
  estadisticas: any = {};

  // Estado del componente
  isLoading = false;
  currentTab: 'ingresos' | 'descuentos' | 'aportes' | 'constructor' = 'ingresos';
  showModal = false;
  currentMode: 'nuevo' | 'editar' = 'nuevo';
  conceptoEditando: Concepto | null = null;

  // Filtros y búsqueda
  filters: ConceptosFilters = {
    tipo: 'todos',
    estado: 'todos',
    search: ''
  };

  // Formularios
  conceptForm: FormGroup<any> | undefined;
  searchForm?: FormGroup;
  formulaEditor = '';

  // Validaciones
  readonly tiposConcepto = [
    { value: 'ingreso', label: 'Ingreso' },
    { value: 'descuento', label: 'Descuento' },
    { value: 'aporte', label: 'Aporte' }
  ];

  readonly tiposCalculo = [
    { value: 'fijo', label: 'Valor Fijo' },
    { value: 'porcentual', label: 'Porcentual' },
    { value: 'calculado', label: 'Calculado por Fórmula' },
    { value: 'variable', label: 'Variable (Manual)' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private conceptosService: ConceptosService,
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupSearchSubscription();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================
  // INICIALIZACIÓN
  // ==================

  private initializeForms(): void {
    this.conceptForm = this.formBuilder.group({
      codigo: ['', [Validators.required, Validators.maxLength(10)]],
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      tipo_concepto: ['', Validators.required],
      tipo_calculo: ['', Validators.required],
      valor_fijo: [null as number | null],
      porcentaje: [null as number | null, [Validators.min(0), Validators.max(100)]],
      formula: [''],
      orden: [1, [Validators.min(1), Validators.max(999)]],
      estado: ['activo'],
      descripcion: [''],
      afecta_a: ['Todos']
    });

    this.searchForm = this.formBuilder.group({
      searchTerm: ['']
    });

    // Observar cambios en tipo_calculo para mostrar/ocultar campos
    this.conceptForm.get('tipo_calculo')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.toggleCalcFields());
  }

  private setupSearchSubscription(): void {
    this.searchForm!.get('searchTerm')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.filters.search = searchTerm;
        this.loadConceptos();
      });
  }

  private loadInitialData(): void {
    this.isLoading = true;
    Promise.all([
      this.loadConceptos(),
      this.loadVariables(),
      this.loadEstadisticas()
    ]).finally(() => {
      this.isLoading = false;
    });
  }

  // ==================
  // CARGA DE DATOS
  // ==================

  private loadConceptos(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.conceptosService.getConceptos(this.filters)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.conceptos = response.data;
              this.organizarConceptosPorTipo();
            }
            resolve();
          },
          error: (error) => {
            console.error('Error cargando conceptos:', error);
            this.showNotification('Error cargando conceptos', 'error');
            reject(error);
          }
        });
    });
  }

  private loadVariables(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.conceptosService.getVariablesFormula()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.variables = response.data;
            }
            resolve();
          },
          error: (error) => {
            console.error('Error cargando variables:', error);
            reject(error);
          }
        });
    });
  }

  private loadEstadisticas(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.conceptosService.getEstadisticas()
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

  private organizarConceptosPorTipo(): void {
    this.conceptosPorTipo = {
      ingreso: this.conceptos.filter(c => c.tipo_concepto === 'ingreso'),
      descuento: this.conceptos.filter(c => c.tipo_concepto === 'descuento'),
      aporte: this.conceptos.filter(c => c.tipo_concepto === 'aporte')
    };
  }

  // ==================
  // NAVEGACIÓN DE TABS
  // ==================

  showTab(tabId: 'ingresos' | 'descuentos' | 'aportes' | 'constructor'): void {
    this.currentTab = tabId;
  }

  // ==================
  // GESTIÓN DE MODAL
  // ==================

  openModal(mode: 'nuevo' | 'editar', concepto?: Concepto): void {
    this.currentMode = mode;
    this.showModal = true;

    if (mode === 'nuevo') {
      this.conceptForm!.reset({
        estado: 'activo',
        orden: 1,
        afecta_a: 'Todos'
      });
      this.conceptoEditando = null;
    } else if (concepto) {
      this.conceptoEditando = concepto;
      this.loadConceptoToForm(concepto);
    }
  }

  closeModal(): void {
    this.showModal = false;
    this.conceptForm!.reset();
    this.conceptoEditando = null;
  }

  private loadConceptoToForm(concepto: Concepto): void {
    this.conceptForm!.patchValue({
      codigo: concepto.codigo,
      nombre: concepto.nombre,
      tipo_concepto: concepto.tipo_concepto,
      tipo_calculo: concepto.tipo_calculo,
      valor_fijo: concepto.valor_fijo,
      porcentaje: concepto.porcentaje,
      formula: concepto.formula,
      orden: concepto.orden,
      estado: concepto.estado,
      descripcion: concepto.descripcion,
      afecta_a: concepto.afecta_a
    });
    this.toggleCalcFields();
  }

  // ==================
  // FORMULARIO
  // ==================

  toggleCalcFields(): void {
    const tipoCalculo = this.conceptForm!.get('tipo_calculo')?.value;

    // Limpiar validadores
    this.conceptForm!.get('valor_fijo')?.clearValidators();
    this.conceptForm!.get('porcentaje')?.clearValidators();
    this.conceptForm!.get('formula')?.clearValidators();

    // Aplicar validadores según el tipo
    switch (tipoCalculo) {
      case 'fijo':
        this.conceptForm!.get('valor_fijo')?.setValidators([Validators.required, Validators.min(0)]);
        break;
      case 'porcentual':
        this.conceptForm!.get('porcentaje')?.setValidators([
          Validators.required,
          Validators.min(0),
          Validators.max(100)
        ]);
        break;
      case 'calculado':
        this.conceptForm!.get('formula')?.setValidators([Validators.required]);
        break;
    }

    // Actualizar validaciones
    this.conceptForm!.get('valor_fijo')?.updateValueAndValidity();
    this.conceptForm!.get('porcentaje')?.updateValueAndValidity();
    this.conceptForm!.get('formula')?.updateValueAndValidity();
  }

  submitForm(): void {
    if (this.conceptForm!.valid) {
      const formData = this.conceptForm!.value;

      // Limpiar campos que no aplican según el tipo de cálculo
      const cleanedData = { ...formData };

      switch (cleanedData.tipo_calculo) {
        case 'fijo':
          delete cleanedData.porcentaje;
          delete cleanedData.formula;
          break;
        case 'porcentual':
          delete cleanedData.valor_fijo;
          delete cleanedData.formula;
          break;
        case 'calculado':
          delete cleanedData.valor_fijo;
          delete cleanedData.porcentaje;
          break;
        case 'variable':
          delete cleanedData.valor_fijo;
          delete cleanedData.porcentaje;
          delete cleanedData.formula;
          break;
      }

      if (this.currentMode === 'nuevo') {
        this.createConcepto(cleanedData);
      } else {
        this.updateConcepto(cleanedData);
      }
    } else {
      this.showNotification('Por favor complete todos los campos requeridos', 'warning');
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.conceptForm!.controls).forEach(key => {
      this.conceptForm!.get(key)?.markAsTouched();
    });
  }

  // ==================
  // OPERACIONES CRUD
  // ==================

  createConcepto(conceptoData: Concepto): void {
    this.isLoading = true;

    this.conceptosService.createConcepto(conceptoData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showNotification('Concepto creado exitosamente', 'success');
            this.closeModal();
            this.loadConceptos();
          }
        },
        error: (error) => {
          console.error('Error creando concepto:', error);
          this.showNotification('Error al crear concepto', 'error');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  updateConcepto(conceptoData: Partial<Concepto>): void {
    if (!this.conceptoEditando) return;

    this.isLoading = true;

    this.conceptosService.updateConcepto(this.conceptoEditando.id!, conceptoData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showNotification('Concepto actualizado exitosamente', 'success');
            this.closeModal();
            this.loadConceptos();
          }
        },
        error: (error) => {
          console.error('Error actualizando concepto:', error);
          this.showNotification('Error al actualizar concepto', 'error');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  toggleConcepto(concepto: Concepto): void {
    const nuevoEstado = concepto.estado === 'activo' ? 'inactivo' : 'activo';
    const mensaje = nuevoEstado === 'activo' ? 'activar' : 'desactivar';

    if (confirm(`¿Está seguro que desea ${mensaje} este concepto?`)) {
      this.conceptosService.cambiarEstado(concepto.id!, nuevoEstado)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.showNotification(`Concepto ${mensaje}do exitosamente`, 'success');
              this.loadConceptos();
            }
          },
          error: (error) => {
            console.error('Error cambiando estado:', error);
            this.showNotification('Error al cambiar estado del concepto', 'error');
          }
        });
    }
  }

  deleteConcepto(concepto: Concepto): void {
    if (confirm(`¿Está seguro que desea eliminar el concepto "${concepto.nombre}"?`)) {
      this.conceptosService.deleteConcepto(concepto.id!)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.showNotification('Concepto eliminado exitosamente', 'success');
              this.loadConceptos();
            }
          },
          error: (error) => {
            console.error('Error eliminando concepto:', error);
            this.showNotification('Error al eliminar concepto', 'error');
          }
        });
    }
  }

  // ==================
  // CONSTRUCTOR DE FÓRMULAS
  // ==================

  addToFormula(variable: string): void {
    this.formulaEditor += variable;
  }

  clearFormula(): void {
    this.formulaEditor = '';
  }

  validateFormula(): void {
    if (!this.formulaEditor.trim()) {
      this.showNotification('Por favor ingresa una fórmula para validar', 'warning');
      return;
    }

    this.conceptosService.validarFormula(this.formulaEditor)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            const resultado = response.data;
            if (resultado.es_valida) {
              this.showNotification('Fórmula válida', 'success');
            } else {
              this.showNotification(`Fórmula inválida: ${resultado.mensaje}`, 'error');
            }
          }
        },
        error: (error) => {
          console.error('Error validando fórmula:', error);
          this.showNotification('Error al validar fórmula', 'error');
        }
      });
  }

  testFormula(): void {
    if (!this.formulaEditor.trim()) {
      this.showNotification('Por favor ingresa una fórmula para probar', 'warning');
      return;
    }

    // Simular prueba con datos de ejemplo
    const datosPrueba = {
      sueldo_basico: 2500,
      años_servicio: 5,
      horas_extras: 8
    };

    this.showNotification(
      `Prueba de fórmula:\nFórmula: ${this.formulaEditor}\nDatos: SUELDO_BASICO=2500, AÑOS_SERVICIO=5\nResultado estimado: S/ 375.00`,
      'info'
    );
  }

  saveFormula(): void {
    if (!this.formulaEditor.trim()) {
      this.showNotification('Por favor ingresa una fórmula para guardar', 'warning');
      return;
    }

    // Copiar fórmula al formulario si está abierto
    if (this.showModal && this.conceptForm!.get('tipo_calculo')?.value === 'calculado') {
      this.conceptForm!.patchValue({ formula: this.formulaEditor });
    }

    this.showNotification('Fórmula guardada exitosamente', 'success');
  }

  // ==================
  // OPERACIONES ADICIONALES
  // ==================

  testConcept(concepto: Concepto): void {
    const datosPrueba = {
      sueldo_basico: 2500,
      años_servicio: 5,
      horas_extras: 8
    };

    this.conceptosService.probarConcepto(concepto.id!, datosPrueba)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            const resultado = response.data;
            this.showNotification(
              `Prueba de concepto: ${resultado.concepto}\nResultado: S/ ${resultado.resultado}`,
              'info'
            );
          }
        },
        error: (error) => {
          console.error('Error probando concepto:', error);
          this.showNotification('Error al probar concepto', 'error');
        }
      });
  }

  exportConcepts(): void {
    this.conceptosService.exportarCSV()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `conceptos_${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);

          this.showNotification('Exportación completada', 'success');
        },
        error: (error) => {
          console.error('Error exportando:', error);
          this.showNotification('Error al exportar conceptos', 'error');
        }
      });
  }

  importConcepts(): void {
    // Crear input file temporal
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';

    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        this.conceptosService.importarConceptos(file)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              if (response.success) {
                this.showNotification('Importación completada exitosamente', 'success');
                this.loadConceptos();
              }
            },
            error: (error) => {
              console.error('Error importando:', error);
              this.showNotification('Error al importar conceptos', 'error');
            }
          });
      }
    };

    input.click();
  }

  // ==================
  // UTILIDADES
  // ==================

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  getConceptTypeClass(tipo: string): string {
    switch (tipo) {
      case 'ingreso': return 'type-ingreso';
      case 'descuento': return 'type-descuento';
      case 'aporte': return 'type-aporte';
      default: return '';
    }
  }

  getStatusClass(estado: string): string {
    return estado === 'activo' ? 'status-active' : 'status-inactive';
  }

  private showNotification(message: string, type: 'success' | 'warning' | 'info' | 'error'): void {
    // En una aplicación real, esto sería un toast o snackbar
    alert(message);
    console.log(`${type.toUpperCase()}: ${message}`);
  }

  refreshData(): void {
    this.loadInitialData();
  }

  getTipoCalculoLabel(tipoCalculo: string): string {
    const tipo = this.tiposCalculo.find(t => t.value === tipoCalculo);
    return tipo ? tipo.label : tipoCalculo;
  }

}
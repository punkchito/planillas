// src/app/components/solicitudes/solicitudes.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, forkJoin, Observable } from 'rxjs';

import {
  SolicitudesService,
  Solicitud,
  SolicitudDetalle,
  TrabajadorBasico,
  SolicitudesFilters,
  TimelineItem
} from '../../services/solicitudes.service';

@Component({
  selector: 'app-solicitudes',
  templateUrl: './solicitudes.component.html',
  styleUrls: ['./solicitudes.component.css']
})
export class SolicitudesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Estados de la vista
  loading = false;
  saving = false;
  loadingStats = false;

  // Datos principales
  solicitudes: Solicitud[] = [];
  selectedSolicitud: SolicitudDetalle | null = null;
  trabajadores: TrabajadorBasico[] = [];
  estadisticas: any = null;

  // Filtros y búsqueda
  filters: SolicitudesFilters = {
    sortBy: 'fecha_creacion',
    sortOrder: 'DESC'
  };

  // Formularios
  solicitudForm: FormGroup | undefined;
  filtrosForm: FormGroup | undefined;

  // Estados de modales
  showModal = false;
  showDetailModal = false;
  modalMode: 'create' | 'edit' | 'view' = 'create';

  // Tabs
  currentTab = 'todas';

  // Búsqueda
  private searchSubject = new Subject<string>();

  // Tipos de solicitudes
  tiposSolicitudes = [
    { id: 'vacaciones', name: 'Vacaciones', icon: '🏖️' },
    { id: 'permiso', name: 'Permiso', icon: '⏰' },
    { id: 'licencia', name: 'Licencia Médica', icon: '🏥' },
    { id: 'adelanto', name: 'Adelanto de Sueldo', icon: '💰' },
    { id: 'certificado', name: 'Certificado Laboral', icon: '📄' },
    { id: 'otros', name: 'Otros', icon: '📝' }
  ];

  // Estados de solicitudes
  estadosSolicitudes = [
    { id: 'pendiente', name: 'Pendiente', color: 'warning' },
    { id: 'en-revision', name: 'En Revisión', color: 'info' },
    { id: 'aprobada', name: 'Aprobada', color: 'success' },
    { id: 'rechazada', name: 'Rechazada', color: 'danger' }
  ];

  // Niveles de urgencia
  nivelesUrgencia = [
    { id: 'normal', name: 'Normal' },
    { id: 'alta', name: 'Alta' },
    { id: 'urgente', name: 'Urgente' }
  ];

  constructor(
    private fb: FormBuilder,
    private solicitudesService: SolicitudesService
  ) {
    this.initializeForms();
    this.setupSearchDebounce();
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializar formularios
   */
  private initializeForms(): void {
    this.solicitudForm = this.fb.group({
      tipo_solicitud: ['', Validators.required],
      trabajador_id: ['', Validators.required],
      fecha_inicio: [''],
      fecha_fin: [''],
      motivo: ['', [Validators.required, Validators.minLength(10)]],
      urgencia: ['normal'],
      monto: [''],
      proposito: [''],
      horario: ['']
    });

    this.filtrosForm = this.fb.group({
      search: [''],
      tipo: ['todas'],
      estado: ['todos'],
      fecha: ['']
    });

    // Escuchar cambios en filtros
    this.filtrosForm?.valueChanges
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(values => {
        this.applyFilters(values);
      });
  }

  /**
   * Actualizar validaciones según tipo de solicitud
   */
  private updateValidationsByType(tipo: string): void {
    if (!this.solicitudForm) return;

    // Obtener todos los controles
    const controls = {
      fecha_inicio: this.solicitudForm.get('fecha_inicio'),
      fecha_fin: this.solicitudForm.get('fecha_fin'),
      monto: this.solicitudForm.get('monto'),
      proposito: this.solicitudForm.get('proposito'),
      horario: this.solicitudForm.get('horario')
    };

    // Limpiar TODAS las validaciones primero
    Object.values(controls).forEach(control => {
      if (control) {
        control.clearValidators();
        control.setErrors(null);
      }
    });

    // Aplicar validaciones específicas según tipo
    switch (tipo) {
      case 'permiso':
        if (controls.fecha_inicio) {
          controls.fecha_inicio.setValidators([Validators.required]);
        }
        break;

      case 'vacaciones':
      case 'licencia':
        if (controls.fecha_inicio && controls.fecha_fin) {
          controls.fecha_inicio.setValidators([Validators.required]);
          controls.fecha_fin.setValidators([Validators.required]);
        }
        break;

      case 'adelanto':
        if (controls.monto) {
          controls.monto.setValidators([
            Validators.required,
            Validators.min(1),
            Validators.max(50000)
          ]);
        }
        break;

      case 'certificado':
        if (controls.proposito) {
          controls.proposito.setValidators([
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(200)
          ]);
        }
        break;
    }

    // Actualizar validez de todos los controles
    Object.values(controls).forEach(control => {
      if (control) {
        control.updateValueAndValidity({ emitEvent: false });
      }
    });
  }

  debugFormState(): void {
    console.log('=== DEBUG FORM STATE ===');
    console.log('Form Value:', this.solicitudForm?.value);
    console.log('Form Valid:', this.solicitudForm?.valid);
    console.log('Form Errors:', this.solicitudForm?.errors);

    // Verificar cada campo
    Object.keys(this.solicitudForm?.controls || {}).forEach(key => {
      const control = this.solicitudForm?.get(key);
      if (control && (control.invalid || control.value)) {
        console.log(`${key}:`, {
          value: control.value,
          valid: control.valid,
          errors: control.errors,
          validators: control.validator ? 'Has validators' : 'No validators'
        });
      }
    });
    console.log('========================');
  }


  checkServiceCall(formData: any): void {
    console.log('=== VERIFICACIÓN DE SERVICIO ===');
    console.log('Datos que se enviarán:', JSON.stringify(formData, null, 2));
    console.log('Claves incluidas:', Object.keys(formData));

    // Verificar si hay campos undefined o null que podrían causar problemas
    Object.entries(formData).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        console.warn(`Campo problemático: ${key} = ${value}`);
      }
    });
    console.log('================================');
  }

  /**
   * Configurar debounce para búsqueda
   */
  private setupSearchDebounce(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(term => {
        this.filters.search = term;
        this.loadSolicitudes();
      });
  }

  /**
   * Cargar datos iniciales
   */
  private loadInitialData(): void {
    this.loading = true;

    forkJoin({
      trabajadores: this.solicitudesService.getTrabajadoresActivos(),
      estadisticas: this.solicitudesService.getEstadisticas(),
      solicitudes: this.solicitudesService.getSolicitudes(this.filters)
    }).subscribe({
      next: (data) => {
        this.trabajadores = Array.isArray(data.trabajadores.data) ? data.trabajadores.data : [];
        this.estadisticas = data.estadisticas.data;
        this.solicitudes = Array.isArray(data.solicitudes.data) ? data.solicitudes.data : [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading initial data:', error);
        this.loading = false;
      }
    });
  }


  /**
 * Obtener método de carga según tab activo
 */
  private getLoadMethodByTab(): Observable<any> {
    switch (this.currentTab) {
      case 'mis-solicitudes':
        // Simular usuario actual con ID 1 - en producción obtener del AuthService
        return this.solicitudesService.getMisSolicitudes(1);
      case 'por-aprobar':
        return this.solicitudesService.getPendientesAprobacion();
      case 'historial':
        return this.solicitudesService.getHistorial();
      default:
        return this.solicitudesService.getSolicitudes(this.filters);
    }
  }

  /**
   * Cargar solicitudes con filtros
   */
  loadSolicitudes(): void {
    this.loading = true;

    const loadMethod = this.getLoadMethodByTab();

    loadMethod.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response && response.success && response.data) {
          this.solicitudes = Array.isArray(response.data) ? response.data : [];
        } else {
          this.solicitudes = [];
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading solicitudes:', error);
        this.solicitudes = [];
        this.loading = false;
      }
    });
  }

  // Métodos para usar en el template (en lugar de llamar al servicio directamente)
  getEstadoLabel(estado: string): string {
    return this.solicitudesService.getEstadoLabel(estado);
  }

  getTituloPorTipo(tipo: string): string {
    return this.solicitudesService.getTituloPorTipo(tipo);
  }

  getUrgenciaLabel(urgencia: string): string {
    return this.solicitudesService.getUrgenciaLabel(urgencia);
  }

  /**
   * Aplicar filtros
   */
  applyFilters(filterValues: any): void {
    this.filters = {
      ...this.filters,
      tipo: filterValues.tipo !== 'todas' ? filterValues.tipo : undefined,
      estado: filterValues.estado !== 'todos' ? filterValues.estado : undefined,
      fecha: filterValues.fecha || undefined
    };

    this.loadSolicitudes();
  }

  /**
   * Manejar búsqueda
   */
  onSearch(term: string): void {
    this.searchSubject.next(term);
  }

  /**
   * Cambiar tab
   */
  showTab(tabId: string): void {
    this.currentTab = tabId;
    this.loadSolicitudes();
  }

  /**
   * Abrir modal para crear solicitud
   */
  /* openCreateModal(): void {
    this.modalMode = 'create';
    this.solicitudForm?.reset();
    this.solicitudForm?.patchValue({
      urgencia: 'normal'
    });
    this.showModal = true;
  } */

  /**
* Abrir modal CORREGIDO
*/
  openCreateModal(): void {
    this.modalMode = 'create';
    this.selectedSolicitud = null;
    this.resetFormCompletely();
    this.showModal = true;
  }

  /**
   * Abrir modal para editar solicitud
   */
  openEditModal(solicitud: Solicitud): void {
    this.modalMode = 'edit';
    this.selectedSolicitud = solicitud as SolicitudDetalle;

    this.solicitudForm?.patchValue({
      tipo_solicitud: solicitud.tipo_solicitud,
      trabajador_id: solicitud.trabajador_id,
      fecha_inicio: solicitud.fecha_inicio,
      fecha_fin: solicitud.fecha_fin,
      motivo: solicitud.motivo,
      urgencia: solicitud.urgencia,
      monto: solicitud.monto,
      proposito: solicitud.proposito,
      horario: solicitud.horario
    });

    this.showModal = true;
  }

  /**
   * Ver detalles de solicitud
   */
  viewSolicitud(id: number): void {
    this.loading = true;

    this.solicitudesService.getSolicitudById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.selectedSolicitud = {
              ...response.data.solicitud,
              timeline: response.data.timeline
            };
            this.modalMode = 'view';
            this.showDetailModal = true;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading solicitud details:', error);
          this.loading = false;
        }
      });
  }

  /**
   * Cerrar modales
   */
  closeModal(): void {
    this.showModal = false;
    this.solicitudForm?.reset();
    this.selectedSolicitud = null;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedSolicitud = null;
  }

  /**
   * Guardar solicitud
   */

  /**
 * Método onSave() COMPLETAMENTE CORREGIDO - Limpia datos antes de enviar
 */
  /**
 * Método onSave() CORREGIDO - Eliminando valores undefined
 */
  onSave(): void {
    // Validar campos básicos primero
    const tipoControl = this.solicitudForm?.get('tipo_solicitud');
    const trabajadorControl = this.solicitudForm?.get('trabajador_id');
    const motivoControl = this.solicitudForm?.get('motivo');

    if (!tipoControl?.value || !trabajadorControl?.value || !motivoControl?.value) {
      this.markFormGroupTouched();
      console.error('Campos básicos requeridos faltantes');
      return;
    }

    const tipoSolicitud = tipoControl.value;

    // Función helper para convertir valores vacíos a null
    const cleanValue = (value: any): any => {
      if (value === undefined || value === '' || value === 0) {
        return null;
      }
      return value;
    };

    // Crear objeto base completamente limpio
    let formData: any = {
      tipo_solicitud: tipoSolicitud,
      trabajador_id: parseInt(trabajadorControl.value),
      motivo: motivoControl.value.trim(),
      urgencia: this.solicitudForm?.get('urgencia')?.value || 'normal',
      // Inicializar TODOS los campos posibles como null
      fecha_inicio: null,
      fecha_fin: null,
      monto: null,
      proposito: null,
      horario: null,
      dias_solicitados: null
    };

    // Configurar campos específicos según el tipo
    switch (tipoSolicitud) {
      case 'permiso':
        const fechaInicioPermiso = this.solicitudForm?.get('fecha_inicio')?.value;
        const horarioPermiso = this.solicitudForm?.get('horario')?.value;

        if (!fechaInicioPermiso) {
          console.error('Fecha requerida para permiso');
          this.markFormGroupTouched();
          return;
        }

        // Solo incluir campos necesarios para permiso
        formData = {
          tipo_solicitud: tipoSolicitud,
          trabajador_id: parseInt(trabajadorControl.value),
          motivo: motivoControl.value.trim(),
          urgencia: formData.urgencia,
          fecha_inicio: fechaInicioPermiso,
          fecha_fin: null,
          monto: null,
          proposito: null,
          horario: cleanValue(horarioPermiso),
          dias_solicitados: 1
        };
        break;

      case 'vacaciones':
      case 'licencia':
        const fechaInicioVac = this.solicitudForm?.get('fecha_inicio')?.value;
        const fechaFinVac = this.solicitudForm?.get('fecha_fin')?.value;

        if (!fechaInicioVac || !fechaFinVac) {
          console.error('Fechas de inicio y fin requeridas para', tipoSolicitud);
          this.markFormGroupTouched();
          return;
        }

        // Validar fechas
        const fechaInicio = new Date(fechaInicioVac);
        const fechaFin = new Date(fechaFinVac);

        if (fechaFin <= fechaInicio) {
          alert('La fecha de fin debe ser posterior a la fecha de inicio');
          return;
        }

        // Calcular días
        const diffTime = fechaFin.getTime() - fechaInicio.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        formData = {
          tipo_solicitud: tipoSolicitud,
          trabajador_id: parseInt(trabajadorControl.value),
          motivo: motivoControl.value.trim(),
          urgencia: formData.urgencia,
          fecha_inicio: fechaInicioVac,
          fecha_fin: fechaFinVac,
          monto: null,
          proposito: null,
          horario: null,
          dias_solicitados: diffDays
        };
        break;

      case 'adelanto':
        const montoValue = this.solicitudForm?.get('monto')?.value;

        if (!montoValue || montoValue <= 0 || montoValue > 50000) {
          console.error('Monto inválido para adelanto');
          this.markFormGroupTouched();
          return;
        }

        formData = {
          tipo_solicitud: tipoSolicitud,
          trabajador_id: parseInt(trabajadorControl.value),
          motivo: motivoControl.value.trim(),
          urgencia: formData.urgencia,
          fecha_inicio: null,
          fecha_fin: null,
          monto: parseFloat(montoValue),
          proposito: null,
          horario: null,
          dias_solicitados: null
        };
        break;

      case 'certificado':
        const propositoValue = this.solicitudForm?.get('proposito')?.value;

        if (!propositoValue || propositoValue.trim().length < 3) {
          console.error('Propósito inválido para certificado');
          this.markFormGroupTouched();
          return;
        }

        formData = {
          tipo_solicitud: tipoSolicitud,
          trabajador_id: parseInt(trabajadorControl.value),
          motivo: motivoControl.value.trim(),
          urgencia: formData.urgencia,
          fecha_inicio: null,
          fecha_fin: null,
          monto: null,
          proposito: propositoValue.trim(),
          horario: null,
          dias_solicitados: null
        };
        break;

      default:
        console.error('Tipo de solicitud no válido:', tipoSolicitud);
        return;
    }

    // Verificar que NO haya valores undefined
    Object.keys(formData).forEach(key => {
      if (formData[key] === undefined) {
        console.warn(`Campo ${key} es undefined, convertido a null`);
        formData[key] = null;
      }
    });

    console.log('=== DATOS FINALES LIMPIADOS ===');
    console.log('Datos a enviar:', JSON.stringify(formData, null, 2));
    console.log('================================');

    this.saving = true;

    const request = this.modalMode === 'create'
      ? this.solicitudesService.createSolicitud(formData)
      : this.solicitudesService.updateSolicitud(this.selectedSolicitud!.id!, formData);

    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        console.log('Respuesta exitosa:', response);
        if (response && response.success) {
          alert('Solicitud guardada exitosamente');
          this.closeModal();
          this.loadSolicitudes();
          this.loadEstadisticas();
        } else {
          console.error('Respuesta sin éxito:', response);
          alert('Error: ' + (response?.message || 'Error desconocido'));
        }
        this.saving = false;
      },
      error: (error) => {
        console.error('Error completo del servidor:', error);
        this.saving = false;

        let errorMessage = 'Error al guardar la solicitud';
        if (error?.error?.message) {
          errorMessage = error.error.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }

        alert('Error: ' + errorMessage);
      }
    });
  }


  /**
 * Método auxiliar para debug de valores undefined
 */
  private checkForUndefinedValues(obj: any, objName: string = 'objeto'): void {
    console.log(`=== Verificando ${objName} ===`);
    Object.entries(obj).forEach(([key, value]) => {
      console.log(`${key}: ${value} (tipo: ${typeof value})`);
      if (value === undefined) {
        console.error(`¡ALERTA! ${key} es undefined`);
      }
    });
    console.log('==============================');
  }

  /**
   * Método para resetear completamente el formulario
   */
  private resetFormCompletely(): void {
    this.solicitudForm?.reset({
      tipo_solicitud: '',
      trabajador_id: '',
      fecha_inicio: '',
      fecha_fin: '',
      motivo: '',
      urgencia: 'normal',
      monto: '',
      proposito: '',
      horario: ''
    });

    // Limpiar todas las validaciones
    Object.keys(this.solicitudForm?.controls || {}).forEach(key => {
      const control = this.solicitudForm?.get(key);
      if (control && key !== 'tipo_solicitud' && key !== 'trabajador_id' && key !== 'motivo') {
        control.clearValidators();
        control.setErrors(null);
        control.updateValueAndValidity({ emitEvent: false });
      }
    });
  }


  /**
   * MÉTODO ADICIONAL: Resetear formulario al cambiar tipo
   */
  onTipoSolicitudChange(): void {
    const tipo = this.solicitudForm?.get('tipo_solicitud')?.value;

    if (tipo) {
      // Limpiar campos no aplicables inmediatamente
      switch (tipo) {
        case 'permiso':
          this.solicitudForm?.patchValue({
            fecha_fin: '',
            monto: '',
            proposito: ''
          });
          break;
        case 'vacaciones':
        case 'licencia':
          this.solicitudForm?.patchValue({
            monto: '',
            proposito: '',
            horario: ''
          });
          break;
        case 'adelanto':
          this.solicitudForm?.patchValue({
            fecha_inicio: '',
            fecha_fin: '',
            proposito: '',
            horario: ''
          });
          break;
        case 'certificado':
          this.solicitudForm?.patchValue({
            fecha_inicio: '',
            fecha_fin: '',
            monto: '',
            horario: ''
          });
          break;
      }

      // Aplicar nuevas validaciones
      this.updateValidationsByType(tipo);
    }
  }

  /**
   * Aprobar solicitud
   */
  aprobarSolicitud(id: number): void {
    if (confirm('¿Está seguro que desea aprobar esta solicitud?')) {
      this.solicitudesService.cambiarEstado(id, 'aprobada', '', 'Administrador')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.loadSolicitudes();
              this.loadEstadisticas();
            }
          },
          error: (error) => {
            console.error('Error approving solicitud:', error);
          }
        });
    }
  }

  /**
   * Rechazar solicitud
   */
  rechazarSolicitud(id: number): void {
    const razon = prompt('Ingrese la razón del rechazo:');
    if (razon) {
      this.solicitudesService.cambiarEstado(id, 'rechazada', razon, 'Administrador')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.loadSolicitudes();
              this.loadEstadisticas();
            }
          },
          error: (error) => {
            console.error('Error rejecting solicitud:', error);
          }
        });
    }
  }

  /**
   * Reactivar solicitud
   */
  reactivarSolicitud(id: number): void {
    if (confirm('¿Desea reactivar esta solicitud para nueva revisión?')) {
      this.solicitudesService.reactivarSolicitud(id, 'Administrador')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.loadSolicitudes();
              this.loadEstadisticas();
            }
          },
          error: (error) => {
            console.error('Error reactivating solicitud:', error);
          }
        });
    }
  }

  /**
   * Eliminar solicitud
   */
  deleteSolicitud(solicitud: Solicitud): void {
    if (confirm(`¿Está seguro que desea eliminar la solicitud "${solicitud.titulo}"?`)) {
      this.solicitudesService.deleteSolicitud(solicitud.id!)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.loadSolicitudes();
              this.loadEstadisticas();
            }
          },
          error: (error) => {
            console.error('Error deleting solicitud:', error);
          }
        });
    }
  }

  /**
   * Exportar solicitudes a CSV
   */
  exportarCSV(): void {
    this.solicitudesService.exportarCSV(this.filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `solicitudes_${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Error exporting CSV:', error);
        }
      });
  }

  /**
   * Cargar estadísticas
   */
  private loadEstadisticas(): void {
    this.loadingStats = true;
    this.solicitudesService.getEstadisticas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.estadisticas = response.data;
          }
          this.loadingStats = false;
        },
        error: (error) => {
          console.error('Error loading estadisticas:', error);
          this.loadingStats = false;
        }
      });
  }

  /**
   * Marcar todos los campos del formulario como tocados
   */
  private markFormGroupTouched(): void {
    Object.keys(this.solicitudForm!.controls).forEach(key => {
      const control = this.solicitudForm?.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Verificar si un campo del formulario tiene errores
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.solicitudForm?.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * Obtener mensaje de error para un campo
   */
  getFieldError(fieldName: string): string {
    const field = this.solicitudForm?.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} es requerido`;
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['min']) return `Valor mínimo: ${field.errors['min'].min}`;
    }
    return '';
  }

  /**
   * Obtener valor de un control
   */
  getControlValue(controlName: string): any {
    return this.solicitudForm?.get(controlName)?.value;
  }

  /**
   * Verificar si deben mostrarse campos específicos
   */
  shouldShowDateFields(): boolean {
    const tipo = this.getControlValue('tipo_solicitud');
    return tipo === 'vacaciones' || tipo === 'licencia' || tipo === 'permiso';
  }

  shouldShowEndDate(): boolean {
    const tipo = this.getControlValue('tipo_solicitud');
    return tipo === 'vacaciones' || tipo === 'licencia';
  }

  shouldShowAmount(): boolean {
    return this.getControlValue('tipo_solicitud') === 'adelanto';
  }

  shouldShowPurpose(): boolean {
    return this.getControlValue('tipo_solicitud') === 'certificado';
  }

  shouldShowSchedule(): boolean {
    return this.getControlValue('tipo_solicitud') === 'permiso';
  }

  /**
   * Obtener clase CSS para estado
   */
  getStatusClass(estado: string): string {
    const statusClasses: { [key: string]: string } = {
      'pendiente': 'status-warning',
      'en-revision': 'status-info',
      'aprobada': 'status-success',
      'rechazada': 'status-danger'
    };
    return statusClasses[estado] || 'status-default';
  }

  /**
   * Obtener icono para timeline
   */
  getTimelineIcon(evento: string): string {
    const iconos: { [key: string]: string } = {
      'created': '📝',
      'reviewed': '👀',
      'approved': '✅',
      'rejected': '❌',
      'updated': '📝',
      'reactivated': '🔄'
    };
    return iconos[evento] || '📝';
  }

  /**
   * Formatear fecha
   */
  formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-ES');
  }

  /**
   * Formatear fecha y hora
   */
  formatDateTime(dateTimeString: string | undefined): string {
    if (!dateTimeString) return '';
    return new Date(dateTimeString).toLocaleString('es-ES');
  }

  /**
   * Calcular días entre fechas
   */
  calcularDias(fechaInicio?: string, fechaFin?: string): number {
    if (!fechaInicio || !fechaFin) return 0;
    return this.solicitudesService.calcularDiasSolicitados(fechaInicio, fechaFin);
  }

  /**
   * Función trackBy para optimización
   */
  trackBySolicitud(index: number, solicitud: Solicitud): any {
    return solicitud.id || index;
  }



}
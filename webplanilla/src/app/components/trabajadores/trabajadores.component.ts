import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, forkJoin } from 'rxjs';

import {
  TrabajadoresService,
  Trabajador,
  TrabajadorDetalle,
  TrabajadoresFilters,
  Area,
  Cargo,
  EstadisticasResponse
} from '../../services/trabajadores.service';

@Component({
  selector: 'app-trabajadores',
  templateUrl: './trabajadores.component.html',
  styleUrls: ['./trabajadores.component.css']
})
export class TrabajadoresComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Estados de la vista
  loading = false;
  saving = false;
  importing = false;

  // Datos principales
  trabajadores: Trabajador[] = [];
  selectedTrabajador: TrabajadorDetalle | null = null;
  areas: Area[] = [];
  cargos: Cargo[] = [];
  cargosFiltrados: Cargo[] = [];
  supervisores: Trabajador[] = [];
  estadisticas: any = null;

  // Paginación y filtros
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;

  filters: TrabajadoresFilters = {
    page: 1,
    limit: 10,
    estado: 'todos',
    sortBy: 'nombres',
    sortOrder: 'ASC'
  };

  // Formularios
  trabajadorForm: FormGroup | undefined;
  filtrosForm: FormGroup | undefined;

  // Estados de modales
  showModal = false;
  showDetailModal = false;
  showImportModal = false;
  modalMode: 'create' | 'edit' = 'create';

  // Búsqueda
  private searchSubject = new Subject<string>();

  // Archivos de importación
  selectedFile: File | null = null;
  importResults: any = null;

  constructor(
    private fb: FormBuilder,
    private trabajadoresService: TrabajadoresService
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
    this.trabajadorForm = this.fb.group({
      dni: ['', [Validators.required, Validators.pattern(/^\d{8,12}$/)]],
      nombres: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      apellido_paterno: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      apellido_materno: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      fecha_nacimiento: [''],
      genero: ['masculino'],
      estado_civil: ['soltero'],
      nacionalidad: ['Peruana'],
      direccion: [''],
      fecha_ingreso: ['', Validators.required],
      cargo_id: ['', Validators.required],
      area_id: ['', Validators.required],
      sueldo_basico: ['', [Validators.required, Validators.min(0)]],
      tipo_contrato: ['indefinido', Validators.required], // NUEVO
      fecha_fin: [''], // NUEVO
      tipo_jornada: ['tiempo_completo'],
      supervisor_directo_id: [''],
      essalud: [true],
      afp: [false],
      snp: [false],
      seguro_vida: [false],
      telefono_principal: [''],
      telefono_secundario: [''],
      correo_electronico: ['', Validators.email],
      correo_personal: ['', Validators.email],
      contacto_emergencia_nombre: [''],
      contacto_emergencia_relacion: [''],
      contacto_emergencia_telefono: [''],
      contacto_emergencia_correo: ['', Validators.email]
    });

    this.trabajadorForm.get('tipo_contrato')?.valueChanges.subscribe(tipoContrato => {
      const fechaFinControl = this.trabajadorForm?.get('fecha_fin');
      if (tipoContrato === 'plazo_fijo' || tipoContrato === 'temporal') {
        fechaFinControl?.setValidators([Validators.required]);
      } else {
        fechaFinControl?.clearValidators();
        fechaFinControl?.setValue('');
      }
      fechaFinControl?.updateValueAndValidity();
    });

    this.filtrosForm = this.fb.group({
      search: [''],
      area: ['todas'],
      cargo: ['todos'],
      estado: ['todos'],
      sortBy: ['nombres'],
      sortOrder: ['ASC']
    });

    // Escuchar cambios en el área para filtrar cargos
    this.trabajadorForm.get('area_id')?.valueChanges.subscribe(areaId => {
      if (areaId) {
        this.filterCargosByArea(areaId);
        this.trabajadorForm?.patchValue({ cargo_id: '' });
      }
    });
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
        this.filters.page = 1;
        this.loadTrabajadores();
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

  private loadInitialData(): void {
    this.loading = true;

    forkJoin({
      areas: this.trabajadoresService.getAreasActivas(),
      cargos: this.trabajadoresService.getCargosActivos(),
      supervisores: this.trabajadoresService.getSupervisores(),
      estadisticas: this.trabajadoresService.getEstadisticas(),
      trabajadores: this.trabajadoresService.getTrabajadores(this.filters)
    }).subscribe({
      next: (data) => {
        // DEBUG: Log completo de la respuesta
        console.log('=== DEBUG loadInitialData ===');
        console.log('Full response:', data);
        console.log('Areas response:', data.areas);
        console.log('Areas data:', data.areas.data);
        console.log('Is areas.data an array?', Array.isArray(data.areas.data));
        console.log('Type of areas.data:', typeof data.areas.data);

        // SAFE ASSIGNMENT con validación
        this.areas = Array.isArray(data.areas.data) ? data.areas.data : [];
        this.cargos = Array.isArray(data.cargos.data) ? data.cargos.data : [];
        this.supervisores = Array.isArray(data.supervisores.data) ? data.supervisores.data : [];

        console.log('Final areas array:', this.areas);
        console.log('Final cargos array:', this.cargos);

        this.estadisticas = data.estadisticas.data;

        if (data.trabajadores.success) {
          const trabajadoresData = data.trabajadores.data.trabajadores;
          this.trabajadores = Array.isArray(trabajadoresData) ? trabajadoresData : [];
          this.updatePagination(data.trabajadores.data.pagination);
        }

        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading initial data:', error);
        this.loading = false;
      }
    });
  }


  /**
   * Cargar trabajadores con filtros
   */
  loadTrabajadores(): void {
    this.loading = true;

    this.trabajadoresService.getTrabajadores(this.filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.trabajadores = response.data.trabajadores;
            this.updatePagination(response.data.pagination);
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading trabajadores:', error);
          this.loading = false;
        }
      });
  }

  /**
   * Actualizar información de paginación
   */
  private updatePagination(pagination: any): void {
    this.currentPage = pagination.current_page;
    this.pageSize = pagination.per_page;
    this.totalItems = pagination.total;
    this.totalPages = pagination.total_pages;
  }

  /**
   * Aplicar filtros
   */
  applyFilters(filterValues: any): void {
    this.filters = {
      ...this.filters,
      page: 1,
      area: filterValues.area !== 'todas' ? filterValues.area : undefined,
      cargo: filterValues.cargo !== 'todos' ? filterValues.cargo : undefined,
      estado: filterValues.estado !== 'todos' ? filterValues.estado : 'todos',
      sortBy: filterValues.sortBy,
      sortOrder: filterValues.sortOrder
    };

    this.loadTrabajadores();
  }

  /**
   * Manejar búsqueda
   */
  onSearch(term: string): void {
    this.searchSubject.next(term);
  }

  /**
   * Cambiar página
   */
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.filters.page = page;
      this.loadTrabajadores();
    }
  }

  /**
   * Filtrar cargos por área
   */
  private filterCargosByArea(areaId: number): void {
    console.log('=== DEBUG filterCargosByArea ===');
    console.log('Filtering by area ID:', areaId);
    console.log('Available cargos:', this.cargos);

    this.cargosFiltrados = this.cargos.filter(cargo => {
      console.log(`Cargo ${cargo.id} (${cargo.nombre}) - area_id: ${cargo.area_id}`);
      return cargo.area_id === Number(areaId);
    });

    console.log('Filtered cargos:', this.cargosFiltrados);
  }

  /**
   * Abrir modal para crear trabajador
   */
  openCreateModal(): void {
    this.modalMode = 'create';
    this.trabajadorForm?.reset();
    this.trabajadorForm?.patchValue({
      genero: 'masculino',
      estado_civil: 'soltero',
      nacionalidad: 'Peruana',
      tipo_jornada: 'tiempo_completo',
      essalud: true,
      fecha_ingreso: new Date().toISOString().split('T')[0]
    });
    this.showModal = true;
  }

  /**
   * Abrir modal para editar trabajador
   */
  openEditModal(trabajador: Trabajador): void {
    this.modalMode = 'edit';
    this.loading = true;

    this.trabajadoresService.getTrabajadorById(trabajador.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            const trabajadorCompleto = response.data.trabajador;

            this.selectedTrabajador = trabajadorCompleto;

            if (trabajadorCompleto.area_id) {
              this.filterCargosByArea(trabajadorCompleto.area_id);
            }

            this.trabajadorForm?.patchValue({
              dni: trabajadorCompleto.dni,
              nombres: trabajadorCompleto.nombres,
              apellido_paterno: trabajadorCompleto.apellido_paterno,
              apellido_materno: trabajadorCompleto.apellido_materno,
              fecha_nacimiento: trabajadorCompleto.fecha_nacimiento?.split('T')[0],
              genero: trabajadorCompleto.genero,
              estado_civil: trabajadorCompleto.estado_civil,
              nacionalidad: trabajadorCompleto.nacionalidad,
              direccion: trabajadorCompleto.direccion,
              fecha_ingreso: trabajadorCompleto.fecha_ingreso?.split('T')[0],
              area_id: trabajadorCompleto.area_id,
              cargo_id: trabajadorCompleto.cargo_id,
              sueldo_basico: trabajadorCompleto.sueldo_basico,
              tipo_contrato: trabajadorCompleto.tipo_contrato || 'indefinido', // NUEVO
              fecha_fin: trabajadorCompleto.fecha_fin?.split('T')[0], // NUEVO
              tipo_jornada: trabajadorCompleto.tipo_jornada,
              supervisor_directo_id: trabajadorCompleto.supervisor_directo_id,
              essalud: trabajadorCompleto.essalud,
              afp: trabajadorCompleto.afp,
              snp: trabajadorCompleto.snp,
              seguro_vida: trabajadorCompleto.seguro_vida,
              telefono_principal: trabajadorCompleto.telefono_principal,
              telefono_secundario: trabajadorCompleto.telefono_secundario,
              correo_electronico: trabajadorCompleto.correo_electronico,
              correo_personal: trabajadorCompleto.correo_personal,
              contacto_emergencia_nombre: trabajadorCompleto.contacto_emergencia_nombre,
              contacto_emergencia_relacion: trabajadorCompleto.contacto_emergencia_relacion,
              contacto_emergencia_telefono: trabajadorCompleto.contacto_emergencia_telefono,
              contacto_emergencia_correo: trabajadorCompleto.contacto_emergencia_correo
            });

            this.showModal = true;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading trabajador details:', error);
          this.loading = false;
        }
      });
  }

  /**
   * Cerrar modal de formulario
   */
  closeModal(): void {
    this.showModal = false;
    this.trabajadorForm?.reset();
    this.selectedTrabajador = null;
  }

  /**
   * Guardar trabajador (crear o actualizar)
   */
  onSave(): void {
    if (this.trabajadorForm?.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.saving = true;
    const formData = this.trabajadorForm?.value;

    const request = this.modalMode === 'create'
      ? this.trabajadoresService.createTrabajador(formData)
      : this.trabajadoresService.updateTrabajador(this.selectedTrabajador!.id!, formData);

    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response.success) {
          this.closeModal();
          this.loadTrabajadores();
          // Aquí podrías mostrar una notificación de éxito
          console.log(response.message);
        }
        this.saving = false;
      },
      error: (error) => {
        console.error('Error saving trabajador:', error);
        this.saving = false;
      }
    });
  }

  /**
   * Marcar todos los campos del formulario como tocados
   */
  private markFormGroupTouched(): void {
    Object.keys(this.trabajadorForm!.controls).forEach(key => {
      const control = this.trabajadorForm?.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Ver detalles del trabajador
   */
  viewTrabajador(id: number): void {
    this.loading = true;
    this.trabajadoresService.getTrabajadorById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.selectedTrabajador = response.data.trabajador;
            this.showDetailModal = true;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading trabajador details:', error);
          this.loading = false;
        }
      });
  }

  /**
   * Cambiar estado del trabajador
   */
  toggleEstado(trabajador: Trabajador): void {
    const nuevoEstado = trabajador.estado === 'activo' ? 'inactivo' : 'activo';

    this.trabajadoresService.cambiarEstado(trabajador.id!, nuevoEstado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            trabajador.estado = nuevoEstado;
            console.log(response.message);
          }
        },
        error: (error) => {
          console.error('Error changing estado:', error);
        }
      });
  }

  /**
   * Eliminar trabajador
   */
  deleteTrabajador(trabajador: Trabajador): void {
    if (confirm(`¿Está seguro que desea eliminar al trabajador ${trabajador.nombre_completo}?`)) {
      this.trabajadoresService.deleteTrabajador(trabajador.id!)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.loadTrabajadores();
              console.log(response.message);
            }
          },
          error: (error) => {
            console.error('Error deleting trabajador:', error);
          }
        });
    }
  }

  /**
   * Exportar trabajadores a CSV
   */
  exportarCSV(): void {
    this.trabajadoresService.exportarCSV()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `trabajadores_${new Date().toISOString().split('T')[0]}.csv`;
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
   * Descargar plantilla CSV
   */
  descargarPlantilla(): void {
    this.trabajadoresService.descargarPlantillaCSV()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'plantilla_trabajadores.csv';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Error downloading template:', error);
        }
      });
  }

  /**
   * Manejar selección de archivo para importar
   */
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      this.selectedFile = file;
    } else {
      alert('Por favor seleccione un archivo CSV válido');
      this.selectedFile = null;
    }
  }

  /**
   * Importar trabajadores desde CSV
   */
  importarCSV(): void {
    if (!this.selectedFile) {
      alert('Por favor seleccione un archivo CSV');
      return;
    }

    this.importing = true;
    this.trabajadoresService.importarTrabajadores(this.selectedFile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.importResults = response.data;
          this.importing = false;
          this.selectedFile = null;

          if (response.success) {
            this.loadTrabajadores(); // Recargar lista
            // Mostrar resultados de importación
            console.log('Import completed:', this.importResults);
          }
        },
        error: (error) => {
          console.error('Error importing CSV:', error);
          this.importing = false;
        }
      });
  }

  /**
   * Cerrar modal de importación
   */
  closeImportModal(): void {
    this.showImportModal = false;
    this.selectedFile = null;
    this.importResults = null;
  }

  /**
   * Cerrar modal de detalles
   */
  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedTrabajador = null;
  }

  /**
   * Obtener páginas para paginación
   */
  getPages(): number[] {
    const pages = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  /**
   * Función trackBy para optimización de rendimiento
   */
  trackByTrabajador(index: number, trabajador: Trabajador): any {
    return trabajador.id || index;
  }

  /**
   * Verificar si un campo del formulario tiene errores
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.trabajadorForm?.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * Obtener mensaje de error para un campo
   */
  getFieldError(fieldName: string): string {
    const field = this.trabajadorForm?.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} es requerido`;
      if (field.errors['email']) return 'Email inválido';
      if (field.errors['pattern']) return 'Formato inválido';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['maxlength']) return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
      if (field.errors['min']) return `Valor mínimo: ${field.errors['min'].min}`;
    }
    return '';
  }

  // Helper methods para evitar errores de tipos
  getControl(controlName: string): any {
    return this.trabajadorForm?.get(controlName);
  }

  getControlValue(controlName: string): any {
    return this.trabajadorForm?.get(controlName)?.value;
  }

  setControlValue(controlName: string, value: any): void {
    this.trabajadorForm?.get(controlName)?.setValue(value);
  }

  getTipoContratoLabel(tipo?: string): string {
    switch (tipo) {
      case 'indefinido': return 'Indefinido';
      case 'plazo_fijo': return 'Plazo Fijo';
      case 'temporal': return 'Temporal';
      case 'practicas': return 'Prácticas';
      default: return 'Indefinido';
    }
  }

}
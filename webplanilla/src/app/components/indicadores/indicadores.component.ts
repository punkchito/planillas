// src/app/components/indicadores/indicadores.component.ts - CORREGIDO
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import {
  IndicadoresService,
  Variable,
  Dimension,
  Indicator,
  DashboardStats,
  IndicadoresFilters
} from '../../services/indicadores.service';

interface TreeNode {
  id: string;
  name: string;
  type: 'variable' | 'dimension' | 'indicator';
  expanded: boolean;
  data: Variable | Dimension | Indicator;
  children?: TreeNode[];
}

@Component({
  selector: 'app-indicadores',
  templateUrl: './indicadores.component.html',
  styleUrls: ['./indicadores.component.css']
})
export class IndicadoresComponent implements OnInit, OnDestroy {
  // Estado del componente
  isLoading = false;
  currentTab: 'dashboard' | 'metrics' | 'config' | 'reports' = 'dashboard';
  showModal = false;
  currentMode: 'new' | 'edit' = 'new';
  selectedNode: TreeNode | null = null;
  editingItemId: string | null = null;
  modalType: 'indicator' | 'variable' | 'dimension' = 'variable'; // NUEVO

  // Datos principales
  variables: Variable[] = [];
  dimensions: Dimension[] = [];
  indicators: Indicator[] = [];
  dashboardStats: DashboardStats | null = null;
  treeNodes: TreeNode[] = [];

  // Filtros
  filters: IndicadoresFilters = {
    status: 'active'
  };

  // Formularios
  searchForm!: FormGroup;
  indicatorForm!: FormGroup;
  variableForm!: FormGroup;
  dimensionForm!: FormGroup;

  // Configuraciones
  readonly indicatorTypes = [
    { value: 'porcentaje', label: 'Porcentaje (%)' },
    { value: 'cantidad', label: 'Cantidad' },
    { value: 'tiempo', label: 'Tiempo' },
    { value: 'costo', label: 'Costo' },
    { value: 'ratio', label: 'Ratio' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private indicadoresService: IndicadoresService,
    private formBuilder: FormBuilder,
    private router: Router,
    private cdr: ChangeDetectorRef  // NUEVO
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
    // Formulario de búsqueda
    this.searchForm = this.formBuilder.group({
      searchTerm: ['']
    });

    // Formulario de indicador
    this.indicatorForm = this.formBuilder.group({
      id: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/^[a-z0-9\-]+$/)]],
      name: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', Validators.maxLength(1000)],
      dimension_id: ['', Validators.required], // CORREGIDO: era dimensionId
      type: ['', Validators.required],
      current_value: [0, [Validators.required, Validators.min(0)]], // CORREGIDO: era currentValue
      target_value: [0, [Validators.required, Validators.min(0)]], // CORREGIDO: era targetValue
      unit: ['', [Validators.required, Validators.maxLength(20)]],
      formula: ['', Validators.maxLength(1000)],
      status: ['active']
    });

    // Formulario de variable
    this.variableForm = this.formBuilder.group({
      id: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/^[a-z0-9\-]+$/)]],
      name: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', Validators.maxLength(1000)],
      status: ['active']
    });

    // Formulario de dimensión
    this.dimensionForm = this.formBuilder.group({
      id: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/^[a-z0-9\-]+$/)]],
      name: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', Validators.maxLength(1000)],
      variable_id: ['', Validators.required], // CORREGIDO: era variableId
      status: ['active']
    });
  }

  private setupSearchSubscription(): void {
    this.searchForm.get('searchTerm')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.filters.search = searchTerm;
        this.loadIndicators();
      });
  }

  private loadInitialData(): void {
    this.isLoading = true;
    Promise.all([
      this.loadTreeStructure(),
      this.loadDashboardStats(),
      this.loadIndicators()
    ]).finally(() => {
      this.isLoading = false;
    });
  }

  // ==================
  // CARGA DE DATOS
  // ==================

  /*   private loadTreeStructure(): Promise<void> {
      return new Promise((resolve, reject) => {
        this.indicadoresService.getTreeStructure()
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              if (response.success && response.data) {
                this.variables = response.data;
                this.buildTreeNodes();
              }
              resolve();
            },
            error: (error) => {
              console.error('Error cargando estructura:', error);
              this.showNotification('Error cargando estructura de indicadores', 'error');
              reject(error);
            }
          });
      });
    } */

  private loadDashboardStats(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.indicadoresService.getDashboardStats()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && response.data) {
              this.dashboardStats = response.data;
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

  private loadIndicators(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.indicadoresService.getIndicators(this.filters)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && response.data) {
              this.indicators = response.data;
            }
            resolve();
          },
          error: (error) => {
            console.error('Error cargando indicadores:', error);
            reject(error);
          }
        });
    });
  }

  /*   private buildTreeNodes(): void {
      console.log('Construyendo árbol con variables:', this.variables); // DEBUG
  
      this.treeNodes = this.variables.map(variable => {
        const variableNode: TreeNode = {
          id: variable.id,
          name: variable.name,
          type: 'variable',
          expanded: true,
          data: variable,
          children: []
        };
  
        // CORREGIDO: Verificar que dimensions existe y no está vacío
        if (variable.dimensions && variable.dimensions.length > 0) {
          console.log(`Variable ${variable.name} tiene ${variable.dimensions.length} dimensiones`); // DEBUG
  
          variableNode.children = variable.dimensions.map(dimension => {
            const dimensionNode: TreeNode = {
              id: dimension.id,
              name: dimension.name,
              type: 'dimension',
              expanded: true,
              data: dimension,
              children: []
            };
  
            // CORREGIDO: Verificar que indicators existe y no está vacío
            if (dimension.indicators && dimension.indicators.length > 0) {
              console.log(`Dimensión ${dimension.name} tiene ${dimension.indicators.length} indicadores`); // DEBUG
  
              dimensionNode.children = dimension.indicators.map(indicator => ({
                id: indicator.id,
                name: indicator.name,
                type: 'indicator',
                expanded: false,
                data: indicator
              }));
            }
  
            return dimensionNode;
          });
        }
  
        return variableNode;
      });
  
      console.log('Árbol construido:', this.treeNodes); // DEBUG
    } */

  // ==================
  // NAVEGACIÓN DE TABS
  // ==================

  showTab(tabId: 'dashboard' | 'metrics' | 'config' | 'reports'): void {
    this.currentTab = tabId;

    if (tabId === 'config') {
      this.loadDimensionsForConfig();
    }
  }

  private loadDimensionsForConfig(): void {
    this.indicadoresService.getDimensions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.dimensions = response.data;
          }
        },
        error: (error) => {
          console.error('Error cargando dimensiones:', error);
        }
      });
  }

  // ==================
  // GESTIÓN DE MODAL
  // ==================

  // CORREGIDO: Método openModal mejorado
  openModal(type: 'indicator' | 'variable' | 'dimension', item?: any): void {
    console.log('🔄 Abriendo modal:', type, 'con item:', item);

    this.showModal = true;
    this.modalType = type;
    this.currentMode = item && item.id ? 'edit' : 'new';
    this.editingItemId = item && item.id ? item.id : null;

    // CRÍTICO: Cargar dimensiones y variables antes de abrir el modal
    this.loadDataForModal().then(() => {
      if (item && item.id) {
        // Modo edición - cargar datos existentes
        this.loadItemToForm(type, item);
      } else {
        // Modo creación - resetear formularios
        this.resetForms();

        // Pre-llenar campos según el contexto
        if (type === 'dimension' && item && item.variable_id) {
          console.log('📝 Pre-llenando variable_id:', item.variable_id);
          this.dimensionForm.patchValue({
            variable_id: item.variable_id
          });
        }

        if (type === 'indicator' && item && item.dimension_id) {
          console.log('📝 Pre-llenando dimension_id:', item.dimension_id);
          this.indicatorForm.patchValue({
            dimension_id: item.dimension_id
          });
        }
      }
    }).catch(error => {
      console.error('❌ Error cargando datos para modal:', error);
      this.showNotification('Error cargando datos necesarios', 'error');
    });
  }

  closeModal(): void {
    console.log('❌ Cerrando modal');
    this.showModal = false;
    this.resetForms();
    this.editingItemId = null;
    this.modalType = 'variable';
    this.currentMode = 'new';
  }

  private loadDataForModal(): Promise<void> {
    console.log('📥 Cargando datos para modal...');

    const promises: Promise<void>[] = [];

    // Cargar variables si no existen
    if (!this.variables || this.variables.length === 0) {
      const variablesPromise = new Promise<void>((resolve, reject) => {
        this.indicadoresService.getVariables(true)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              if (response.success && response.data) {
                this.variables = response.data;
                console.log('✅ Variables cargadas:', this.variables.length);
              }
              resolve();
            },
            error: (error) => {
              console.error('❌ Error cargando variables:', error);
              reject(error);
            }
          });
      });
      promises.push(variablesPromise);
    }

    // Cargar dimensiones si no existen
    if (!this.dimensions || this.dimensions.length === 0) {
      const dimensionsPromise = new Promise<void>((resolve, reject) => {
        this.indicadoresService.getDimensions(undefined, false)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              if (response.success && response.data) {
                this.dimensions = response.data;
                console.log('✅ Dimensiones cargadas:', this.dimensions.length);
              }
              resolve();
            },
            error: (error) => {
              console.error('❌ Error cargando dimensiones:', error);
              reject(error);
            }
          });
      });
      promises.push(dimensionsPromise);
    }

    return Promise.all(promises).then(() => {
      console.log('✅ Todos los datos cargados para el modal');
      this.cdr.detectChanges(); // Actualizar la vista
    });
  }
  // CORREGIDO: Método loadItemToForm
  private loadItemToForm(type: 'indicator' | 'variable' | 'dimension', item: any): void {
    console.log('📝 Cargando datos al formulario:', type, item);

    try {
      switch (type) {
        case 'indicator':
          const indicatorData = item.data || item;
          this.indicatorForm.patchValue({
            id: indicatorData.id || '',
            name: indicatorData.name || '',
            description: indicatorData.description || '',
            dimension_id: indicatorData.dimension_id || '',
            type: indicatorData.type || '',
            current_value: indicatorData.current_value || 0,
            target_value: indicatorData.target_value || 0,
            unit: indicatorData.unit || '',
            formula: indicatorData.formula || '',
            status: indicatorData.status || 'active'
          });
          console.log('✅ Formulario de indicador cargado');
          break;

        case 'variable':
          const variableData = item.data || item;
          this.variableForm.patchValue({
            id: variableData.id || '',
            name: variableData.name || '',
            description: variableData.description || '',
            status: variableData.status || 'active'
          });
          console.log('✅ Formulario de variable cargado');
          break;

        case 'dimension':
          const dimensionData = item.data || item;
          this.dimensionForm.patchValue({
            id: dimensionData.id || '',
            name: dimensionData.name || '',
            description: dimensionData.description || '',
            variable_id: dimensionData.variable_id || '',
            status: dimensionData.status || 'active'
          });
          console.log('✅ Formulario de dimensión cargado');
          break;
      }
    } catch (error) {
      console.error('❌ Error cargando datos al formulario:', error);
      this.showNotification('Error cargando datos del elemento', 'error');
    }
  }

  resetForms(): void {
    console.log('🔄 Reseteando formularios');

    this.indicatorForm.reset({
      status: 'active',
      current_value: 0,
      target_value: 0
    });

    this.variableForm.reset({
      status: 'active'
    });

    this.dimensionForm.reset({
      status: 'active'
    });

    // Limpiar errores
    this.indicatorForm.markAsUntouched();
    this.variableForm.markAsUntouched();
    this.dimensionForm.markAsUntouched();
  }

  // ==================
  // OPERACIONES CRUD
  // ==================

  onSubmitIndicator(): void {
    console.log('📤 Enviando formulario de indicador...');
    console.log('🔍 Estado del formulario:', this.indicatorForm.valid);
    console.log('🔍 Errores:', this.indicatorForm.errors);
    console.log('🔍 Valores:', this.indicatorForm.value);

    if (!this.indicatorForm.valid) {
      console.log('❌ Formulario inválido, mostrando errores');
      this.markFormGroupTouched(this.indicatorForm);
      this.showFormErrors(this.indicatorForm);
      return;
    }

    const formData = this.indicatorForm.value;
    console.log('📝 Datos a enviar:', formData);

    if (this.currentMode === 'new') {
      this.createIndicator(formData);
    } else if (this.editingItemId) {
      this.updateIndicator(formData);
    }
  }

  onSubmitVariable(): void {
    console.log('📤 Enviando formulario de variable...');
    console.log('🔍 Estado del formulario:', this.variableForm.valid);
    console.log('🔍 Valores:', this.variableForm.value);

    if (!this.variableForm.valid) {
      console.log('❌ Formulario inválido');
      this.markFormGroupTouched(this.variableForm);
      this.showFormErrors(this.variableForm);
      return;
    }

    const formData = this.variableForm.value;
    console.log('📝 Datos a enviar:', formData);

    if (this.currentMode === 'new') {
      this.createVariable(formData);
    } else if (this.editingItemId) {
      this.updateVariable(formData);
    }
  }

  onSubmitDimension(): void {
    console.log('📤 Enviando formulario de dimensión...');
    console.log('🔍 Estado del formulario:', this.dimensionForm.valid);
    console.log('🔍 Valores:', this.dimensionForm.value);

    if (!this.dimensionForm.valid) {
      console.log('❌ Formulario inválido');
      this.markFormGroupTouched(this.dimensionForm);
      this.showFormErrors(this.dimensionForm);
      return;
    }

    const formData = this.dimensionForm.value;
    console.log('📝 Datos a enviar:', formData);

    if (this.currentMode === 'new') {
      this.createDimension(formData);
    } else if (this.editingItemId) {
      this.updateDimension(formData);
    }
  }

  private createIndicator(data: Partial<Indicator>): void {
    console.log('🆕 Creando nuevo indicador:', data);
    this.isLoading = true;

    this.indicadoresService.createIndicator(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('📨 Respuesta del servidor:', response);
          if (response.success) {
            this.showNotification('Indicador creado exitosamente', 'success');
            this.closeModal();
            this.refreshData();
          } else {
            console.error('❌ Error en respuesta:', response.message);
            this.showNotification(response.message || 'Error al crear indicador', 'error');
          }
        },
        error: (error) => {
          console.error('❌ Error HTTP:', error);
          const message = error.error?.message || 'Error de conexión al crear indicador';
          this.showNotification(message, 'error');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  private updateIndicator(data: Partial<Indicator>): void {
    if (!this.editingItemId) return;

    this.isLoading = true;
    this.indicadoresService.updateIndicator(this.editingItemId, data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showNotification('Indicador actualizado exitosamente', 'success');
            this.closeModal();
            this.refreshData();
          }
        },
        error: (error) => {
          console.error('Error actualizando indicador:', error);
          this.showNotification('Error al actualizar indicador', 'error');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  private createVariable(data: Partial<Variable>): void {
    console.log('🆕 Creando nueva variable:', data);
    this.isLoading = true;

    this.indicadoresService.createVariable(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('📨 Respuesta del servidor:', response);
          if (response.success) {
            this.showNotification('Variable creada exitosamente', 'success');
            this.closeModal();
            this.refreshData();
          } else {
            console.error('❌ Error en respuesta:', response.message);
            this.showNotification(response.message || 'Error al crear variable', 'error');
          }
        },
        error: (error) => {
          console.error('❌ Error HTTP:', error);
          const message = error.error?.message || 'Error de conexión al crear variable';
          this.showNotification(message, 'error');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  private updateVariable(data: Partial<Variable>): void {
    if (!this.editingItemId) return;

    this.isLoading = true;
    this.indicadoresService.updateVariable(this.editingItemId, data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showNotification('Variable actualizada exitosamente', 'success');
            this.closeModal();
            this.refreshData();
          }
        },
        error: (error) => {
          console.error('Error actualizando variable:', error);
          this.showNotification('Error al actualizar variable', 'error');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  private createDimension(data: Partial<Dimension>): void {
    console.log('🆕 Creando nueva dimensión:', data);
    this.isLoading = true;

    // MAPEAR campos para el backend
    const dimensionData = {
      id: data.id,
      name: data.name,
      description: data.description,
      variableId: data.variable_id, // Backend espera 'variableId'
      status: data.status || 'active'
    };

    console.log('📝 Datos mapeados para backend:', dimensionData);

    this.indicadoresService.createDimension(dimensionData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('📨 Respuesta del servidor:', response);
          if (response.success) {
            this.showNotification('Dimensión creada exitosamente', 'success');
            this.closeModal();
            this.refreshData();
          } else {
            console.error('❌ Error en respuesta:', response.message);
            this.showNotification(response.message || 'Error al crear dimensión', 'error');
          }
        },
        error: (error) => {
          console.error('❌ Error HTTP:', error);
          const message = error.error?.message || 'Error de conexión al crear dimensión';
          this.showNotification(message, 'error');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  private updateDimension(data: Partial<Dimension>): void {
    if (!this.editingItemId) return;

    this.isLoading = true;
    // CORREGIDO: Mapear el campo correctamente
    const dimensionData = {
      ...data,
      variableId: data.variable_id // El backend espera variableId
    };

    this.indicadoresService.updateDimension(this.editingItemId, dimensionData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showNotification('Dimensión actualizada exitosamente', 'success');
            this.closeModal();
            this.refreshData();
          }
        },
        error: (error) => {
          console.error('Error actualizando dimensión:', error);
          this.showNotification('Error al actualizar dimensión', 'error');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  // ==================
  // ACCIONES DE ÁRBOL
  // ==================

  selectNode(node: TreeNode): void {
    console.log('🎯 Selecting node:', node?.name, node?.type);

    if (!node) {
      console.error('❌ Cannot select null node');
      return;
    }

    this.selectedNode = node;
    console.log('✅ Node selected:', node.name);

    // Si el nodo tiene hijos y no está expandido, expandirlo
    if (node.children && node.children.length > 0 && !node.expanded) {
      console.log('📂 Auto-expanding node with children');
      node.expanded = true;
      this.cdr.detectChanges();
    }
  }

  toggleNode(node: TreeNode): void {
    console.log('🔄 Toggling node:', node.name, 'current expanded:', node.expanded);

    if (!node) {
      console.error('❌ Node is null or undefined');
      return;
    }

    node.expanded = !node.expanded;

    console.log('✅ Node toggled:', node.name, 'new expanded state:', node.expanded);
    console.log('   - Has children:', !!(node.children && node.children.length > 0));
    console.log('   - Children count:', node.children?.length || 0);

    // CRÍTICO: Forzar detección de cambios
    this.cdr.markForCheck();
    this.cdr.detectChanges();

    // Verificación post-toggle
    setTimeout(() => {
      const expandedElements = document.querySelectorAll('.tree-children.expanded');
      const allTreeChildren = document.querySelectorAll('.tree-children');

      console.log('🔍 Post-toggle verification:');
      console.log('- Total .tree-children:', allTreeChildren.length);
      console.log('- Total .tree-children.expanded:', expandedElements.length);

      // Verificar si este nodo específico está en el DOM
      const thisNodeElement = document.querySelector(`[data-node-id="${node.id}"]`);
      if (thisNodeElement) {
        console.log('✅ Node found in DOM');
      } else {
        console.log('⚠️ Node not found in DOM - checking by class');
      }
    }, 100);
  }

  // CORREGIDO: Método editNode
  editNode(node: TreeNode): void {
    console.log('Editando nodo:', node); // DEBUG
    this.openModal(node.type as any, node.data);
  }

  deleteNode(node: TreeNode): void {
    if (confirm(`¿Está seguro que desea eliminar este ${node.type}?`)) {
      this.isLoading = true;

      let deleteObservable;
      switch (node.type) {
        case 'variable':
          deleteObservable = this.indicadoresService.deleteVariable(node.id);
          break;
        case 'dimension':
          deleteObservable = this.indicadoresService.deleteDimension(node.id);
          break;
        case 'indicator':
          deleteObservable = this.indicadoresService.deleteIndicator(node.id);
          break;
      }

      deleteObservable.pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.showNotification(`${node.type} eliminado exitosamente`, 'success');
              this.refreshData();
            }
          },
          error: (error) => {
            console.error(`Error eliminando ${node.type}:`, error);
            this.showNotification(`Error al eliminar ${node.type}`, 'error');
          },
          complete: () => {
            this.isLoading = false;
          }
        });
    }
  }

  // ==================
  // EXPORTACIÓN
  // ==================

  exportData(type: 'indicators' | 'dimensions' | 'variables' = 'indicators'): void {
    this.indicadoresService.exportData(type)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);

          this.showNotification('Exportación completada', 'success');
        },
        error: (error) => {
          console.error('Error exportando:', error);
          this.showNotification('Error al exportar datos', 'error');
        }
      });
  }

  // ==================
  // UTILIDADES
  // ==================

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  refreshData(): void {
    this.loadInitialData();
  }

  getStatusClass(status: string): string {
    return status === 'active' ? 'status-active' : 'status-inactive';
  }

  getPerformanceClass(percentage: number): string {
    if (percentage >= 100) return 'excellent';
    if (percentage >= 90) return 'good';
    if (percentage >= 80) return 'warning';
    return 'poor';
  }

  // CORREGIDO: Método para obtener el tipo de modal
  getSelectedNodeType(): string {
    return this.modalType || 'item';
  }

  // Método para verificar si es nuevo o edición
  isNewMode(): boolean {
    return this.currentMode === 'new';
  }

  // Método para obtener el texto del botón
  getSubmitButtonText(): string {
    return this.currentMode === 'new' ? 'Crear' : 'Actualizar';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      formGroup.get(key)?.markAsTouched();
    });
  }

  private showNotification(message: string, type: 'success' | 'warning' | 'info' | 'error'): void {
    // En una aplicación real, esto sería un toast o snackbar
    console.log(`${type.toUpperCase()}: ${message}`);
    alert(message); // Temporal, reemplazar con sistema de notificaciones
  }

  getSelectedNodeDescription(): string {
    if (!this.selectedNode) {
      return 'Vista general del rendimiento de indicadores de RRHH';
    }

    const data = this.selectedNode.data as any;
    return data?.description || 'Sin descripción';
  }


  // 2. AGREGAR ESTOS MÉTODOS AL COMPONENTE

  // Método de debug principal
  debugTree(): void {
    console.clear();
    console.log('🔍 ===== DEBUG COMPLETO =====');

    // 1. Verificar estado actual
    console.log('📊 Estado actual del componente:');
    console.log('- variables:', this.variables?.length || 0);
    console.log('- treeNodes:', this.treeNodes?.length || 0);
    console.log('- isLoading:', this.isLoading);

    // 2. Hacer llamada fresca al servidor
    console.log('\n📡 Haciendo llamada al servidor...');
    this.indicadoresService.getTreeStructure().subscribe({
      next: (response) => {
        console.log('📨 Respuesta recibida:', response);

        if (response.success && response.data) {
          console.log('✅ Datos válidos recibidos');

          // 3. Asignar datos y reconstruir
          this.variables = response.data;
          console.log('💾 Variables asignadas:', this.variables.length);

          // 4. Forzar reconstrucción
          this.buildTreeNodes();

          // 5. Verificación final
          setTimeout(() => {
            console.log('\n🔍 VERIFICACIÓN FINAL:');
            console.log('- DOM treeNodes:', document.querySelectorAll('.tree-node').length);
            console.log('- Component treeNodes:', this.treeNodes.length);
            console.log('- Diferencia detectada:', document.querySelectorAll('.tree-node').length !== this.getTotalNodeCount());

            if (document.querySelectorAll('.tree-node').length === 0) {
              console.error('❌ EL DOM NO SE ESTÁ ACTUALIZANDO - Problema de detección de cambios');
              this.forceCompleteRefresh();
            }
          }, 500);
        }
      },
      error: (error) => {
        console.error('💥 Error:', error);
      }
    });
  }

  // 3. MÉTODO buildTreeNodes MEJORADO Y SIMPLIFICADO
  private buildTreeNodes(): void {
    console.log('🏗️ Iniciando construcción del árbol...');
    console.log('📊 Variables recibidas:', this.variables);

    if (!this.variables || !Array.isArray(this.variables) || this.variables.length === 0) {
      console.warn('⚠️ No hay variables para procesar');
      this.treeNodes = [];
      this.cdr.detectChanges();
      return;
    }

    // Limpiar el árbol anterior
    this.treeNodes = [];

    // Procesar cada variable
    this.variables.forEach((variable, varIndex) => {
      console.log(`\n🔸 Procesando variable ${varIndex + 1}: ${variable.name}`);
      console.log(`   - ID: ${variable.id}`);
      console.log(`   - Dimensiones:`, variable.dimensions?.length || 0);

      const variableNode: TreeNode = {
        id: variable.id,
        name: variable.name,
        type: 'variable',
        expanded: false, // CAMBIO: Empezar colapsado para debugging
        data: variable,
        children: []
      };

      // Procesar dimensiones
      if (variable.dimensions && Array.isArray(variable.dimensions) && variable.dimensions.length > 0) {
        console.log(`   📁 Procesando ${variable.dimensions.length} dimensiones`);

        variable.dimensions.forEach((dimension, dimIndex) => {
          console.log(`   📁 Dimensión ${dimIndex + 1}: ${dimension.name}`);
          console.log(`       - ID: ${dimension.id}`);
          console.log(`       - Indicadores:`, dimension.indicators?.length || 0);

          const dimensionNode: TreeNode = {
            id: dimension.id,
            name: dimension.name,
            type: 'dimension',
            expanded: false, // CAMBIO: Empezar colapsado
            data: dimension,
            children: []
          };

          // Procesar indicadores
          if (dimension.indicators && Array.isArray(dimension.indicators) && dimension.indicators.length > 0) {
            console.log(`       📈 Procesando ${dimension.indicators.length} indicadores`);

            dimension.indicators.forEach((indicator, indIndex) => {
              console.log(`       📈 Indicador ${indIndex + 1}: ${indicator.name}`);

              const indicatorNode: TreeNode = {
                id: indicator.id,
                name: indicator.name,
                type: 'indicator',
                expanded: false,
                data: indicator
              };

              dimensionNode.children!.push(indicatorNode);
            });
          }

          variableNode.children!.push(dimensionNode);
        });
      }

      this.treeNodes.push(variableNode);
    });

    console.log('✅ Árbol construido. Total nodos:', this.treeNodes.length);
    console.log('🌳 Estructura final:', this.treeNodes);

    // CRÍTICO: Forzar detección de cambios
    this.cdr.markForCheck();
    this.cdr.detectChanges();

    // Verificación del DOM
    setTimeout(() => {
      const treeNodeElements = document.querySelectorAll('.tree-node');
      const treeChildrenElements = document.querySelectorAll('.tree-children');

      console.log('🔍 Verificación DOM:');
      console.log('- Nodos en treeNodes:', this.getTotalNodeCount());
      console.log('- Elementos .tree-node en DOM:', treeNodeElements.length);
      console.log('- Elementos .tree-children en DOM:', treeChildrenElements.length);

      if (treeNodeElements.length === 0) {
        console.error('❌ NO HAY ELEMENTOS EN EL DOM - Problema crítico');
        this.forceCompleteRefresh();
      }
    }, 200);
  }
  // 4. MÉTODO loadTreeStructure MEJORADO
  private loadTreeStructure(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🔄 Cargando estructura del árbol...');

      this.indicadoresService.getTreeStructure()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            console.log('📦 Respuesta del servidor:', response);

            if (response.success && response.data && Array.isArray(response.data)) {
              console.log('✅ Datos válidos recibidos');
              console.log('📊 Número de variables:', response.data.length);

              // Verificar estructura de cada variable
              response.data.forEach((variable, index) => {
                console.log(`Variable ${index + 1}:`, variable.name);
                console.log('- Dimensiones:', variable.dimensions?.length || 0);
                variable.dimensions?.forEach((dim, dimIndex) => {
                  console.log(`  Dimensión ${dimIndex + 1}:`, dim.name);
                  console.log('  - Indicadores:', dim.indicators?.length || 0);
                });
              });

              // Asignar datos
              this.variables = response.data;

              // Construir árbol
              this.buildTreeNodes();

              resolve();
            } else {
              console.error('❌ Datos inválidos o vacíos:', response);
              this.variables = [];
              this.treeNodes = [];
              this.cdr.detectChanges();
              resolve();
            }
          },
          error: (error) => {
            console.error('💥 Error cargando estructura:', error);
            this.showNotification('Error cargando estructura de indicadores', 'error');
            this.variables = [];
            this.treeNodes = [];
            this.cdr.detectChanges();
            reject(error);
          }
        });
    });
  }

  // 5. MÉTODO PARA FORZAR ACTUALIZACIÓN
  forceRefreshTree(): void {
    console.log('🔄 Forzando actualización completa del árbol...');
    this.isLoading = true;

    this.loadTreeStructure()
      .finally(() => {
        this.isLoading = false;
        console.log('✅ Actualización del árbol completada');
      });
  }

  // MÉTODO PARA CONTAR NODOS TOTALES
  private getTotalNodeCount(): number {
    let total = this.treeNodes.length;
    this.treeNodes.forEach(varNode => {
      total += varNode.children?.length || 0;
      varNode.children?.forEach(dimNode => {
        total += dimNode.children?.length || 0;
      });
    });
    return total;
  }

  // MÉTODO PARA FORZAR ACTUALIZACIÓN COMPLETA
  forceCompleteRefresh(): void {
    console.log('🔄 Forzando actualización completa...');

    // Limpiar todo
    this.treeNodes = [];
    this.variables = [];
    this.cdr.detectChanges();

    // Esperar un momento y recargar
    setTimeout(() => {
      this.loadTreeStructure().then(() => {
        console.log('✅ Actualización completa terminada');
      });
    }, 100);
  }

  debugTreeStructure(): void {
    console.clear();
    console.log('🔍 === DEBUG ESTRUCTURA COMPLETA ===');

    // 1. Estado del componente
    console.log('\n📊 Estado del componente:');
    console.log('- isLoading:', this.isLoading);
    console.log('- treeNodes.length:', this.treeNodes?.length || 0);
    console.log('- variables.length:', this.variables?.length || 0);
    console.log('- selectedNode:', this.selectedNode?.name || 'ninguno');

    // 2. Estructura de datos detallada
    console.log('\n🌳 Estructura de treeNodes:');
    this.treeNodes?.forEach((node, index) => {
      console.log(`${index + 1}. Variable: ${node.name}`);
      console.log(`   - ID: ${node.id}`);
      console.log(`   - Expanded: ${node.expanded}`);
      console.log(`   - Children: ${node.children?.length || 0}`);

      node.children?.forEach((childNode, childIndex) => {
        console.log(`     ${childIndex + 1}. Dimensión: ${childNode.name}`);
        console.log(`        - ID: ${childNode.id}`);
        console.log(`        - Expanded: ${childNode.expanded}`);
        console.log(`        - Children: ${childNode.children?.length || 0}`);

        childNode.children?.forEach((grandChildNode, grandChildIndex) => {
          console.log(`           ${grandChildIndex + 1}. Indicador: ${grandChildNode.name}`);
          console.log(`              - ID: ${grandChildNode.id}`);
        });
      });
    });

    // 3. Verificación DOM
    console.log('\n🔍 Verificación DOM:');
    const treeNodes = document.querySelectorAll('.tree-node');
    const treeChildren = document.querySelectorAll('.tree-children');
    const expandedChildren = document.querySelectorAll('.tree-children.expanded');

    console.log('- Total .tree-node:', treeNodes.length);
    console.log('- Total .tree-children:', treeChildren.length);
    console.log('- Total .tree-children.expanded:', expandedChildren.length);

    // 4. Análisis de visibilidad - CORREGIDO: Cast a HTMLElement
    treeNodes.forEach((node, index) => {
      const htmlElement = node as HTMLElement; // CORRECCIÓN: Cast explícito
      const isVisible = htmlElement.offsetParent !== null;
      console.log(`  Nodo ${index + 1}: ${isVisible ? 'VISIBLE' : 'OCULTO'}`);
    });
  }

  // 6. MÉTODO para forzar expansión de primer nivel (debugging)
  expandFirstLevel(): void {
    console.log('🔄 Forzando expansión del primer nivel...');

    this.treeNodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        node.expanded = true;
        console.log(`✅ Expandido: ${node.name}`);
      }
    });

    this.cdr.detectChanges();

    setTimeout(() => {
      const expandedElements = document.querySelectorAll('.tree-children.expanded');
      console.log('🔍 Elementos expandidos en DOM:', expandedElements.length);
    }, 100);
  }

  trackByNodeId(index: number, node: TreeNode): string {
    return node?.id || index.toString(); // Añadir fallback por seguridad
  }

  getTreeNodesInDom(): number {
    if (typeof document !== 'undefined') {
      const elements = document.querySelectorAll('.tree-node');
      return elements ? elements.length : 0;
    }
    return 0;
  }

  debugNodeExpansion(nodeId: string): void {
    console.log(`🔍 Debugging expansion for node: ${nodeId}`);

    // Encontrar el nodo en treeNodes
    const findNode = (nodes: TreeNode[]): TreeNode | null => {
      for (const node of nodes) {
        if (node.id === nodeId) return node;
        if (node.children) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    const targetNode = findNode(this.treeNodes);

    if (targetNode) {
      console.log('✅ Node found in data structure:');
      console.log('- Name:', targetNode.name);
      console.log('- Expanded:', targetNode.expanded);
      console.log('- Has children:', !!(targetNode.children && targetNode.children.length > 0));
      console.log('- Children count:', targetNode.children?.length || 0);

      // Verificar en DOM
      const domElement = document.querySelector(`[data-node-id="${nodeId}"]`);
      console.log('- Found in DOM:', !!domElement);

      if (targetNode.expanded && targetNode.children && targetNode.children.length > 0) {
        const childrenContainer = document.querySelector(`[data-node-id="${nodeId}"] + .tree-children`);
        console.log('- Children container found:', !!childrenContainer);
        console.log('- Children container has expanded class:', childrenContainer?.classList.contains('expanded'));
      }
    } else {
      console.error('❌ Node not found in data structure');
    }
  }

  forceRender(): void {
    console.log('🔄 Forcing complete re-render...');

    // Crear una copia profunda de treeNodes para forzar change detection
    const nodesCopy = JSON.parse(JSON.stringify(this.treeNodes));
    this.treeNodes = [];

    this.cdr.detectChanges();

    setTimeout(() => {
      this.treeNodes = nodesCopy.map((node: any) => ({
        ...node,
        expanded: node.expanded || false,
        children: node.children ? node.children.map((child: any) => ({
          ...child,
          expanded: child.expanded || false,
          children: child.children || []
        })) : []
      }));

      this.cdr.detectChanges();
      console.log('✅ Re-render complete');
    }, 50);
  }

  private showFormErrors(form: FormGroup): void {
    console.log('🔍 Analizando errores del formulario:');

    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      if (control && !control.valid) {
        console.log(`❌ Campo ${key}:`, control.errors);

        let errorMessage = '';
        if (control.errors?.['required']) {
          errorMessage = `${key} es requerido`;
        } else if (control.errors?.['pattern']) {
          errorMessage = `${key} tiene un formato inválido`;
        } else if (control.errors?.['min']) {
          errorMessage = `${key} debe ser mayor que ${control.errors['min'].min}`;
        } else if (control.errors?.['maxlength']) {
          errorMessage = `${key} es demasiado largo`;
        }

        if (errorMessage) {
          this.showNotification(errorMessage, 'warning');
        }
      }
    });
  }


}
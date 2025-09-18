// src/app/app-routing.module.ts - ACTUALIZACIÓN CON RUTA INDICADORES
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { TrabajadoresComponent } from './components/trabajadores/trabajadores.component';
import { ConceptosComponent } from './components/conceptos/conceptos.component';
import { PlanillasComponent } from './components/planillas/planillas.component';
import { SolicitudesComponent } from './components/solicitudes/solicitudes.component';
import { UsuariosComponent } from './components/usuarios/usuarios.component';
import { ConfiguracionComponent } from './components/configuracion/configuracion.component';
import { IndicadoresComponent } from './components/indicadores/indicadores.component'; // ← NUEVA IMPORTACIÓN

// Guards
import { AuthGuard, NoAuthGuard } from './guards/auth.guards';
import { ReportsComponent } from './components/reports/reports.component';

const routes: Routes = [
  // Redirect root to dashboard
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  
  // Login route (solo accesible si NO está autenticado)
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [NoAuthGuard]
  },
  
  // Dashboard route (requiere autenticación)
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard]
  },

  // Usuarios route (requiere autenticación)
  {
    path: 'usuarios',
    component: UsuariosComponent,
    canActivate: [AuthGuard],
    data: { title: 'Gestión de Usuarios y Roles' }
  },

  // Configuración route (requiere autenticación)
  {
    path: 'configuracion',
    component: ConfiguracionComponent,
    canActivate: [AuthGuard],
    data: { title: 'Configuración del Sistema' }
  },

  // Indicadores route (requiere autenticación) ← NUEVA RUTA
  {
    path: 'indicadores',
    component: IndicadoresComponent,
    canActivate: [AuthGuard],
    data: { title: 'Gestión de Indicadores de RRHH' }
  },
   
  // Trabajadores route (requiere autenticación)
  {
    path: 'trabajadores',
    component: TrabajadoresComponent,
    canActivate: [AuthGuard],
    data: { title: 'Gestión de Trabajadores' }
  },

  // Conceptos route (requiere autenticación)
  {
    path: 'conceptos',
    component: ConceptosComponent,
    canActivate: [AuthGuard],
    data: { title: 'Gestión de Conceptos' }
  },

  // Planillas route (requiere autenticación)
  {
    path: 'planillas',
    component: PlanillasComponent,
    canActivate: [AuthGuard],
    data: { title: 'Procesamiento de Planillas' }
  },

  // Solicitudes route (requiere autenticación)
  {
    path: 'solicitudes',
    component: SolicitudesComponent,
    canActivate: [AuthGuard],
    data: { title: 'Gestión de Solicitudes' }
  },
  
  // NUEVA RUTA AGREGADA - Reports Component
  { 
    path: 'reports', 
    component: ReportsComponent, 
    canActivate: [AuthGuard],
    data: { 
      title: 'Reportes y Estadísticas',
      breadcrumb: 'Reportes'
    }
  },

  // Ruta para usuarios no autorizados
  {
    path: 'unauthorized',
    component: DashboardComponent,
    canActivate: [AuthGuard]
  },
  
  // Ruta para manejar páginas no encontradas
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    enableTracing: false, // Cambiar a true para debug de rutas
    scrollPositionRestoration: 'top'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
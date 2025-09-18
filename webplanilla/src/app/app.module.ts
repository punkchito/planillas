// src/app/app.module.ts - ACTUALIZACIÓN CON COMPONENTE INDICADORES
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule, FormsModule  } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';

// Components
import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { TrabajadoresComponent } from './components/trabajadores/trabajadores.component';
import { ConceptosComponent } from './components/conceptos/conceptos.component';
import { PlanillasComponent } from './components/planillas/planillas.component';
import { SolicitudesComponent } from './components/solicitudes/solicitudes.component';
import { UsuariosComponent } from './components/usuarios/usuarios.component';
import { ConfiguracionComponent } from './components/configuracion/configuracion.component';
import { IndicadoresComponent } from './components/indicadores/indicadores.component'; // ← NUEVO COMPONENTE

// Services
import { AuthService } from './services/auth.service';
import { TrabajadoresService } from './services/trabajadores.service';
import { ConceptosService } from './services/conceptos.service';
import { PlanillasService } from './services/planillas.service';
import { SolicitudesService } from './services/solicitudes.service';
import { UsersService } from './services/users.service';
import { ConfiguracionService } from './services/configuracion.service';
import { IndicadoresService } from './services/indicadores.service'; // ← NUEVO SERVICIO

// Guards
import { AuthGuard, NoAuthGuard } from './guards/auth.guards';

// Interceptors
import { AuthInterceptor } from './interceptors/auth.interceptor';

// Pipes
import { FilterPipe } from './pipes/filter.pipe';
import { ReportsComponent } from './components/reports/reports.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DashboardComponent,
    TrabajadoresComponent,
    ConceptosComponent,
    PlanillasComponent,
    SolicitudesComponent,
    UsuariosComponent,
    ConfiguracionComponent,
    IndicadoresComponent, // ← NUEVO COMPONENTE AGREGADO
    FilterPipe, ReportsComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    HttpClientModule,
    FormsModule,
    AppRoutingModule
  ],
  providers: [
    // Services
    AuthService,
    TrabajadoresService,
    ConceptosService,
    PlanillasService,
    SolicitudesService,
    UsersService,
    ConfiguracionService,
    IndicadoresService, // ← NUEVO SERVICIO AGREGADO
    
    // Guards
    AuthGuard,
    NoAuthGuard,
    
    // HTTP Interceptors
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
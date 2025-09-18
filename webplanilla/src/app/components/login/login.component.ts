import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from '../../services/auth.service';
import { LoginCredentials } from '../../models/user.model';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  returnUrl = '';
  
  private destroy$ = new Subject<void>();

  // Usuarios de demostración
  demoUsers = [
    { email: 'admin@instituto.edu.pe', password: 'admin123', role: 'Administrador' },
    { email: 'usuario@instituto.edu.pe', password: 'user123', role: 'Usuario' }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.createLoginForm();
  }

  ngOnInit(): void {
    // Obtener la URL de retorno
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    
    // Prellenar formulario con datos de demo (solo en desarrollo)
    this.prefillDemoCredentials();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Crear formulario reactivo
   */
  private createLoginForm(): FormGroup {
    return this.formBuilder.group({
      email: ['', [
        Validators.required,
        Validators.email
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(6)
      ]],
      remember: [false]
    });
  }

  /**
   * Prellenar credenciales de demo
   */
  private prefillDemoCredentials(): void {
    this.loginForm.patchValue({
      email: 'admin@instituto.edu.pe',
      password: 'admin123'
    });
  }

  /**
   * Manejar envío del formulario
   */
  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const credentials: LoginCredentials = this.loginForm.value;

    this.authService.login(credentials)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            console.log('Login exitoso:', response.data?.user);
            this.router.navigate([this.returnUrl]);
          } else {
            this.errorMessage = response.message || 'Error en el login';
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error en login:', error);
          this.errorMessage = error.message || 'Error de conexión';
          this.isLoading = false;
        }
      });
  }

  /**
   * Usar credenciales de demo
   */
  useDemoCredentials(userType: 'admin' | 'user'): void {
    const credentials = userType === 'admin' 
      ? this.demoUsers[0] 
      : this.demoUsers[1];

    this.loginForm.patchValue({
      email: credentials.email,
      password: credentials.password
    });
  }

  /**
   * Obtener mensaje de error para un campo
   */
  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} es requerido`;
      }
      if (field.errors['email']) {
        return 'Debe ser un email válido';
      }
      if (field.errors['minlength']) {
        return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      }
    }
    
    return '';
  }

  /**
   * Verificar si un campo tiene error
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field?.errors && field.touched);
  }

  /**
   * Obtener etiqueta del campo
   */
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      email: 'El correo electrónico',
      password: 'La contraseña'
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * Marcar todos los campos como tocados
   */
  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      this.loginForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Manejar "Olvidé mi contraseña"
   */
  onForgotPassword(): void {
    // Por ahora mostrar alerta, implementar funcionalidad después
    alert('Funcionalidad en desarrollo. Contacta al administrador del sistema.');
  }
}
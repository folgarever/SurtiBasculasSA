import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideEye, lucideEyeClosed } from '@ng-icons/lucide';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, NgIcon],
  providers: [provideIcons({ lucideArrowRight, lucideEye, lucideEyeClosed })],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly enviando = signal(false);
  protected readonly error = signal('');
  protected readonly mostrarContrasena = signal(false);
  protected readonly modoCandidato = signal(false);
  protected readonly formulario = this.formBuilder.nonNullable.group({
    codigo_empleado: ['', Validators.required],
    password: ['', Validators.required],
  });

  constructor() {
    if (this.auth.isAuthenticated()) this.irAlPanel();
  }

  protected alternarVisibilidadContrasena(): void {
    this.mostrarContrasena.update((visible) => !visible);
  }

  protected cambiarModoCandidato(modoCandidato: boolean): void {
    this.modoCandidato.set(modoCandidato);
    this.mostrarContrasena.set(false);
    this.error.set('');
    this.formulario.reset({
      codigo_empleado: modoCandidato ? 'CANDITATO-2026' : '',
      password: '',
    });
  }

  protected ingresar(): void {
    this.error.set('');
    if (this.formulario.invalid || this.enviando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    const { codigo_empleado, password } = this.formulario.getRawValue();
    const solicitud = this.modoCandidato()
      ? this.auth.loginCandidato(codigo_empleado.trim(), password)
      : this.auth.login(codigo_empleado.trim(), password);
    solicitud.subscribe({
      next: () => this.irAlPanel(),
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No fue posible iniciar sesión. Verifica tus datos.');
        this.enviando.set(false);
      },
    });
  }

  private irAlPanel(): void {
    const ruta = this.auth.isCandidate()
      ? '/seleccion-candidato'
      : this.auth.hasAdminRole()
      ? '/admin'
      : this.auth.hasRrhhRole()
        ? '/rrhh'
        : '/dashboard';
    void this.router.navigate([ruta]);
  }
}
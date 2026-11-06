import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClipboardCheck, lucideLightbulb, lucideLogOut, lucideSend } from '@ng-icons/lucide';
import { AuthService } from '../../services/auth.service';
import { Sugerencia, SugerenciasService } from '../../services/sugerencias.service';

function longitudRecortada(minimo: number, maximo: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const longitud = typeof control.value === 'string' ? control.value.trim().length : 0;
    return longitud >= minimo && longitud <= maximo
      ? null
      : { longitudRecortada: { minimo, maximo, actual: longitud } };
  };
}

@Component({
  selector: 'app-sugerencias-empleado',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgIcon],
  providers: [provideIcons({ lucideClipboardCheck, lucideLightbulb, lucideLogOut, lucideSend })],
  templateUrl: './sugerencias-empleado.component.html',
})
export class SugerenciasEmpleadoComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly servicio = inject(SugerenciasService);
  private readonly auth = inject(AuthService);

  protected readonly usuario = this.auth.getUsuario();
  protected readonly sugerencias = signal<Sugerencia[]>([]);
  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly error = signal('');
  protected readonly aviso = signal('');
  protected readonly formulario = this.formBuilder.nonNullable.group({
    titulo: ['', [Validators.required, longitudRecortada(3, 150)]],
    descripcion: ['', [Validators.required, longitudRecortada(10, 5000)]],
  });

  ngOnInit(): void {
    this.cargarSugerencias();
  }

  protected enviar(): void {
    this.error.set('');
    this.aviso.set('');
    if (this.formulario.invalid || this.enviando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.servicio.crearSugerencia(this.formulario.getRawValue()).subscribe({
      next: ({ mensaje }) => {
        this.formulario.reset();
        this.aviso.set(mensaje);
        this.enviando.set(false);
        this.cargarSugerencias();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudo enviar la sugerencia.');
        this.enviando.set(false);
      },
    });
  }

  protected salir(): void {
    this.auth.logout();
  }

  protected formatoFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-GT', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Guatemala',
    });
  }

  private cargarSugerencias(): void {
    this.cargando.set(true);
    this.servicio.obtenerMisSugerencias().subscribe({
      next: ({ sugerencias }) => {
        this.sugerencias.set(sugerencias);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudieron cargar tus sugerencias.');
        this.cargando.set(false);
      },
    });
  }
}

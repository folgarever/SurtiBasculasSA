import { AppShellComponent } from '../../components/app-shell/app-shell.component';
import { NAV_ADMIN, NAV_EMPLEADO, SUGERENCIAS_ADMIN, SUGERENCIAS_EMPLEADO } from '../../components/app-shell/nav-items';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCalendarDays, lucideCheck, lucideX } from '@ng-icons/lucide';
import { AuthService } from '../../services/auth.service';
import { SolicitudAusencia, SolicitudesService } from '../../services/solicitudes.service';

function longitudRecortada(minimo: number, maximo: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const longitud = typeof control.value === 'string' ? control.value.trim().length : 0;
    return longitud >= minimo && longitud <= maximo ? null : { longitudRecortada: true };
  };
}

const rangoFechasValido: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const inicio = control.get('fecha_inicio')?.value as string | undefined;
  const fin = control.get('fecha_fin')?.value as string | undefined;
  return inicio && fin && inicio > fin ? { rangoFechas: true } : null;
};

@Component({
  selector: 'app-solicitudes',
  standalone: true,
  imports: [AppShellComponent, ReactiveFormsModule, NgIcon],
  providers: [provideIcons({ lucideCalendarDays, lucideCheck, lucideX })],
  templateUrl: './solicitudes.component.html',
  styleUrl: './solicitudes.component.css',
})
export class SolicitudesComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly servicio = inject(SolicitudesService);
  private readonly auth = inject(AuthService);

  protected readonly usuario = this.auth.getUsuario();
  protected readonly esAdmin = this.auth.hasAdminRole();
  protected readonly navItems = this.esAdmin ? NAV_ADMIN : NAV_EMPLEADO;
  protected readonly bottomItems = this.esAdmin
    ? [SUGERENCIAS_ADMIN]
    : [SUGERENCIAS_ADMIN, SUGERENCIAS_EMPLEADO];
  protected readonly propias = signal<SolicitudAusencia[]>([]);
  protected readonly solicitudesAdmin = signal<SolicitudAusencia[]>([]);
  protected readonly cargando = signal(true);
  protected readonly cargandoAdmin = signal(true);
  protected readonly enviando = signal(false);
  protected readonly resolviendoId = signal<number | null>(null);
  protected readonly solicitudRechazoId = signal<number | null>(null);
  protected readonly error = signal('');
  protected readonly errorAdmin = signal('');
  protected readonly aviso = signal('');

  protected readonly formulario = this.formBuilder.nonNullable.group({
    tipo: ['vacaciones' as 'vacaciones' | 'permiso', Validators.required],
    fecha_inicio: ['', Validators.required],
    fecha_fin: ['', Validators.required],
    motivo: ['', [Validators.required, longitudRecortada(4, 2000)]],
  }, { validators: rangoFechasValido });

  protected readonly rechazoForm = this.formBuilder.nonNullable.group({
    motivo: ['', [Validators.required, longitudRecortada(4, 500)]],
  });

  ngOnInit(): void {
    this.cargarPropias();
    if (this.esAdmin) this.cargarAdministracion();
  }

  protected enviar(): void {
    this.aviso.set('');
    this.error.set('');
    if (this.formulario.invalid || this.enviando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.servicio.crear(this.formulario.getRawValue()).subscribe({
      next: ({ mensaje }) => {
        this.formulario.reset({
          tipo: 'vacaciones',
          fecha_inicio: '',
          fecha_fin: '',
          motivo: '',
        });
        this.aviso.set(mensaje);
        this.enviando.set(false);
        this.cargarPropias();
        if (this.esAdmin) this.cargarAdministracion();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudo enviar la solicitud.');
        this.enviando.set(false);
      },
    });
  }

  protected aprobar(solicitud: SolicitudAusencia): void {
    if (this.resolviendoId() !== null) return;
    this.resolviendoId.set(solicitud.id);
    this.errorAdmin.set('');
    this.servicio.aprobar(solicitud.id).subscribe({
      next: ({ mensaje }) => {
        this.aviso.set(mensaje);
        this.resolviendoId.set(null);
        this.cargarAdministracion();
        this.cargarPropias();
      },
      error: (error: HttpErrorResponse) => {
        this.errorAdmin.set(error.error?.mensaje || 'No se pudo aprobar la solicitud.');
        this.resolviendoId.set(null);
      },
    });
  }

  protected iniciarRechazo(solicitud: SolicitudAusencia): void {
    this.errorAdmin.set('');
    this.rechazoForm.reset({ motivo: '' });
    this.solicitudRechazoId.set(solicitud.id);
  }

  protected cancelarRechazo(): void {
    this.solicitudRechazoId.set(null);
    this.rechazoForm.reset({ motivo: '' });
  }

  protected rechazar(id: number): void {
    this.errorAdmin.set('');
    if (this.rechazoForm.invalid || this.resolviendoId() !== null) {
      this.rechazoForm.markAllAsTouched();
      return;
    }

    this.resolviendoId.set(id);
    this.servicio.rechazar(id, this.rechazoForm.controls.motivo.value.trim()).subscribe({
      next: ({ mensaje }) => {
        this.aviso.set(mensaje);
        this.resolviendoId.set(null);
        this.cancelarRechazo();
        this.cargarAdministracion();
        this.cargarPropias();
      },
      error: (error: HttpErrorResponse) => {
        this.errorAdmin.set(error.error?.mensaje || 'No se pudo rechazar la solicitud.');
        this.resolviendoId.set(null);
      },
    });
  }

  protected tipoSolicitud(tipo: string): string {
    return tipo === 'vacaciones' ? 'Vacaciones' : 'Permiso';
  }

  protected estadoSolicitud(estado: string): string {
    const etiquetas: Record<string, string> = {
      pendiente: 'Pendiente',
      aprobada: 'Aprobada',
      rechazada: 'Rechazada',
    };
    return etiquetas[estado] || estado;
  }

  protected formatoFecha(fecha: string): string {
    return new Date(`${fecha.slice(0, 10)}T12:00:00`).toLocaleDateString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'America/Guatemala',
    });
  }

  private cargarPropias(): void {
    this.cargando.set(true);
    this.servicio.obtenerMias().subscribe({
      next: ({ solicitudes }) => {
        this.propias.set(solicitudes);
        this.error.set('');
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudieron cargar tus solicitudes.');
        this.cargando.set(false);
      },
    });
  }

  private cargarAdministracion(): void {
    this.cargandoAdmin.set(true);
    this.servicio.obtenerAdministracion().subscribe({
      next: ({ solicitudes }) => {
        this.solicitudesAdmin.set(solicitudes);
        this.errorAdmin.set('');
        this.cargandoAdmin.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorAdmin.set(error.error?.mensaje || 'No se pudieron cargar las solicitudes del personal.');
        this.cargandoAdmin.set(false);
      },
    });
  }
}

import { AppShellComponent } from '../../components/app-shell/app-shell.component';
import { ModalFocoDirective } from '../../directives/modal-foco.directive';
import { NAV_ADMIN, SUGERENCIAS_ADMIN, SUGERENCIAS_EMPLEADO } from '../../components/app-shell/nav-items';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowDownToLine,
  lucideArrowRight,
  lucideCheck,
  lucideClipboardCheck,
  lucideLayoutDashboard,
  lucideLogOut,
  lucideMessageSquare,
  lucidePencil,
  lucidePlus,
  lucideUsers,
  lucideUserRoundCog,
  lucideX,
} from '@ng-icons/lucide';
import { Marcacion } from '../../services/asistencia.service';
import { AuthService } from '../../services/auth.service';
import { DatosCorreccion, DatosIncidencia, EmpleadoRrhh, FiltrosAsistencia, RrhhService } from '../../services/rrhh.service';

interface EmpleadoOpcion {
  id: number;
  codigo: string;
  nombre: string;
}

@Component({
  selector: 'app-rrhh-dashboard',
  standalone: true,
  imports: [AppShellComponent, ReactiveFormsModule, NgIcon, ModalFocoDirective],
  providers: [provideIcons({
    lucideArrowDownToLine,
    lucideArrowRight,
    lucideCheck,
    lucideClipboardCheck,
    lucideLayoutDashboard,
    lucideLogOut,
    lucideMessageSquare,
    lucidePencil,
    lucidePlus,
    lucideUsers,
    lucideUserRoundCog,
    lucideX,
  })],
  templateUrl: './rrhh-dashboard.component.html',
})
export class RrhhDashboardComponent implements OnInit {
  protected readonly navItems = NAV_ADMIN;
  protected readonly bottomItems = [SUGERENCIAS_ADMIN, SUGERENCIAS_EMPLEADO];
  private readonly formBuilder = inject(FormBuilder);
  private readonly rrhh = inject(RrhhService);
  private readonly auth = inject(AuthService);

  protected readonly usuario = this.auth.getUsuario();
  protected readonly esAdmin = this.auth.hasAdminRole();
  protected readonly asistencias = signal<Marcacion[]>([]);
  protected readonly empleados = signal<EmpleadoRrhh[]>([]);
  protected readonly horasExtras = signal<Marcacion[]>([]);
  protected readonly cargando = signal(false);
  protected readonly cargandoExtras = signal(false);
  protected readonly puedeAprobarExtras = this.auth.esGerenteGeneral()
    || this.usuario?.codigo_empleado === 'SUR-AC-002'
    || this.usuario?.rol_id === 2;
  protected readonly modal = signal<'correccion' | 'incidencia' | 'rechazo' | null>(null);
  protected readonly seleccionada = signal<Marcacion | null>(null);
  protected readonly guardando = signal(false);
  protected readonly exportando = signal(false);
  protected readonly aviso = signal<{ tipo: 'success' | 'error'; texto: string } | null>(null);

  protected readonly filtros = this.formBuilder.nonNullable.group({
    busqueda: [''],
    fecha_inicio: [''],
    fecha_fin: [''],
  });
  protected readonly correccionForm = this.formBuilder.nonNullable.group({
    campo: ['hora_entrada' as 'hora_entrada' | 'hora_salida' | 'horas_extras' | 'justificacion_horas_extras', Validators.required],
    hora: [''],
    horas_extras: [0],
    justificacion: [''],
    motivo: ['', [Validators.required, Validators.minLength(4)]],
  });
  protected readonly rechazoForm = this.formBuilder.nonNullable.group({
    motivo: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(500)]],
  });
  protected readonly incidenciaForm = this.formBuilder.nonNullable.group({
    empleado_id: ['', Validators.required],
    fecha_inicio: ['', Validators.required],
    fecha_fin: ['', Validators.required],
    tipo: ['permiso_oficial' as DatosIncidencia['tipo'], Validators.required],
    motivo: ['', [Validators.required, Validators.minLength(4)]],
  });

  ngOnInit(): void {
    this.cargarAsistencias();
    this.cargarHorasExtras();
    this.rrhh.obtenerEmpleados().subscribe({
      next: ({ empleados }) => this.empleados.set(empleados),
      error: () => this.empleados.set([]),
    });
  }

  protected buscar(): void {
    this.cargarAsistencias();
  }

  protected limpiarFiltros(): void {
    this.filtros.reset({ busqueda: '', fecha_inicio: '', fecha_fin: '' });
    this.cargarAsistencias();
  }

  protected abrirCorreccion(item: Marcacion): void {
    this.seleccionada.set(item);
    this.correccionForm.reset({
      campo: 'hora_entrada',
      hora: '',
      horas_extras: item.horas_extras || 0,
      justificacion: item.justificacion_horas_extras || '',
      motivo: '',
    });
    this.modal.set('correccion');
  }

  protected aprobar(item: Marcacion): void {
    if (!this.puedeAprobarExtras || this.guardando()) return;
    this.guardando.set(true);
    this.rrhh.aprobarHorasExtras(item.id).subscribe({
      next: (response) => {
        this.aviso.set({ tipo: 'success', texto: response.mensaje });
        this.guardando.set(false);
        this.cargarHorasExtras();
        this.cargarAsistencias();
      },
      error: (error: HttpErrorResponse) => this.errorOperacion(error),
    });
  }

  protected abrirRechazo(item: Marcacion): void {
    this.seleccionada.set(item);
    this.rechazoForm.reset({ motivo: '' });
    this.modal.set('rechazo');
  }

  protected rechazar(): void {
    this.rechazoForm.markAllAsTouched();
    const item = this.seleccionada();
    if (this.rechazoForm.invalid || !item || !this.puedeAprobarExtras || this.guardando()) return;
    this.guardando.set(true);
    this.rrhh.rechazarHorasExtras(item.id, this.rechazoForm.getRawValue().motivo.trim()).subscribe({
      next: (response) => {
        this.aviso.set({ tipo: 'success', texto: response.mensaje });
        this.modal.set(null);
        this.guardando.set(false);
        this.cargarHorasExtras();
        this.cargarAsistencias();
      },
      error: (error: HttpErrorResponse) => this.errorOperacion(error),
    });
  }

  protected abrirIncidencia(): void {
    this.incidenciaForm.reset({ empleado_id: '', fecha_inicio: '', fecha_fin: '', tipo: 'permiso_oficial', motivo: '' });
    this.modal.set('incidencia');
  }

  protected cerrarModal(): void {
    if (!this.guardando()) this.modal.set(null);
  }

  protected guardarCorreccion(): void {
    this.correccionForm.markAllAsTouched();
    const item = this.seleccionada();
    const value = this.correccionForm.getRawValue();
    if (this.correccionForm.invalid || !item || this.guardando()) return;
    if ((value.campo === 'hora_entrada' || value.campo === 'hora_salida') && !value.hora) return;

    const datos: DatosCorreccion = {
      marcacion_id: item.id,
      motivo: value.motivo.trim(),
    };
    if (value.campo === 'hora_entrada' || value.campo === 'hora_salida') {
      datos[value.campo] = value.hora.replace('T', ' ');
    } else if (value.campo === 'horas_extras') {
      datos.horas_extras = Number(value.horas_extras);
    } else {
      datos.justificacion_horas_extras = value.justificacion.trim() || null;
    }
    this.guardando.set(true);
    this.rrhh.corregirMarcacion(datos).subscribe({
      next: (response) => {
        this.aviso.set({ tipo: 'success', texto: response.mensaje });
        this.modal.set(null);
        this.guardando.set(false);
        this.cargarAsistencias();
      },
      error: (error: HttpErrorResponse) => this.errorOperacion(error),
    });
  }

  protected guardarIncidencia(): void {
    this.incidenciaForm.markAllAsTouched();
    if (this.incidenciaForm.invalid || this.guardando()) return;

    const value = this.incidenciaForm.getRawValue();
    if (value.fecha_inicio > value.fecha_fin) {
      this.aviso.set({ tipo: 'error', texto: 'La fecha inicial debe ser anterior a la fecha final.' });
      return;
    }
    const datos: DatosIncidencia = {
      ...value,
      empleado_id: Number(value.empleado_id),
      motivo: value.motivo.trim(),
    };
    this.guardando.set(true);
    this.rrhh.registrarIncidencia(datos).subscribe({
      next: (response) => {
        this.aviso.set({ tipo: 'success', texto: response.mensaje });
        this.modal.set(null);
        this.guardando.set(false);
      },
      error: (error: HttpErrorResponse) => this.errorOperacion(error),
    });
  }

  protected exportar(): void {
    if (this.exportando()) return;
    this.exportando.set(true);
    this.rrhh.descargarExcel(this.obtenerFiltros()).subscribe({
      next: (archivo) => {
        const url = URL.createObjectURL(archivo);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = 'reporte-surtibasculas.xlsx';
        enlace.click();
        URL.revokeObjectURL(url);
        this.exportando.set(false);
      },
      error: (error: HttpErrorResponse) => this.errorOperacion(error),
    });
  }

  protected formatoFecha(fecha: string): string {
    return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-GT', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Guatemala',
    });
  }

  protected hora(value: string | null): string {
    return value ? value.slice(11, 16) : '—';
  }

  protected etiquetaEstado(estado: string | null, horasExtras = 0): string {
    if (horasExtras > 0) return 'Horas extra';
    const etiquetas: Record<string, string> = {
      puntual: 'Puntual',
      tolerancia: 'Tolerancia',
      atraso: 'Atraso',
      normal: 'Normal',
      anticipada: 'Anticipada',
    };
    return estado ? etiquetas[estado] || estado : 'Pendiente';
  }

  protected etiquetaExtras(estado: string | undefined): string {
    const etiquetas: Record<string, string> = {
      sin_extras: 'Sin extras',
      pendiente: 'Pendiente',
      aprobada: 'Aprobada',
      rechazada: 'Rechazada',
    };
    return estado ? etiquetas[estado] || estado : 'Pendiente';
  }

  protected formatoExtras(horas: number | undefined): string {
    if (!horas) return '—';
    return `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  }

  private obtenerFiltros(): FiltrosAsistencia {
    const value = this.filtros.getRawValue();
    return { busqueda: value.busqueda.trim(), fecha_inicio: value.fecha_inicio, fecha_fin: value.fecha_fin };
  }

  private cargarHorasExtras(): void {
    this.cargandoExtras.set(true);
    this.rrhh.obtenerHorasExtras('pendiente').subscribe({
      next: ({ horas_extras }) => {
        this.horasExtras.set(horas_extras);
        this.cargandoExtras.set(false);
      },
      error: () => {
        this.horasExtras.set([]);
        this.cargandoExtras.set(false);
      },
    });
  }

  private cargarAsistencias(): void {
    this.cargando.set(true);
    this.rrhh.obtenerAsistencias(this.obtenerFiltros()).subscribe({
      next: ({ asistencias }) => {
        this.asistencias.set(asistencias);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.aviso.set({ tipo: 'error', texto: error.error?.mensaje || 'No se pudo cargar el reporte.' });
      },
    });
  }

  private errorOperacion(error: HttpErrorResponse): void {
    this.aviso.set({ tipo: 'error', texto: error.error?.mensaje || 'No fue posible completar la operación.' });
    this.guardando.set(false);
    this.exportando.set(false);
  }
}
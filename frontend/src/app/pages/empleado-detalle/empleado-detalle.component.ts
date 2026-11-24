import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, HostListener, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideClipboardCheck,
  lucideDownload,
  lucideEye,
  lucideFileText,
  lucideLayoutDashboard,
  lucideLogOut,
  lucideMessageSquare,
  lucideSave,
  lucideUpload,
  lucideUserRoundCog,
  lucideUsers,
  lucideX,
} from '@ng-icons/lucide';
import { distinctUntilChanged, map } from 'rxjs';
import { AppShellComponent } from '../../components/app-shell/app-shell.component';
import { NAV_ADMIN, SUGERENCIAS_ADMIN } from '../../components/app-shell/nav-items';
import { AuthService } from '../../services/auth.service';
import {
  DatosFicha,
  DetalleEmpleado,
  FichaEmpleado,
  RegistroAuditoriaFicha,
  RrhhService,
} from '../../services/rrhh.service';

const TAMANO_MAXIMO_CV = 5 * 1024 * 1024;
const ETIQUETAS_CAMPOS: Record<string, string> = {
  nombre_completo: 'nombre completo',
  dpi: 'DPI',
  fecha_nacimiento: 'fecha de nacimiento',
  correo: 'correo',
  telefono: 'teléfono',
  fecha_ingreso: 'fecha de ingreso',
};

@Component({
  selector: 'app-empleado-detalle',
  standalone: true,
  imports: [AppShellComponent, ReactiveFormsModule, RouterLink, NgIcon],
  providers: [provideIcons({
    lucideArrowLeft,
    lucideClipboardCheck,
    lucideDownload,
    lucideEye,
    lucideFileText,
    lucideLayoutDashboard,
    lucideLogOut,
    lucideMessageSquare,
    lucideSave,
    lucideUpload,
    lucideUserRoundCog,
    lucideUsers,
    lucideX,
  })],
  templateUrl: './empleado-detalle.component.html',
})
export class EmpleadoDetalleComponent implements OnInit {
  protected readonly navItems = NAV_ADMIN;
  protected readonly bottomItems = [SUGERENCIAS_ADMIN];
  private readonly route = inject(ActivatedRoute);
  private readonly rrhh = inject(RrhhService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);
  private urlVistaPrevia: string | null = null;

  protected readonly usuario = this.auth.getUsuario();
  protected readonly auditoria = signal<RegistroAuditoriaFicha[]>([]);
  protected readonly vistaPreviaCv = signal<SafeResourceUrl | null>(null);
  protected readonly cargandoVistaPrevia = signal(false);
  protected readonly detalle = signal<DetalleEmpleado | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly guardandoFicha = signal(false);
  protected readonly subiendoCv = signal(false);
  protected readonly avisoFicha = signal<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  protected readonly hoy = new Date().toLocaleDateString('en-CA');
  protected readonly formularioFicha = this.formBuilder.nonNullable.group({
    nombre_completo: ['', [Validators.minLength(2), Validators.maxLength(150)]],
    dpi: ['', Validators.pattern(/^(?:\d[\s-]*){13}$/)],
    fecha_nacimiento: [''],
    correo: ['', [Validators.email, Validators.maxLength(120)]],
    telefono: ['', Validators.pattern(/^\+?(?:[\s-]*\d){8,15}[\s-]*$/)],
    fecha_ingreso: [''],
  });
  protected readonly progresoFicha = computed(() => {
    const ficha = this.detalle()?.ficha;
    const campos = [
      ficha?.nombre_completo, ficha?.dpi, ficha?.fecha_nacimiento, ficha?.correo,
      ficha?.telefono, ficha?.fecha_ingreso, ficha?.cv_nombre,
    ];
    return { completos: campos.filter(Boolean).length, total: campos.length };
  });

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.cerrarVistaPrevia());
    this.route.paramMap.pipe(
      map((params) => Number(params.get('id'))),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((id) => this.cargar(id));
  }

  tieneCambiosSinGuardar(): boolean {
    return this.formularioFicha.dirty;
  }

  @HostListener('window:beforeunload', ['$event'])
  protected avisarAntesDeCerrar(event: BeforeUnloadEvent): void {
    if (this.tieneCambiosSinGuardar()) event.preventDefault();
  }

  protected edad(): number | null {
    const nacimiento = this.formularioFicha.controls.fecha_nacimiento.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nacimiento)) return null;
    const [anio, mes, dia] = nacimiento.split('-').map(Number);
    const hoy = new Date();
    let edad = hoy.getFullYear() - anio;
    if (hoy.getMonth() + 1 < mes || (hoy.getMonth() + 1 === mes && hoy.getDate() < dia)) edad -= 1;
    return edad >= 0 && edad <= 120 ? edad : null;
  }

  protected guardarFicha(): void {
    const detalle = this.detalle();
    this.formularioFicha.markAllAsTouched();
    if (!detalle || this.formularioFicha.invalid || this.guardandoFicha()) return;

    const valores = this.formularioFicha.getRawValue();
    const datos: DatosFicha = {
      nombre_completo: valores.nombre_completo.trim() || null,
      dpi: valores.dpi.replace(/[\s-]/g, '') || null,
      fecha_nacimiento: valores.fecha_nacimiento || null,
      correo: valores.correo.trim() || null,
      telefono: valores.telefono.replace(/[\s-]/g, '') || null,
      fecha_ingreso: valores.fecha_ingreso || null,
    };

    this.avisoFicha.set(null);
    this.guardandoFicha.set(true);
    this.rrhh.guardarFichaEmpleado(detalle.empleado.id, datos).subscribe({
      next: ({ mensaje, ficha }) => {
        this.actualizarFicha(ficha);
        this.formularioFicha.markAsPristine();
        this.avisoFicha.set({ tipo: 'success', texto: mensaje });
        this.guardandoFicha.set(false);
        this.cargarAuditoria(detalle.empleado.id);
      },
      error: (error: HttpErrorResponse) => {
        this.avisoFicha.set({ tipo: 'error', texto: error.error?.mensaje || 'No fue posible guardar la ficha.' });
        this.guardandoFicha.set(false);
      },
    });
  }

  protected seleccionarCurriculum(event: Event): void {
    const entrada = event.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    entrada.value = '';
    const detalle = this.detalle();
    if (!archivo || !detalle || this.subiendoCv()) return;

    if (archivo.type !== 'application/pdf' && !archivo.name.toLowerCase().endsWith('.pdf')) {
      this.avisoFicha.set({ tipo: 'error', texto: 'El currículum debe estar en formato PDF.' });
      return;
    }
    if (archivo.size > TAMANO_MAXIMO_CV) {
      this.avisoFicha.set({ tipo: 'error', texto: 'El currículum no puede superar 5 MB.' });
      return;
    }

    this.avisoFicha.set(null);
    this.subiendoCv.set(true);
    this.rrhh.subirCurriculumEmpleado(detalle.empleado.id, archivo).subscribe({
      next: ({ mensaje, cv_nombre }) => {
        this.actualizarFicha({ cv_nombre, cv_actualizado_en: new Date().toISOString() });
        this.avisoFicha.set({ tipo: 'success', texto: mensaje });
        this.subiendoCv.set(false);
        this.cerrarVistaPrevia();
        this.cargarAuditoria(detalle.empleado.id);
      },
      error: (error: HttpErrorResponse) => {
        this.avisoFicha.set({ tipo: 'error', texto: error.error?.mensaje || 'No fue posible subir el currículum.' });
        this.subiendoCv.set(false);
      },
    });
  }

  protected verCurriculum(): void {
    const detalle = this.detalle();
    if (!detalle || this.cargandoVistaPrevia()) return;
    this.cargandoVistaPrevia.set(true);
    this.rrhh.descargarCurriculumEmpleado(detalle.empleado.id).subscribe({
      next: (archivo) => {
        this.cerrarVistaPrevia();
        this.urlVistaPrevia = URL.createObjectURL(archivo);
        this.vistaPreviaCv.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.urlVistaPrevia));
        this.cargandoVistaPrevia.set(false);
        this.cargarAuditoria(detalle.empleado.id);
      },
      error: () => {
        this.cargandoVistaPrevia.set(false);
        this.avisoFicha.set({ tipo: 'error', texto: 'No se pudo abrir el currículum.' });
      },
    });
  }

  protected cerrarVistaPrevia(): void {
    if (this.urlVistaPrevia) URL.revokeObjectURL(this.urlVistaPrevia);
    this.urlVistaPrevia = null;
    this.vistaPreviaCv.set(null);
  }

  protected descripcionAuditoria(registro: RegistroAuditoriaFicha): string {
    if (registro.accion === 'cv_subida') return 'Cargó el currículum';
    if (registro.accion === 'cv_descarga') return 'Consultó o descargó el currículum';
    if (registro.accion === 'ficha_exportada') return 'Exportó la ficha a Excel';
    const campos = (registro.campos || '').split(',')
      .map((campo) => ETIQUETAS_CAMPOS[campo] || campo).filter(Boolean);
    return campos.length ? `Modificó: ${campos.join(', ')}` : 'Modificó la ficha';
  }

  protected fechaHora(valor: string): string {
    const fecha = new Date(valor.includes('T') ? valor : valor.replace(' ', 'T') + 'Z');
    return Number.isNaN(fecha.getTime()) ? valor : fecha.toLocaleString('es-GT', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Guatemala',
    });
  }

  private cargarAuditoria(id: number): void {
    this.rrhh.obtenerAuditoriaFicha(id).subscribe({
      next: ({ registros }) => this.auditoria.set(registros),
      error: () => this.auditoria.set([]),
    });
  }

  protected descargarCurriculum(): void {
    const detalle = this.detalle();
    if (!detalle) return;
    this.rrhh.descargarCurriculumEmpleado(detalle.empleado.id).subscribe({
      next: (archivo) => {
        this.guardarArchivo(archivo, detalle.ficha.cv_nombre || `curriculum-${detalle.empleado.codigo_empleado}.pdf`);
        this.cargarAuditoria(detalle.empleado.id);
      },
      error: () => this.avisoFicha.set({ tipo: 'error', texto: 'No se pudo descargar el currículum.' }),
    });
  }

  protected exportarFicha(): void {
    const detalle = this.detalle();
    if (!detalle) return;
    this.rrhh.exportarFichaEmpleado(detalle.empleado.id).subscribe({
      next: (archivo) => {
        this.guardarArchivo(archivo, `ficha-${detalle.empleado.codigo_empleado}.xlsx`);
        this.cargarAuditoria(detalle.empleado.id);
      },
      error: () => this.avisoFicha.set({ tipo: 'error', texto: 'No se pudo exportar la ficha.' }),
    });
  }

  private guardarArchivo(archivo: Blob, nombre: string): void {
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private actualizarFicha(cambios: Partial<FichaEmpleado>): void {
    this.detalle.update((actual) => actual ? { ...actual, ficha: { ...actual.ficha, ...cambios } } : actual);
  }

  private rellenarFormulario(ficha: FichaEmpleado | undefined): void {
    this.formularioFicha.reset({
      nombre_completo: ficha?.nombre_completo ?? '',
      dpi: ficha?.dpi ?? '',
      fecha_nacimiento: ficha?.fecha_nacimiento?.slice(0, 10) ?? '',
      correo: ficha?.correo ?? '',
      telefono: ficha?.telefono ?? '',
      fecha_ingreso: ficha?.fecha_ingreso?.slice(0, 10) ?? '',
    });
  }

  protected formatoFecha(fecha: string | null | undefined): string {
    if (!fecha) return '—';
    return new Date(`${fecha.slice(0, 10)}T12:00:00`).toLocaleDateString('es-GT', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Guatemala',
    });
  }

  protected hora(valor: string | null | undefined): string {
    return valor ? valor.slice(11, 16) : '—';
  }

  protected formatoExtras(horas: number | undefined): string {
    if (!horas) return '—';
    return `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  }

  protected etiquetaEntrada(estado: string | null): string {
    if (estado === 'tolerancia') return 'Tolerancia de entrada';
    if (estado === 'atraso') return 'Atraso';
    return estado === 'puntual' ? 'Puntual' : 'Pendiente';
  }

  protected etiquetaSalida(estado: string | null, horasExtras?: number): string {
    if (horasExtras) return 'Horas extra';
    if (estado === 'anticipada') return 'Anticipada';
    return estado === 'normal' ? 'Normal' : 'Pendiente';
  }

  private cargar(id: number): void {
    if (!Number.isInteger(id) || id <= 0) {
      this.error.set('El identificador del empleado no es válido.');
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.error.set('');
    this.rrhh.obtenerDetalleEmpleado(id).subscribe({
      next: (detalle) => {
        this.detalle.set(detalle);
        this.rellenarFormulario(detalle.ficha);
        this.avisoFicha.set(null);
        this.cerrarVistaPrevia();
        this.cargarAuditoria(id);
        this.cargando.set(false);
      },
      error: (error: { error?: { mensaje?: string } }) => {
        this.error.set(error.error?.mensaje || 'No se pudo cargar el detalle del empleado.');
        this.detalle.set(null);
        this.cargando.set(false);
      },
    });
  }
}

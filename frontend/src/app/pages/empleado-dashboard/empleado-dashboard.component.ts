import { AppShellComponent } from '../../components/app-shell/app-shell.component';
import { obtenerNavegacion } from '../../components/app-shell/nav-items';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight,
  lucideClipboardCheck,
  lucideLayoutDashboard,
  lucideLightbulb,
  lucideLogOut,
  lucideTrendingUp,
  lucideUsers,
  lucideUserRoundCog,
} from '@ng-icons/lucide';
import { interval } from 'rxjs';
import { AsistenciaService, Marcacion, ResultadoMarcacion } from '../../services/asistencia.service';
import { AuthService } from '../../services/auth.service';
import {
  EvaluacionConocimiento,
  EvaluacionesConocimientoService,
  formatoPeriodoEvaluacion,
} from '../../services/evaluaciones-conocimiento.service';
import { contarRespuestasNuevas, leerRespuestasVistas, SugerenciasService } from '../../services/sugerencias.service';

@Component({
  selector: 'app-empleado-dashboard',
  standalone: true,
  imports: [AppShellComponent, NgIcon, RouterLink],
  providers: [provideIcons({
    lucideArrowRight,
    lucideClipboardCheck,
    lucideLayoutDashboard,
    lucideLightbulb,
    lucideLogOut,
    lucideTrendingUp,
    lucideUsers,
    lucideUserRoundCog,
  })],
  templateUrl: './empleado-dashboard.component.html',
})
export class EmpleadoDashboardComponent implements OnInit {
  private readonly asistencia = inject(AsistenciaService);
  private readonly sugerencias = inject(SugerenciasService);
  private readonly evaluaciones = inject(EvaluacionesConocimientoService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly usuario = this.auth.getUsuario();
  protected readonly esAdmin = this.auth.hasAdminRole();
  protected readonly navegacion = obtenerNavegacion(this.esAdmin);
  protected readonly navItems = this.navegacion.items;
  protected readonly bottomItems = this.navegacion.bottomItems;
  protected readonly esGerenteGeneral = this.auth.esGerenteGeneral();
  protected readonly horaActual = signal('');
  protected readonly fechaActual = signal('');
  protected readonly historial = signal<Marcacion[]>([]);
  protected readonly miEvaluacion = signal<EvaluacionConocimiento | null>(null);
  protected readonly periodoEvaluacion = signal('');
  protected readonly cargando = signal(true);
  protected readonly respuestasNuevas = signal(0);
  protected readonly marcando = signal(false);
  protected readonly justificacion = signal('');
  protected readonly aviso = signal<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  protected readonly requiereJustificacion = computed(() => this.horaActual().slice(0, 5) >= '18:00');
  protected readonly justificacionValida = computed(() => this.justificacion().trim().length >= 4);
  protected readonly extrasPendientes = computed(() => this.historial().filter((item) => item.extras_estado === 'pendiente').length);
  protected readonly extrasResueltas = computed(() => this.historial().filter((item) => (
    item.extras_estado === 'aprobada' || item.extras_estado === 'rechazada'
  )).length);

  ngOnInit(): void {
    this.actualizarReloj();
    interval(1000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.actualizarReloj());
    this.cargarHistorial();
    this.cargarRespuestasNuevas();
    this.cargarMiEvaluacion();
  }

  protected registrar(): void {
    if (this.marcando()) return;
    if (this.requiereJustificacion() && !this.justificacionValida()) {
      this.aviso.set({
        tipo: 'error',
        texto: 'Para salir después de las 18:00 escribe el motivo de tu salida (mínimo 4 caracteres).',
      });
      return;
    }

    this.marcando.set(true);
    this.aviso.set(null);
    this.asistencia.registrarMarcacion(this.justificacion().trim() || undefined).subscribe({
      next: (resultado: ResultadoMarcacion) => {
        const accion = resultado.tipo === 'entrada' ? 'Entrada' : 'Salida';
        const estado = this.etiquetaEstado(resultado.estado, resultado.horas_extras);
        const extras = resultado.horas_extras
          ? ` · ${resultado.horas_extras} ${resultado.horas_extras === 1 ? 'hora extra' : 'horas extras'}`
          : '';
        this.aviso.set({
          tipo: 'success',
          texto: `${accion} registrada: ${estado} · ${resultado.hora.slice(11, 16)}${extras}`,
        });
        if (resultado.tipo === 'salida') this.justificacion.set('');
        this.marcando.set(false);
        this.cargarHistorial();
      },
      error: (error: HttpErrorResponse) => {
        this.aviso.set({ tipo: 'error', texto: error.error?.mensaje || 'No se pudo registrar la marcación.' });
        this.marcando.set(false);
      },
    });
  }

  protected actualizarJustificacion(event: Event): void {
    this.justificacion.set((event.target as HTMLTextAreaElement).value);
  }

  protected etiquetaEstado(estado: string | null, horasExtras = 0): string {
    if (horasExtras > 0) return 'Salida con horas extra';
    const etiquetas: Record<string, string> = {
      puntual: 'Puntual',
      tolerancia: 'Tolerancia de entrada',
      atraso: 'Atraso',
      normal: 'Salida normal',
      anticipada: 'Salida anticipada',
    };
    return estado ? etiquetas[estado] || estado : 'Pendiente';
  }

  protected etiquetaSalida(item: Marcacion): string {
    return this.etiquetaEstado(item.estado_salida, item.horas_extras);
  }

  protected formatoExtras(horas: number | undefined): string {
    if (!horas) return '—';
    return `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  }

  protected formatoPeriodo(periodo: string): string {
    return formatoPeriodoEvaluacion(periodo);
  }

  protected etiquetaExtras(estado: string | undefined): string {
    const etiquetas: Record<string, string> = {
      sin_extras: 'Sin extras',
      pendiente: 'Pendiente de aprobación',
      aprobada: 'Aprobada',
      rechazada: 'Rechazada',
    };
    return estado ? etiquetas[estado] || estado : 'Pendiente de aprobación';
  }

  protected formatoFecha(fecha: string): string {
    return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-GT', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Guatemala',
    });
  }

  private cargarHistorial(): void {
    this.cargando.set(true);
    this.asistencia.obtenerHistorial().subscribe({
      next: ({ marcaciones }) => {
        this.historial.set(marcaciones);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  private cargarMiEvaluacion(): void {
    this.evaluaciones.obtenerMiEvaluacion().subscribe({
      next: ({ evaluacion_actual, periodo_actual }) => {
        this.miEvaluacion.set(evaluacion_actual || null);
        this.periodoEvaluacion.set(periodo_actual || '');
      },
      error: () => this.miEvaluacion.set(null),
    });
  }

  private cargarRespuestasNuevas(): void {
    this.sugerencias.obtenerMisSugerencias().subscribe({
      next: ({ sugerencias }) => {
        this.respuestasNuevas.set(contarRespuestasNuevas(sugerencias, leerRespuestasVistas()));
      },
      error: () => this.respuestasNuevas.set(0),
    });
  }

  private actualizarReloj(): void {
    const ahora = new Date();
    this.horaActual.set(new Intl.DateTimeFormat('es-GT', {
      timeZone: 'America/Guatemala', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).format(ahora));
    this.fechaActual.set(new Intl.DateTimeFormat('es-GT', {
      timeZone: 'America/Guatemala', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).format(ahora));
  }
}
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClipboardCheck, lucideLayoutDashboard, lucideLightbulb, lucideLogOut, lucideUsers, lucideUserRoundCog } from '@ng-icons/lucide';
import { AuthService } from '../../services/auth.service';
import { SelectorTemaComponent } from '../../components/selector-tema/selector-tema.component';
import {
  EvaluacionConocimiento,
  EvaluacionesConocimientoService,
} from '../../services/evaluaciones-conocimiento.service';

@Component({
  selector: 'app-evaluacion-conocimiento-empleado',
  standalone: true,
  imports: [RouterLink, NgIcon, SelectorTemaComponent],
  providers: [provideIcons({ lucideClipboardCheck, lucideLayoutDashboard, lucideLightbulb, lucideLogOut, lucideUsers, lucideUserRoundCog })],
  templateUrl: './evaluacion-conocimiento-empleado.component.html',
})
export class EvaluacionConocimientoEmpleadoComponent implements OnInit {
  private readonly servicio = inject(EvaluacionesConocimientoService);
  private readonly auth = inject(AuthService);

  protected readonly usuario = this.auth.getUsuario();
  protected readonly puedeAdministrar = this.auth.hasEvaluationRole();
  protected readonly esAdmin = this.auth.hasAdminRole();
  protected readonly puedeAccederRrhh = this.auth.hasRrhhRole();
  protected readonly evaluacion = signal<EvaluacionConocimiento | null>(null);
  protected readonly historial = signal<EvaluacionConocimiento[]>([]);
  protected readonly puesto = signal('');
  protected readonly respuestas = signal<Record<string, number>>({});
  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly error = signal('');
  protected readonly aviso = signal('');
  protected readonly evaluacionesCompletadas = computed(
    () => this.historial().filter((item) => item.estado === 'completada'),
  );
  protected readonly promedioHistorico = computed(() => {
    const completas = this.evaluacionesCompletadas();
    if (!completas.length) return null;
    return Math.round(completas.reduce((total, item) => total + (item.porcentaje ?? 0), 0) / completas.length);
  });
  protected readonly cumplimiento = computed(() => {
    if (!this.historial().length) return 0;
    return Math.round((this.evaluacionesCompletadas().length / this.historial().length) * 100);
  });

  ngOnInit(): void {
    this.cargarEvaluacion();
  }

  protected seleccionar(preguntaId: string, opcion: number): void {
    this.respuestas.update((actuales) => ({ ...actuales, [preguntaId]: opcion }));
  }

  protected enviar(): void {
    const actual = this.evaluacion();
    if (!actual?.preguntas || actual.estado !== 'pendiente' || this.enviando()) return;
    if (actual.preguntas.some((pregunta) => this.respuestas()[pregunta.id] === undefined)) {
      this.error.set('Responde todas las preguntas antes de enviar la evaluación.');
      return;
    }

    this.error.set('');
    this.aviso.set('');
    this.enviando.set(true);
    this.servicio.responder(this.respuestas()).subscribe({
      next: ({ mensaje }) => {
        this.aviso.set(mensaje);
        this.enviando.set(false);
        this.cargarEvaluacion();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudo enviar la evaluación.');
        this.enviando.set(false);
      },
    });
  }

  protected formatoPeriodo(periodo: string): string {
    const [anio, mes] = periodo.split('-').map(Number);
    return new Date(anio, mes - 1, 1).toLocaleDateString('es-GT', {
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Guatemala',
    });
  }

  protected formatoFecha(fecha: string | null): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'America/Guatemala',
    });
  }

  protected salir(): void {
    this.auth.logout();
  }

  private cargarEvaluacion(): void {
    this.cargando.set(true);
    this.servicio.obtenerMiEvaluacion().subscribe({
      next: ({ evaluacion_actual: actual, historial, puesto }) => {
        this.evaluacion.set(actual);
        this.historial.set(historial);
        this.puesto.set(puesto);
        const respuestasGuardadas = (actual.preguntas ?? []).reduce<Record<string, number>>((acumuladas, pregunta) => {
          if (pregunta.respuesta !== null) acumuladas[pregunta.id] = pregunta.respuesta;
          return acumuladas;
        }, {});
        this.respuestas.set(respuestasGuardadas);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudo cargar tu evaluación.');
        this.cargando.set(false);
      },
    });
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClipboardCheck, lucideLayoutDashboard, lucideLogOut, lucideMessageSquare, lucideUserRoundCog, lucideUsers } from '@ng-icons/lucide';
import { AuthService } from '../../services/auth.service';
import {
  EvaluacionesSeleccionService,
  CuentaCandidato,
  PlantillaEvaluacionSeleccion,
  PuestoPlantillaSeleccion,
  RegistroCandidatoSeleccion,
  ResultadoSeleccion,
  SeccionSeleccion,
} from '../../services/evaluaciones-seleccion.service';

type PuntajesSeleccion = Record<SeccionSeleccion, number>;

@Component({
  selector: 'app-evaluaciones-seleccion',
  standalone: true,
  imports: [RouterLink, NgIcon],
  providers: [provideIcons({ lucideClipboardCheck, lucideLayoutDashboard, lucideLogOut, lucideMessageSquare, lucideUserRoundCog, lucideUsers })],
  templateUrl: './evaluaciones-seleccion.component.html',
  styleUrl: './evaluaciones-seleccion.component.css',
})
export class EvaluacionesSeleccionComponent implements OnInit {
  private readonly servicio = inject(EvaluacionesSeleccionService);
  private readonly auth = inject(AuthService);

  protected readonly usuario = this.auth.getUsuario();
  protected readonly plantillas = signal<PuestoPlantillaSeleccion[]>([]);
  protected readonly puestoSeleccionado = signal('');
  protected readonly resultados = signal<ResultadoSeleccion[]>([]);
  protected readonly candidatosPendientes = signal<RegistroCandidatoSeleccion[]>([]);
  protected readonly cuentaCreada = signal<CuentaCandidato | null>(null);
  protected readonly candidatoSeleccionado = signal<number | null>(null);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly mostrarGuia = signal(false);
  protected readonly error = signal('');
  protected readonly aviso = signal('');
  protected readonly nombreCandidato = signal('');
  protected readonly fechaEvaluacion = signal(this.fechaLocal());
  protected readonly discrepanciaPendiente = signal(false);
  protected readonly riesgoControlPendiente = signal(false);
  protected readonly observaciones = signal('');
  protected readonly puntajes = signal<PuntajesSeleccion>({
    aptitudes: 0,
    conocimientos: 0,
    practica: 0,
    valores: 0,
  });
  protected readonly plantillaActual = computed(
    () => this.plantillas().find((plantilla) => String(plantilla.id) === this.puestoSeleccionado()) ?? null,
  );
  protected readonly evaluacionActual = computed<PlantillaEvaluacionSeleccion | null>(
    () => this.plantillaActual()?.evaluacion ?? null,
  );

  ngOnInit(): void {
    this.cargarPlantillas();
  }

  protected seleccionarPuesto(event: Event): void {
    const puestoId = (event.target as HTMLSelectElement).value;
    this.puestoSeleccionado.set(puestoId);
    this.cargarResultados();
    this.cargarCandidatos();
  }

  protected registrarCandidato(): void {
    this.error.set('');
    this.aviso.set('');
    this.cuentaCreada.set(null);
    this.guardando.set(true);
    this.servicio.registrarCandidatoAdmin().subscribe({
      next: ({ cuenta }) => {
        this.cuentaCreada.set(cuenta);
        this.aviso.set('Cuenta generada. Comparte el usuario y la contraseña con el candidato por un canal privado.');
        this.guardando.set(false);
        this.cargarCandidatos();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudo registrar al candidato.');
        this.guardando.set(false);
      },
    });
  }

  protected copiarCredenciales(): void {
    const cuenta = this.cuentaCreada();
    if (!cuenta) return;
    navigator.clipboard.writeText(`Usuario: ${cuenta.usuario}\nContraseña: ${cuenta.password}`).then(
      () => this.aviso.set('Credenciales copiadas. Entrégalas al candidato por un canal privado.'),
      () => this.error.set('No se pudieron copiar las credenciales. Cópialas manualmente.'),
    );
  }

  protected actualizarCandidato(event: Event): void {
    this.candidatoSeleccionado.set(null);
    this.nombreCandidato.set((event.target as HTMLInputElement).value);
  }

  protected calificarCandidato(candidato: RegistroCandidatoSeleccion): void {
    if (candidato.estado !== 'completada' || candidato.id === null) return;
    this.candidatoSeleccionado.set(candidato.id);
    this.nombreCandidato.set(`${candidato.nombres} ${candidato.apellidos}`.trim());
    if (candidato.puntajes_automaticos) this.puntajes.set(candidato.puntajes_automaticos);
  }

  protected descargarCurriculum(candidato: RegistroCandidatoSeleccion): void {
    if (candidato.id === null || !candidato.curriculum_nombre) return;
    this.servicio.obtenerCurriculum(candidato.id).subscribe({
      next: (archivo) => {
        const url = URL.createObjectURL(archivo);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `curriculum-${candidato.id}.pdf`;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudo descargar el currículum.');
      },
    });
  }

  protected respuestaCandidato(
    candidato: RegistroCandidatoSeleccion,
    seccion: SeccionSeleccion,
    indice: number,
  ): string {
    const respuesta = candidato.respuestas?.[`${seccion}-${indice}`];
    const opcion = this.evaluacionActual()?.secciones
      .find((item) => item.id === seccion)?.items[indice]?.opciones
      ?.find((item) => item.id === respuesta);
    return opcion ? `${opcion.texto} (${opcion.puntos} pts)` : 'Sin respuesta registrada.';
  }

  protected puntajeAutomaticoTotal(candidato: RegistroCandidatoSeleccion): number | null {
    const puntajes = candidato.puntajes_automaticos;
    return puntajes
      ? puntajes.aptitudes + puntajes.conocimientos + puntajes.practica + puntajes.valores
      : null;
  }

  protected actualizarFecha(event: Event): void {
    this.fechaEvaluacion.set((event.target as HTMLInputElement).value);
  }

  protected actualizarPuntaje(seccion: SeccionSeleccion, event: Event): void {
    const puntaje = (event.target as HTMLInputElement).valueAsNumber;
    this.puntajes.update((actuales) => ({ ...actuales, [seccion]: puntaje }));
  }

  protected actualizarObservaciones(event: Event): void {
    this.observaciones.set((event.target as HTMLTextAreaElement).value);
  }

  protected actualizarDiscrepancia(event: Event): void {
    this.discrepanciaPendiente.set((event.target as HTMLInputElement).checked);
  }

  protected actualizarRiesgoControl(event: Event): void {
    this.riesgoControlPendiente.set((event.target as HTMLInputElement).checked);
  }

  protected alternarGuia(): void {
    this.mostrarGuia.update((mostrar) => !mostrar);
  }

  protected registrarResultado(): void {
    const plantilla = this.plantillaActual();
    const puntajes = this.puntajes();
    if (!plantilla || (!this.candidatoSeleccionado() && !this.nombreCandidato().trim()) || !this.fechaEvaluacion()) {
      this.error.set('Selecciona un candidato o registra su nombre, junto con el puesto y la fecha.');
      return;
    }
    const seccionesValidas = plantilla.evaluacion.secciones.every((seccion) => {
      const puntaje = puntajes[seccion.id];
      return Number.isFinite(puntaje) && puntaje >= 0 && puntaje <= seccion.puntaje_maximo;
    });
    if (!seccionesValidas) {
      this.error.set('Verifica que los puntajes de todas las secciones estén dentro de sus máximos.');
      return;
    }

    this.error.set('');
    this.aviso.set('');
    this.guardando.set(true);
    this.servicio.registrarResultado({
      candidato: this.nombreCandidato().trim() || undefined,
      candidato_id: this.candidatoSeleccionado() ?? undefined,
      puesto_id: plantilla.id,
      fecha_evaluacion: this.fechaEvaluacion(),
      puntajes,
      discrepancia_pendiente: this.discrepanciaPendiente(),
      riesgo_control_pendiente: this.riesgoControlPendiente(),
      observaciones: this.observaciones().trim(),
    }).subscribe({
      next: () => {
        this.aviso.set('Resultado de selección registrado.');
        this.guardando.set(false);
        this.limpiarFormulario();
        this.cargarResultados();
        this.cargarCandidatos();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudo registrar el resultado de selección.');
        this.guardando.set(false);
      },
    });
  }

  protected etiquetaDecision(decision: ResultadoSeleccion['decision']): string {
    return {
      recomendable: 'Recomendable para el puesto',
      revision_adicional: 'Revisión adicional',
      no_demostrada: 'Competencia aún no demostrada',
    }[decision];
  }

  protected formatoFecha(fecha: string): string {
    const fechaBase = fecha.slice(0, 10);
    const [anio, mes, dia] = fechaBase.split('-').map(Number);
    if (!anio || !mes || !dia) return fecha;
    return new Date(anio, mes - 1, dia).toLocaleDateString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  protected imprimirCuadernillo(): void {
    window.print();
  }

  protected salir(): void {
    this.auth.logout();
  }

  private cargarPlantillas(): void {
    this.cargando.set(true);
    this.servicio.obtenerPlantillas().subscribe({
      next: ({ plantillas }) => {
        this.plantillas.set(plantillas);
        const puestoId = plantillas[0] ? String(plantillas[0].id) : '';
        this.puestoSeleccionado.set(puestoId);
        this.cargando.set(false);
        this.cargarResultados();
        this.cargarCandidatos();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudieron cargar las pruebas de selección.');
        this.cargando.set(false);
      },
    });
  }

  private cargarResultados(): void {
    const puestoId = Number(this.puestoSeleccionado());
    this.servicio.listarResultados(puestoId || undefined).subscribe({
      next: ({ resultados }) => this.resultados.set(resultados),
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudieron cargar los resultados de selección.');
      },
    });
  }

  private limpiarFormulario(): void {
    this.nombreCandidato.set('');
    this.candidatoSeleccionado.set(null);
    this.puntajes.set({ aptitudes: 0, conocimientos: 0, practica: 0, valores: 0 });
    this.discrepanciaPendiente.set(false);
    this.riesgoControlPendiente.set(false);
    this.observaciones.set('');
    this.fechaEvaluacion.set(this.fechaLocal());
  }

  private cargarCandidatos(): void {
    const puestoId = Number(this.puestoSeleccionado());
    if (!puestoId) {
      this.candidatosPendientes.set([]);
      return;
    }
    this.servicio.listarCandidatosPendientes(puestoId).subscribe({
      next: ({ candidatos }) => this.candidatosPendientes.set(candidatos),
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudieron cargar las pruebas entregadas por candidatos.');
      },
    });
  }

  private fechaLocal(): string {
    const ahora = new Date();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${ahora.getFullYear()}-${mes}-${dia}`;
  }
}

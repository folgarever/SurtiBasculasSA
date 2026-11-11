import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClipboardCheck, lucideLayoutDashboard, lucideLogOut, lucideMessageSquare, lucideUsers } from '@ng-icons/lucide';
import { AuthService } from '../../services/auth.service';
import {
  CuentaCandidato,
  EvaluacionesSeleccionService,
  PlantillaEvaluacionSeleccion,
  PuestoPlantillaSeleccion,
  RegistroCandidatoSeleccion,
  ResultadoSeleccion,
  SeccionSeleccion,
} from '../../services/evaluaciones-seleccion.service';

@Component({
  selector: 'app-evaluaciones-seleccion',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIcon],
  providers: [provideIcons({ lucideClipboardCheck, lucideLayoutDashboard, lucideLogOut, lucideMessageSquare, lucideUsers })],
  templateUrl: './evaluaciones-seleccion.component.html',
  styleUrl: './evaluaciones-seleccion.component.css',
})
export class EvaluacionesSeleccionComponent implements OnInit {
  private readonly servicio = inject(EvaluacionesSeleccionService);
  private readonly auth = inject(AuthService);

  protected readonly usuario = this.auth.getUsuario();
  protected readonly plantillas = signal<PuestoPlantillaSeleccion[]>([]);
  protected readonly puestoSeleccionado = signal('');
  protected readonly puestoParaCuenta = signal('');
  protected readonly resultados = signal<ResultadoSeleccion[]>([]);
  protected readonly candidatosPendientes = signal<RegistroCandidatoSeleccion[]>([]);
  protected readonly cuentaCreada = signal<CuentaCandidato | null>(null);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly mostrarGuia = signal(false);
  protected readonly error = signal('');
  protected readonly aviso = signal('');
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
    this.puestoSeleccionado.set((event.target as HTMLSelectElement).value);
  }

  protected seleccionarPuestoCuenta(event: Event): void {
    this.puestoParaCuenta.set((event.target as HTMLSelectElement).value);
  }

  protected alternarGuia(): void {
    this.mostrarGuia.update((visible) => !visible);
  }

  protected registrarCandidato(): void {
    this.error.set('');
    this.aviso.set('');
    this.cuentaCreada.set(null);
    if (!this.puestoParaCuenta()) {
      this.error.set('Selecciona el puesto al que aspira el candidato.');
      return;
    }
    this.guardando.set(true);
    this.servicio.registrarCandidatoAdmin(Number(this.puestoParaCuenta())).subscribe({
      next: ({ cuenta }) => {
        this.cuentaCreada.set(cuenta);
        this.aviso.set('Cuenta generada. Comparte las credenciales con el candidato por un canal privado.');
        this.guardando.set(false);
        this.cargarCandidatos();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudo crear la cuenta de candidato.');
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

  protected autorizarReintento(candidatoId: number, nombre: string): void {
    const motivo = window.prompt(`Motivo para autorizar un nuevo intento de ${nombre}:`);
    if (motivo === null) return;
    if (!motivo.trim()) {
      this.error.set('Debes indicar y registrar el motivo de autorización.');
      return;
    }
    this.error.set('');
    this.aviso.set('');
    this.guardando.set(true);
    this.servicio.autorizarReintento(candidatoId, motivo.trim()).subscribe({
      next: ({ mensaje }) => {
        this.aviso.set(mensaje);
        this.guardando.set(false);
        this.cargarCandidatos();
        this.cargarResultados();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudo autorizar el nuevo intento.');
        this.guardando.set(false);
      },
    });
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
    const evaluacion = this.plantillas().find((plantilla) => plantilla.id === candidato.puesto_id)?.evaluacion;
    const respuesta = candidato.respuestas?.[`${seccion}-${indice}`];
    const opcion = evaluacion?.secciones.find((item) => item.id === seccion)?.items[indice]?.opciones
      ?.find((item) => item.id === respuesta);
    return opcion ? opcion.texto : 'Sin respuesta registrada.';
  }

  protected etiquetaDecision(decision: ResultadoSeleccion['decision']): string {
    return {
      recomendable: 'Recomendable para el puesto',
      revision_adicional: 'Revisión adicional',
      no_demostrada: 'Competencia aún no demostrada',
    }[decision];
  }

  protected puedeAutorizarReintento(resultado: ResultadoSeleccion): boolean {
    return resultado.origen === 'automatica'
      && resultado.candidato_id !== null
      && (resultado.estado_candidato === 'completada' || resultado.estado_candidato === 'evaluada')
      && !this.resultados().some((otro) => (
        otro.candidato_id === resultado.candidato_id
        && (otro.numero_intento ?? 0) > (resultado.numero_intento ?? 0)
      ));
  }

  protected autorizarReintentoResultado(resultado: ResultadoSeleccion): void {
    if (resultado.candidato_id === null) return;
    this.autorizarReintento(resultado.candidato_id, resultado.candidato);
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
        this.puestoSeleccionado.set(plantillas[0] ? String(plantillas[0].id) : '');
        this.puestoParaCuenta.set(plantillas[0] ? String(plantillas[0].id) : '');
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
    this.servicio.listarResultados().subscribe({
      next: ({ resultados }) => this.resultados.set(resultados),
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudieron cargar los resultados de selección.');
      },
    });
  }

  private cargarCandidatos(): void {
    this.servicio.listarCandidatosPendientes().subscribe({
      next: ({ candidatos }) => this.candidatosPendientes.set(candidatos),
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudieron cargar las cuentas y pruebas pendientes.');
      },
    });
  }
}

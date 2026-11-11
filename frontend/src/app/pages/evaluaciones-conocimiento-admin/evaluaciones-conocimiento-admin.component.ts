import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClipboardCheck, lucideLayoutDashboard, lucideLogOut, lucideMessageSquare, lucideUserRoundCog, lucideUsers } from '@ng-icons/lucide';
import { AuthService } from '../../services/auth.service';
import { SelectorTemaComponent } from '../../components/selector-tema/selector-tema.component';
import {
  EmpleadoConocimiento,
  EvaluacionConocimiento,
  EvaluacionesConocimientoService,
  OpcionPreguntaInput,
  PreguntaBanco,
  PuestoConocimiento,
  TipoPuntuacionOpcion,
} from '../../services/evaluaciones-conocimiento.service';

@Component({
  selector: 'app-evaluaciones-conocimiento-admin',
  standalone: true,
  imports: [RouterLink, NgIcon, SelectorTemaComponent],
  providers: [provideIcons({ lucideClipboardCheck, lucideLayoutDashboard, lucideLogOut, lucideMessageSquare, lucideUserRoundCog, lucideUsers })],
  templateUrl: './evaluaciones-conocimiento-admin.component.html',
})
export class EvaluacionesConocimientoAdminComponent implements OnInit {
  private readonly servicio = inject(EvaluacionesConocimientoService);
  private readonly auth = inject(AuthService);

  protected readonly usuario = this.auth.getUsuario();
  protected readonly evaluaciones = signal<EvaluacionConocimiento[]>([]);
  protected readonly empleados = signal<EmpleadoConocimiento[]>([]);
  protected readonly puestos = signal<PuestoConocimiento[]>([]);
  protected readonly departamentos = signal<string[]>([]);
  protected readonly detalle = signal<EvaluacionConocimiento | null>(null);
  protected readonly periodoActual = signal('');
  protected readonly filtroEmpleado = signal('');
  protected readonly filtroPuesto = signal('');
  protected readonly filtroDepartamento = signal('');
  protected readonly puestoBanco = signal('');
  protected readonly preguntasBanco = signal<PreguntaBanco[]>([]);
  protected readonly cargandoBanco = signal(false);
  protected readonly mostrandoEditor = signal(false);
  protected readonly guardandoPregunta = signal(false);
  protected readonly editandoPreguntaId = signal<number | null>(null);
  protected readonly textoPregunta = signal('');
  protected readonly opcionesPregunta = signal<OpcionPreguntaInput[]>([
    { texto: '', tipo: 'correcta', porcentaje: 100 },
    { texto: '', tipo: 'incorrecta', porcentaje: 0 },
  ]);
  protected readonly puntajeMaximoPregunta = signal(1);
  protected readonly cargando = signal(true);
  protected readonly cargandoDetalle = signal(false);
  protected readonly error = signal('');
  protected readonly completadasActuales = computed(
    () => this.evaluaciones().filter((item) => item.periodo === this.periodoActual() && item.estado === 'completada'),
  );
  protected readonly pendientesActuales = computed(
    () => this.evaluaciones().filter((item) => item.periodo === this.periodoActual() && item.estado === 'pendiente').length,
  );
  protected readonly cumplimientoActual = computed(() => {
    const actuales = this.evaluaciones().filter((item) => item.periodo === this.periodoActual());
    if (!actuales.length) return 0;
    return Math.round((this.completadasActuales().length / actuales.length) * 100);
  });
  protected readonly promedioActual = computed(() => {
    const completas = this.completadasActuales();
    if (!completas.length) return null;
    return Math.round(completas.reduce((total, item) => total + (item.porcentaje ?? 0), 0) / completas.length);
  });
  protected readonly totalActuales = computed(
    () => this.evaluaciones().filter((item) => item.periodo === this.periodoActual()).length,
  );
  protected readonly evolucionEmpleado = computed(() => {
    const seleccionado = this.detalle();
    if (!seleccionado) return [];
    return this.evaluaciones()
      .filter((item) => item.empleado_id === seleccionado.empleado_id && item.estado === 'completada')
      .sort((a, b) => a.periodo.localeCompare(b.periodo));
  });

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarEvaluaciones();
  }

  protected actualizarFiltro(tipo: 'empleado' | 'puesto' | 'departamento', event: Event): void {
    const valor = (event.target as HTMLSelectElement).value;
    if (tipo === 'empleado') this.filtroEmpleado.set(valor);
    if (tipo === 'puesto') this.filtroPuesto.set(valor);
    if (tipo === 'departamento') this.filtroDepartamento.set(valor);
    this.detalle.set(null);
    this.cargarEvaluaciones();
  }

  protected verDetalle(id: number): void {
    this.cargandoDetalle.set(true);
    this.error.set('');
    this.servicio.obtenerDetalleAdmin(id).subscribe({
      next: ({ evaluacion }) => {
        this.detalle.set(evaluacion);
        this.cargandoDetalle.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudo cargar el detalle de la evaluación.');
        this.cargandoDetalle.set(false);
      },
    });
  }

  protected cerrarDetalle(): void {
    this.detalle.set(null);
  }

  protected actualizarPuestoBanco(event: Event): void {
    const puestoId = (event.target as HTMLSelectElement).value;
    this.puestoBanco.set(puestoId);
    this.cancelarEdicionPregunta();
    this.cargarBanco();
  }

  protected nuevaPregunta(): void {
    this.editandoPreguntaId.set(null);
    this.textoPregunta.set('');
    this.opcionesPregunta.set([
      { texto: '', tipo: 'correcta', porcentaje: 100 },
      { texto: '', tipo: 'incorrecta', porcentaje: 0 },
    ]);
    this.puntajeMaximoPregunta.set(1);
    this.mostrandoEditor.set(true);
  }

  protected editarPregunta(pregunta: PreguntaBanco): void {
    this.editandoPreguntaId.set(pregunta.id);
    this.textoPregunta.set(pregunta.texto);
    this.opcionesPregunta.set(pregunta.opciones.map(({ texto, tipo, porcentaje }) => ({
      texto,
      tipo,
      porcentaje,
    })));
    this.puntajeMaximoPregunta.set(pregunta.puntos_maximos);
    this.mostrandoEditor.set(true);
  }

  protected actualizarTextoPregunta(event: Event): void {
    this.textoPregunta.set((event.target as HTMLTextAreaElement).value);
  }

  protected actualizarOpcion(indice: number, event: Event): void {
    const opciones = [...this.opcionesPregunta()];
    opciones[indice] = { ...opciones[indice], texto: (event.target as HTMLInputElement).value };
    this.opcionesPregunta.set(opciones);
  }

  protected actualizarPuntajeMaximo(event: Event): void {
    this.puntajeMaximoPregunta.set((event.target as HTMLInputElement).valueAsNumber);
  }

  protected actualizarTipoOpcion(indice: number, event: Event): void {
    const tipo = (event.target as HTMLSelectElement).value;
    if (tipo !== 'correcta' && tipo !== 'intermedia' && tipo !== 'incorrecta') return;
    const opciones = [...this.opcionesPregunta()];
    if (tipo === 'correcta') {
      opciones.forEach((opcion, indiceActual) => {
        if (opcion.tipo === 'correcta' && indiceActual !== indice) {
          opciones[indiceActual] = { ...opcion, tipo: 'incorrecta', porcentaje: 0 };
        }
      });
    }
    const actual = opciones[indice];
    opciones[indice] = {
      ...actual,
      tipo,
      porcentaje: tipo === 'correcta' ? 100 : tipo === 'incorrecta' ? 0 : (actual.tipo === 'intermedia' ? actual.porcentaje : 50),
    };
    this.opcionesPregunta.set(opciones);
  }

  protected actualizarPorcentajeOpcion(indice: number, event: Event): void {
    const porcentaje = (event.target as HTMLInputElement).valueAsNumber;
    const opciones = [...this.opcionesPregunta()];
    opciones[indice] = { ...opciones[indice], porcentaje };
    this.opcionesPregunta.set(opciones);
  }

  protected agregarOpcion(): void {
    if (this.opcionesPregunta().length < 10) {
      this.opcionesPregunta.update((opciones) => [
        ...opciones,
        { texto: '', tipo: 'incorrecta', porcentaje: 0 },
      ]);
    }
  }

  protected quitarOpcion(indice: number): void {
    const opciones = this.opcionesPregunta();
    if (opciones.length <= 2) return;
    this.opcionesPregunta.set(opciones.filter((_, indiceActual) => indiceActual !== indice));
  }

  protected cancelarEdicionPregunta(): void {
    this.mostrandoEditor.set(false);
    this.editandoPreguntaId.set(null);
  }

  protected guardarPregunta(): void {
    const texto = this.textoPregunta().trim();
    const opciones = this.opcionesPregunta().map((opcion) => ({ ...opcion, texto: opcion.texto.trim() }));
    if (!texto || opciones.length < 2 || opciones.some((opcion) => !opcion.texto)) {
      this.error.set('Completa la pregunta y todas sus opciones antes de guardar.');
      return;
    }
    if (texto.length > 1000 || opciones.some((opcion) => opcion.texto.length > 300)) {
      this.error.set('La pregunta admite hasta 1000 caracteres y cada opción hasta 300.');
      return;
    }
    const maximo = this.puntajeMaximoPregunta();
    if (!Number.isFinite(maximo) || maximo <= 0 || maximo > 9999.99 || Number(maximo.toFixed(2)) !== maximo) {
      this.error.set('El puntaje máximo debe ser mayor que cero y admitir hasta dos decimales.');
      return;
    }
    if (opciones.filter((opcion) => opcion.tipo === 'correcta').length !== 1) {
      this.error.set('Cada pregunta debe tener exactamente una opción correcta.');
      return;
    }
    if (opciones.some((opcion) => (
      opcion.tipo === 'intermedia'
      && (
        !Number.isInteger(opcion.porcentaje)
        || opcion.porcentaje < 1
        || opcion.porcentaje > 99
        || this.puntosOpcion(opcion.tipo, opcion.porcentaje, maximo) <= 0
        || this.puntosOpcion(opcion.tipo, opcion.porcentaje, maximo) >= maximo
      )
    ))) {
      this.error.set('El puntaje de cada opción intermedia debe ser un porcentaje entero entre 1 y 99.');
      return;
    }

    const puestoId = Number(this.puestoBanco());
    const pregunta = {
      texto,
      opciones,
      puntos_maximos: maximo,
    };
    const id = this.editandoPreguntaId();
    this.error.set('');
    this.guardandoPregunta.set(true);
    const solicitud = id === null
      ? this.servicio.crearPreguntaAdmin(puestoId, pregunta)
      : this.servicio.editarPreguntaAdmin(puestoId, id, pregunta);
    solicitud.subscribe({
      next: () => {
        this.guardandoPregunta.set(false);
        this.cancelarEdicionPregunta();
        this.cargarBanco();
        this.cargarEvaluaciones();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudo guardar la pregunta.');
        this.guardandoPregunta.set(false);
      },
    });
  }

  protected eliminarPregunta(pregunta: PreguntaBanco): void {
    if (!window.confirm(`¿Eliminar esta pregunta del puesto seleccionado?\n\n${pregunta.texto}`)) return;
    this.error.set('');
    this.servicio.eliminarPreguntaAdmin(Number(this.puestoBanco()), pregunta.id).subscribe({
      next: () => {
        if (this.editandoPreguntaId() === pregunta.id) this.cancelarEdicionPregunta();
        this.cargarBanco();
        this.cargarEvaluaciones();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudo eliminar la pregunta.');
      },
    });
  }

  protected etiquetaTipoPuntuacion(tipo: TipoPuntuacionOpcion): string {
    return { correcta: 'Correcta', intermedia: 'Intermedia', incorrecta: 'Incorrecta' }[tipo];
  }

  protected puntosOpcion(tipo: TipoPuntuacionOpcion, porcentaje: number, maximo: number): number {
    const proporcion = tipo === 'correcta' ? 100 : tipo === 'incorrecta' ? 0 : porcentaje;
    return Math.round((maximo * proporcion) / 100 * 100) / 100;
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

  private cargarCatalogos(): void {
    this.servicio.obtenerCatalogosAdmin().subscribe({
      next: ({ empleados, puestos, departamentos }) => {
        this.empleados.set(empleados);
        this.puestos.set(puestos);
        this.departamentos.set(departamentos);
        if (puestos.length) {
          this.puestoBanco.set(String(puestos[0].id));
          this.cargarBanco();
        }
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudieron cargar los filtros.');
      },
    });
  }

  private cargarEvaluaciones(): void {
    this.cargando.set(true);
    this.servicio.listarAdmin({
      empleado_id: this.filtroEmpleado() ? Number(this.filtroEmpleado()) : undefined,
      puesto_id: this.filtroPuesto() ? Number(this.filtroPuesto()) : undefined,
      departamento: this.filtroDepartamento() || undefined,
    }).subscribe({
      next: ({ periodo_actual: periodo, evaluaciones }) => {
        this.periodoActual.set(periodo);
        this.evaluaciones.set(evaluaciones);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudieron cargar las evaluaciones.');
        this.cargando.set(false);
      },
    });
  }

  private cargarBanco(): void {
    const puestoId = Number(this.puestoBanco());
    if (!puestoId) {
      this.preguntasBanco.set([]);
      this.cargandoBanco.set(false);
      return;
    }
    this.cargandoBanco.set(true);
    this.servicio.obtenerBancoAdmin(puestoId).subscribe({
      next: ({ preguntas }) => {
        if (this.puestoBanco() !== String(puestoId)) return;
        this.preguntasBanco.set(preguntas);
        this.cargandoBanco.set(false);
      },
      error: (error: HttpErrorResponse) => {
        if (this.puestoBanco() !== String(puestoId)) return;
        this.error.set(error.error?.mensaje || 'No se pudo cargar el banco de preguntas.');
        this.cargandoBanco.set(false);
      },
    });
  }
}

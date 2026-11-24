import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthService } from './auth.service';
import { DashboardAdmin, DashboardService } from './dashboard.service';
import { DocumentoPorVencer, EmpleadoAdministracion, ResumenMiFicha, RrhhService } from './rrhh.service';
import {
  EvaluacionConocimiento,
  EvaluacionesConocimientoService,
  formatoPeriodoEvaluacion,
} from './evaluaciones-conocimiento.service';
import {
  EvaluacionesSeleccionService,
  RegistroCandidatoSeleccion,
} from './evaluaciones-seleccion.service';
import {
  Sugerencia,
  SugerenciasService,
  guardarRespuestasVistas,
  leerRespuestasVistas,
  marcadorRespuesta,
  sugerenciaRespondida,
} from './sugerencias.service';

export type TipoNotificacion = 'sugerencia' | 'evaluacion' | 'seleccion' | 'empleado';

export interface NotificacionItem {
  id: string;
  titulo: string;
  detalle: string;
  ruta: string;
  marcador: string;
  tipo: TipoNotificacion;
}

interface MiEvaluacionResumen {
  periodo_actual: string;
  evaluacion_actual: EvaluacionConocimiento | null;
}

const PREFIJO_RESPUESTA = 'respuesta-';
const DIAS_AVISO_CELEBRACIONES = 7;
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export interface Celebracion {
  empleado: EmpleadoAdministracion;
  tipo: 'cumpleanos' | 'aniversario';
  dias: number;
  fecha: string;
  anios: number | null;
}

// Devuelve cumpleaños y aniversarios (1 año o más) de empleados activos dentro de los próximos días.
export function proximasCelebraciones(
  empleados: EmpleadoAdministracion[],
  hoy = new Date(),
  ventana = DIAS_AVISO_CELEBRACIONES,
): Celebracion[] {
  const inicio = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const resultado: Celebracion[] = [];

  const evaluar = (empleado: EmpleadoAdministracion, tipo: Celebracion['tipo'], valor?: string | null) => {
    const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor ?? '');
    if (!coincidencia) return;
    const [anioOrigen, mes, dia] = coincidencia.slice(1).map(Number);
    // Un 29 de febrero se celebra el 28 en los años no bisiestos.
    const dentroDelMes = (anio: number) => Math.min(dia, new Date(anio, mes, 0).getDate());
    let anio = hoy.getFullYear();
    let proxima = Date.UTC(anio, mes - 1, dentroDelMes(anio));
    if (proxima < inicio) {
      anio += 1;
      proxima = Date.UTC(anio, mes - 1, dentroDelMes(anio));
    }
    const dias = Math.round((proxima - inicio) / 86_400_000);
    const anios = anio - anioOrigen;
    if (dias > ventana || (tipo === 'aniversario' && anios < 1)) return;
    resultado.push({
      empleado,
      tipo,
      dias,
      fecha: `${dentroDelMes(anio)} ${MESES_CORTOS[mes - 1]}`,
      anios: tipo === 'aniversario' ? anios : null,
    });
  };

  for (const empleado of empleados.filter((item) => item.activo)) {
    evaluar(empleado, 'cumpleanos', empleado.fecha_nacimiento);
    evaluar(empleado, 'aniversario', empleado.fecha_ingreso);
  }
  return resultado.sort((a, b) => a.dias - b.dias || a.empleado.nombre.localeCompare(b.empleado.nombre));
}

export interface CelebracionMes {
  empleado: EmpleadoAdministracion;
  tipo: 'cumpleanos' | 'aniversario';
  dia: number;
  anios: number | null;
}

// Todos los cumpleaños y aniversarios (1 año o más) de empleados activos en el mes indicado.
export function celebracionesDelMes(empleados: EmpleadoAdministracion[], hoy = new Date()): CelebracionMes[] {
  const mesActual = hoy.getMonth() + 1;
  const resultado: CelebracionMes[] = [];
  const evaluar = (empleado: EmpleadoAdministracion, tipo: CelebracionMes['tipo'], valor?: string | null) => {
    const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor ?? '');
    if (!coincidencia) return;
    const [anioOrigen, mes, dia] = coincidencia.slice(1).map(Number);
    if (mes !== mesActual) return;
    const anios = hoy.getFullYear() - anioOrigen;
    if (tipo === 'aniversario' && anios < 1) return;
    // Un 29 de febrero se muestra el 28 en los años no bisiestos.
    const diaMostrado = Math.min(dia, new Date(hoy.getFullYear(), mes, 0).getDate());
    resultado.push({ empleado, tipo, dia: diaMostrado, anios: tipo === 'aniversario' ? anios : null });
  };
  for (const empleado of empleados.filter((item) => item.activo)) {
    evaluar(empleado, 'cumpleanos', empleado.fecha_nacimiento);
    evaluar(empleado, 'aniversario', empleado.fecha_ingreso);
  }
  return resultado.sort((a, b) => a.dia - b.dia || a.empleado.nombre.localeCompare(b.empleado.nombre));
}

function describirCelebracion(celebracion: Celebracion): string {
  const cuando = celebracion.dias === 0 ? 'hoy' : celebracion.dias === 1 ? 'mañana' : `el ${celebracion.fecha}`;
  const nombre = celebracion.empleado.nombre;
  if (celebracion.tipo === 'cumpleanos') return `${nombre} cumple años ${cuando}`;
  const anios = celebracion.anios ?? 0;
  return `${nombre} cumple ${anios} ${anios === 1 ? 'año' : 'años'} en la empresa ${cuando}`;
}

const ETIQUETAS_DECISION: Record<NonNullable<RegistroCandidatoSeleccion['decision']>, string> = {
  recomendable: 'Recomendable para el puesto',
  revision_adicional: 'Revisión adicional',
  no_demostrada: 'Competencia aún no demostrada',
};

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly auth = inject(AuthService);
  private readonly sugerencias = inject(SugerenciasService);
  private readonly conocimiento = inject(EvaluacionesConocimientoService);
  private readonly seleccion = inject(EvaluacionesSeleccionService);
  private readonly dashboard = inject(DashboardService);
  private readonly rrhh = inject(RrhhService);

  private claveVistas = 'surtibasculas_notificaciones_vistas:anonimo';
  private readonly vistas = signal<Record<string, string>>({});
  private readonly respuestasVistas = signal<Record<number, string>>({});

  private readonly _items = signal<NotificacionItem[]>([]);
  private readonly _cargando = signal(false);

  readonly items = this._items.asReadonly();
  readonly cargando = this._cargando.asReadonly();
  readonly total = computed(() => this._items().length);
  readonly noLeidos = computed(() => this._items().filter((item) => !this.estaLeido(item)).length);

  cargar(): void {
    this._cargando.set(true);
    this.respuestasVistas.set(leerRespuestasVistas());

    const usuario = this.auth.getUsuario();
    this.claveVistas = `surtibasculas_notificaciones_vistas:${usuario?.id ?? usuario?.codigo_empleado ?? 'anonimo'}`;
    this.vistas.set(this.leerVistas());

    if (this.auth.isCandidate()) {
      this.seleccion.obtenerMiRegistroCandidato()
        .pipe(catchError(() => of(null)))
        .subscribe((respuesta) => {
          this._items.set(this.itemsCandidato(respuesta?.candidato ?? null));
          this._cargando.set(false);
        });
      return;
    }

    if (this.auth.hasAdminRole()) {
      forkJoin({
        sugerencias: this.sugerencias.obtenerTodas()
          .pipe(catchError(() => of({ sugerencias: [] as Sugerencia[] }))),
        resumen: this.dashboard.obtenerResumenAdmin().pipe(catchError(() => of(null))),
        empleados: this.rrhh.obtenerEmpleadosAdministracion().pipe(catchError(() => of(null))),
        documentos: this.rrhh.obtenerDocumentosPorVencer().pipe(catchError(() => of(null))),
      }).subscribe(({ sugerencias, resumen, empleados, documentos }) => {
        this._items.set(this.itemsAdmin(sugerencias?.sugerencias ?? [], resumen, empleados?.empleados ?? [], documentos?.documentos ?? []));
        this._cargando.set(false);
      });
      return;
    }

    forkJoin({
      propias: this.sugerencias.obtenerMisSugerencias()
        .pipe(catchError(() => of({ sugerencias: [] as Sugerencia[] }))),
      evaluacion: this.conocimiento.obtenerMiEvaluacion()
        .pipe(catchError(() => of(null))),
      ficha: this.rrhh.obtenerMiFicha().pipe(catchError(() => of(null))),
    }).subscribe(({ propias, evaluacion, ficha }) => {
      this._items.set([...this.itemsEmpleado(propias.sugerencias, evaluacion), ...this.itemsMiFicha(ficha)]);
      this._cargando.set(false);
    });
  }

  private itemsMiFicha(ficha: ResumenMiFicha | null): NotificacionItem[] {
    if (!ficha?.faltantes?.length) return [];
    return [{
      id: 'mi-ficha-incompleta',
      titulo: 'Tu ficha de personal está incompleta',
      detalle: `Falta: ${ficha.faltantes.join(', ')}. Entrega estos datos a Recursos Humanos.`,
      ruta: '/dashboard',
      marcador: ficha.faltantes.join(','),
      tipo: 'empleado',
    }];
  }

  estaLeido(item: NotificacionItem): boolean {
    if (item.id.startsWith(PREFIJO_RESPUESTA)) {
      const id = Number(item.id.slice(PREFIJO_RESPUESTA.length));
      return this.respuestasVistas()[id] === item.marcador;
    }
    return this.vistas()[item.id] === item.marcador;
  }

  marcarLeido(item: NotificacionItem): void {
    if (item.id.startsWith(PREFIJO_RESPUESTA)) {
      const id = Number(item.id.slice(PREFIJO_RESPUESTA.length));
      const vistas = { ...this.respuestasVistas(), [id]: item.marcador };
      guardarRespuestasVistas(vistas);
      this.respuestasVistas.set(vistas);
      return;
    }
    this.guardarVistas({ ...this.vistas(), [item.id]: item.marcador });
  }

  marcarTodos(): void {
    for (const item of this._items()) {
      if (!this.estaLeido(item)) this.marcarLeido(item);
    }
  }

  private itemsEmpleado(sugerencias: Sugerencia[], evaluacion: MiEvaluacionResumen | null): NotificacionItem[] {
    const items: NotificacionItem[] = [];
    const vistas = this.respuestasVistas();

    for (const sugerencia of sugerencias) {
      if (!sugerenciaRespondida(sugerencia)) continue;
      const marcador = marcadorRespuesta(sugerencia);
      if (vistas[sugerencia.id] === marcador) continue;
      items.push({
        id: `${PREFIJO_RESPUESTA}${sugerencia.id}`,
        titulo: 'Respuesta a tu sugerencia',
        detalle: `${sugerencia.folio} · ${sugerencia.titulo}`,
        ruta: '/sugerencias',
        marcador,
        tipo: 'sugerencia',
      });
    }

    const actual = evaluacion?.evaluacion_actual;
    if (actual?.estado === 'pendiente') {
      const periodo = evaluacion?.periodo_actual || actual.periodo;
      items.push({
        id: `evaluacion-${actual.id}`,
        titulo: 'Evaluación de conocimiento pendiente',
        detalle: `Periodo ${formatoPeriodoEvaluacion(periodo)}`,
        ruta: '/evaluaciones-conocimiento',
        marcador: `${periodo}:${actual.id}`,
        tipo: 'evaluacion',
      });
    }

    return items;
  }

  private itemsAdmin(
    sugerencias: Sugerencia[],
    resumen: DashboardAdmin | null,
    empleados: EmpleadoAdministracion[] = [],
    documentos: DocumentoPorVencer[] = [],
  ): NotificacionItem[] {
    const items: NotificacionItem[] = [];
    const vencidos = documentos.filter((documento) => documento.dias < 0).length;
    if (documentos.length) {
      const cantidad = documentos.length;
      items.push({
        id: 'documentos-por-vencer',
        titulo: 'Documentos de personal por vencer',
        detalle: `${cantidad} ${cantidad === 1 ? 'documento vence' : 'documentos vencen'} en 30 días o ya ${cantidad === 1 ? 'venció' : 'vencieron'}${vencidos ? ` (${vencidos} vencidos)` : ''}`,
        ruta: new Set(documentos.map((documento) => documento.empleado_id)).size === 1
          ? `/admin/empleados/${documentos[0].empleado_id}` : '/admin/empleados',
        marcador: documentos.map((documento) => documento.id).sort((a, b) => a - b).join(','),
        tipo: 'empleado',
      });
    }
    const pendientes = sugerencias.filter((sugerencia) => !sugerenciaRespondida(sugerencia));
    const fichasIncompletas = empleados.filter((empleado) => empleado.activo && !empleado.ficha_completa);

    if (fichasIncompletas.length) {
      const cantidad = fichasIncompletas.length;
      items.push({
        id: 'fichas-incompletas',
        titulo: 'Fichas de personal por completar',
        detalle: `${cantidad} ${cantidad === 1 ? 'empleado activo necesita' : 'empleados activos necesitan'} DPI, contacto, fecha de ingreso o currículum`,
        ruta: cantidad === 1 ? `/admin/empleados/${fichasIncompletas[0].id}` : '/admin/empleados',
        marcador: fichasIncompletas.map((empleado) => empleado.id).sort((a, b) => a - b).join(','),
        tipo: 'empleado',
      });
    }

    const celebraciones = proximasCelebraciones(empleados);
    if (celebraciones.length) {
      const resto = celebraciones.length - 2;
      const unico = new Set(celebraciones.map((celebracion) => celebracion.empleado.id));
      items.push({
        id: 'celebraciones',
        titulo: 'Cumpleaños y aniversarios',
        detalle: celebraciones.slice(0, 2).map(describirCelebracion).join(' · ') + (resto > 0 ? ` · y ${resto} más` : ''),
        ruta: unico.size === 1 ? `/admin/empleados/${celebraciones[0].empleado.id}` : '/admin/empleados',
        marcador: celebraciones.map((celebracion) => `${celebracion.empleado.id}:${celebracion.tipo}:${celebracion.fecha}`).join(','),
        tipo: 'empleado',
      });
    }

    if (pendientes.length) {
      items.push({
        id: 'sugerencias-pendientes',
        titulo: 'Sugerencias sin responder',
        detalle: `${pendientes.length} ${pendientes.length === 1 ? 'sugerencia espera' : 'sugerencias esperan'} respuesta`,
        ruta: '/admin/sugerencias',
        marcador: pendientes.map((sugerencia) => sugerencia.id).sort((a, b) => a - b).join(','),
        tipo: 'sugerencia',
      });
    }

    if (resumen) {
      const { evaluaciones_pendientes, candidatos_registro, candidatos_completados } = resumen.resumen;
      if (evaluaciones_pendientes > 0) {
        items.push({
          id: 'evaluaciones-pendientes',
          titulo: 'Evaluaciones pendientes',
          detalle: `${evaluaciones_pendientes} ${evaluaciones_pendientes === 1 ? 'evaluación' : 'evaluaciones'} por completar`,
          ruta: '/admin/evaluaciones-conocimiento',
          marcador: `${resumen.periodo}:${evaluaciones_pendientes}`,
          tipo: 'evaluacion',
        });
      }
      if (candidatos_registro > 0) {
        items.push({
          id: 'candidatos-registro',
          titulo: 'Candidatos por revisar',
          detalle: `${candidatos_registro} ${candidatos_registro === 1 ? 'candidato espera' : 'candidatos esperan'} evaluación`,
          ruta: '/admin/evaluaciones-seleccion',
          marcador: `${resumen.periodo}:${candidatos_registro}`,
          tipo: 'seleccion',
        });
      }
      if (candidatos_completados > 0) {
        items.push({
          id: 'seleccion-resultados',
          titulo: 'Resultados de selección disponibles',
          detalle: `${candidatos_completados} ${candidatos_completados === 1 ? 'evaluación' : 'evaluaciones'} de selección completadas`,
          ruta: '/admin/evaluaciones-seleccion',
          marcador: `${resumen.periodo}:${candidatos_completados}`,
          tipo: 'seleccion',
        });
      }
    }

    return items;
  }

  private itemsCandidato(candidato: RegistroCandidatoSeleccion | null): NotificacionItem[] {
    if (!candidato || candidato.id === null) return [];

    const marcador = `${candidato.id}:${candidato.numero_intento ?? 0}:${candidato.estado}:${candidato.decision ?? ''}`;
    if (candidato.decision) {
      return [{
        id: `seleccion-${candidato.id}`,
        titulo: 'Resultado de tu evaluación',
        detalle: ETIQUETAS_DECISION[candidato.decision],
        ruta: '/seleccion-candidato',
        marcador,
        tipo: 'seleccion',
      }];
    }
    if (candidato.estado === 'completada') {
      return [{
        id: `seleccion-${candidato.id}`,
        titulo: 'Evaluación enviada',
        detalle: 'El equipo de selección revisará tu prueba.',
        ruta: '/seleccion-candidato',
        marcador,
        tipo: 'seleccion',
      }];
    }
    return [];
  }

  private leerVistas(): Record<string, string> {
    try {
      const contenido = localStorage.getItem(this.claveVistas);
      const datos = contenido ? JSON.parse(contenido) : {};
      return datos && typeof datos === 'object' && !Array.isArray(datos)
        ? datos as Record<string, string>
        : {};
    } catch {
      return {};
    }
  }

  private guardarVistas(vistas: Record<string, string>): void {
    try {
      localStorage.setItem(this.claveVistas, JSON.stringify(vistas));
    } catch {
      // Las notificaciones son solo una ayuda visual; no bloquean el flujo.
    }
    this.vistas.set(vistas);
  }
}

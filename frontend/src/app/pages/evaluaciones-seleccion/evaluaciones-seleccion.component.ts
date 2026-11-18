import { AppShellComponent } from '../../components/app-shell/app-shell.component';
import { NAV_ADMIN, SUGERENCIAS_ADMIN } from '../../components/app-shell/nav-items';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import {
  CuentaCandidato,
  DetallePlantillaSeleccion,
  EvaluacionesSeleccionService,
  PerfilCandidatoAdminInput,
  PlantillaEvaluacionSeleccion,
  PuestoPlantillaSeleccion,
  RegistroCandidatoSeleccion,
  ResumenPlantillaSeleccion,
  ResultadoSeleccion,
  SeccionSeleccion,
  VersionDetallePlantilla,
} from '../../services/evaluaciones-seleccion.service';

type UmbralPlantilla = keyof PlantillaEvaluacionSeleccion['umbrales'];
type CampoSeccion = 'nombre' | 'tiempo_minutos' | 'puntaje_maximo' | 'instrucciones';
type CampoItem = 'enunciado' | 'detalle';
type CampoOpcion = 'texto' | 'puntos';
type CampoRubrica = 'criterio' | 'puntos';
type CampoActividad = 'solicitud' | 'respuesta_esperada';

@Component({
  selector: 'app-evaluaciones-seleccion',
  standalone: true,
  imports: [AppShellComponent, CommonModule],
  templateUrl: './evaluaciones-seleccion.component.html',
  styleUrl: './evaluaciones-seleccion.component.css',
})
export class EvaluacionesSeleccionComponent implements OnInit {
  protected readonly navItems = NAV_ADMIN;
  protected readonly bottomItems = [SUGERENCIAS_ADMIN];
  private readonly servicio = inject(EvaluacionesSeleccionService);
  private readonly auth = inject(AuthService);

  protected readonly usuario = this.auth.getUsuario();
  protected readonly clavesUmbral: UmbralPlantilla[] = [
    'recomendable',
    'revision_adicional',
    'minimo_practica',
    'minimo_conocimientos',
    'minimo_valores',
  ];
  protected readonly etiquetasUmbral: Record<UmbralPlantilla, string> = {
    recomendable: 'Puntaje para recomendar',
    revision_adicional: 'Puntaje para revisión adicional',
    minimo_practica: 'Puntaje mínimo de práctica',
    minimo_conocimientos: 'Puntaje mínimo de conocimientos',
    minimo_valores: 'Puntaje mínimo de valores',
  };
  protected readonly descripcionesUmbral: Record<UmbralPlantilla, string> = {
    recomendable: 'Puntaje total mínimo para recomendar al candidato.',
    revision_adicional: 'Puntaje total mínimo para pasar a revisión adicional.',
    minimo_practica: 'Puntaje que debe alcanzar en la sección Práctica.',
    minimo_conocimientos: 'Puntaje que debe alcanzar en Conocimientos.',
    minimo_valores: 'Puntaje que debe alcanzar en Valores.',
  };
  protected readonly plantillas = signal<PuestoPlantillaSeleccion[]>([]);
  protected readonly resumenesPlantillas = signal<ResumenPlantillaSeleccion[]>([]);
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

  protected readonly detallePlantilla = signal<DetallePlantillaSeleccion | null>(null);
  protected readonly definicionEditada = signal<PlantillaEvaluacionSeleccion | null>(null);
  protected readonly notasVersion = signal('');
  protected readonly guardandoPlantilla = signal(false);
  protected readonly erroresDefinicion = computed(() => {
    const definicion = this.definicionEditada();
    return definicion ? this.validarDefinicion(definicion) : [];
  });
  protected readonly totalPreguntas = computed(
    () => this.definicionEditada()?.secciones.reduce((total, seccion) => total + seccion.items.length, 0) ?? 0,
  );
  protected readonly hayCambiosSinGuardar = computed(() => {
    const plantilla = this.detallePlantilla();
    const definicion = this.definicionEditada();
    if (!plantilla || !definicion) return false;
    const versionActual = [...plantilla.versiones].sort((a, b) => b.numero - a.numero)[0];
    return JSON.stringify(definicion) !== JSON.stringify(versionActual?.definicion)
      || this.notasVersion() !== (versionActual?.notas ?? '');
  });
  protected readonly puedeGuardar = computed(() => {
    const tieneBorrador = this.detallePlantilla()?.versiones.some((version) => version.estado === 'borrador') === true;
    return this.erroresDefinicion().length === 0 && (this.hayCambiosSinGuardar() || !tieneBorrador);
  });
  protected readonly puedePublicar = computed(
    () => this.detallePlantilla()?.versiones.some((version) => version.estado === 'borrador') === true
      && !this.hayCambiosSinGuardar()
      && this.erroresDefinicion().length === 0,
  );

  protected readonly editandoPerfilId = signal<number | null>(null);
  protected readonly perfilEdicion = signal<PerfilCandidatoAdminInput>({
    nombres: '',
    apellidos: '',
    fecha_nacimiento: '',
    puesto_id: 0,
    curriculum: null,
  });
  protected readonly reintentoCandidatoId = signal<number | null>(null);
  protected readonly reintentoNombre = signal('');
  protected readonly motivoReintento = signal('');

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
    this.puestoSeleccionado.set(this.valorTexto(event));
  }

  protected seleccionarPuestoCuenta(event: Event): void {
    this.puestoParaCuenta.set(this.valorTexto(event));
  }

  protected alternarGuia(): void {
    this.mostrarGuia.update((visible) => !visible);
  }

  protected registrarCandidato(): void {
    this.limpiarMensajes();
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
      error: (error: HttpErrorResponse) => this.fallar(error, 'No se pudo crear la cuenta de candidato.'),
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

  protected solicitarReintento(candidatoId: number, nombre: string): void {
    this.limpiarMensajes();
    this.reintentoCandidatoId.set(candidatoId);
    this.reintentoNombre.set(nombre);
    this.motivoReintento.set('');
  }

  protected cancelarReintento(): void {
    this.reintentoCandidatoId.set(null);
    this.reintentoNombre.set('');
    this.motivoReintento.set('');
  }

  protected confirmarReintento(): void {
    const candidatoId = this.reintentoCandidatoId();
    const motivo = this.motivoReintento().trim();
    if (candidatoId === null) return;
    if (!motivo || motivo.length > 500) {
      this.error.set('Indica un motivo de 1 a 500 caracteres para autorizar el reintento.');
      return;
    }
    this.limpiarMensajes();
    this.guardando.set(true);
    this.servicio.autorizarReintento(candidatoId, motivo).subscribe({
      next: ({ mensaje }) => {
        this.aviso.set(mensaje);
        this.guardando.set(false);
        this.cancelarReintento();
        this.cargarCandidatos();
        this.cargarResultados();
      },
      error: (error: HttpErrorResponse) => this.fallar(error, 'No se pudo autorizar el nuevo intento.'),
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
    this.solicitarReintento(resultado.candidato_id, resultado.candidato);
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

  // Configuración de pruebas versionadas

  protected abrirEditor(resumen: ResumenPlantillaSeleccion): void {
    this.limpiarMensajes();
    if (resumen.plantilla_id === null) {
      this.guardandoPlantilla.set(true);
      this.servicio.crearPlantilla(resumen.puesto_id, undefined, 'Creada desde Administración').subscribe({
        next: ({ plantilla }) => {
          this.aplicarDetalle(plantilla);
          this.guardandoPlantilla.set(false);
          this.aviso.set('Se creó un borrador editable a partir de la prueba actual.');
          this.cargarResumenesPlantillas();
          this.cargarPlantillas();
        },
        error: (error: HttpErrorResponse) => this.fallarPlantilla(error, 'No se pudo crear la plantilla editable.'),
      });
      return;
    }
    this.guardandoPlantilla.set(true);
    this.servicio.obtenerDetallePlantilla(resumen.plantilla_id).subscribe({
      next: ({ plantilla }) => {
        this.aplicarDetalle(plantilla);
        this.guardandoPlantilla.set(false);
      },
      error: (error: HttpErrorResponse) => this.fallarPlantilla(error, 'No se pudo cargar la plantilla.'),
    });
  }

  protected cerrarEditor(): void {
    if (this.hayCambiosSinGuardar() && !window.confirm('Hay cambios sin guardar. ¿Deseas cerrar y descartarlos?')) return;
    this.detallePlantilla.set(null);
    this.definicionEditada.set(null);
    this.notasVersion.set('');
  }

  protected actualizarDefinicionCampo(campo: 'titulo' | 'tiempo_total_minutos' | 'puntaje_total', event: Event): void {
    const valor = campo === 'titulo' ? this.valorTexto(event) : Number(this.valorTexto(event));
    this.mutarDefinicion((definicion) => {
      (definicion as unknown as Record<string, unknown>)[campo] = valor;
    });
  }

  protected actualizarUmbral(clave: UmbralPlantilla, event: Event): void {
    const valor = Number(this.valorTexto(event));
    this.mutarDefinicion((definicion) => {
      definicion.umbrales[clave] = valor;
    });
  }

  protected actualizarSeccion(indice: number, campo: CampoSeccion, event: Event): void {
    const valor = campo === 'nombre' || campo === 'instrucciones'
      ? this.valorTexto(event)
      : Number(this.valorTexto(event));
    this.mutarDefinicion((definicion) => {
      const seccion = definicion.secciones[indice];
      if (seccion) (seccion as unknown as Record<string, unknown>)[campo] = valor;
    });
  }

  protected actualizarItem(seccionIndice: number, itemIndice: number, campo: CampoItem, event: Event): void {
    const valor = this.valorTexto(event);
    this.mutarDefinicion((definicion) => {
      const item = definicion.secciones[seccionIndice]?.items[itemIndice];
      if (item) item[campo] = valor;
    });
  }

  protected actualizarOpcion(
    seccionIndice: number,
    itemIndice: number,
    opcionIndice: number,
    campo: CampoOpcion,
    event: Event,
  ): void {
    const valor = campo === 'texto' ? this.valorTexto(event) : Number(this.valorTexto(event));
    this.mutarDefinicion((definicion) => {
      const opcion = definicion.secciones[seccionIndice]?.items[itemIndice]?.opciones?.[opcionIndice];
      if (opcion) (opcion as unknown as Record<string, unknown>)[campo] = valor;
    });
  }

  protected marcarCorrecta(seccionIndice: number, itemIndice: number, opcionIndice: number): void {
    this.mutarDefinicion((definicion) => {
      const opciones = definicion.secciones[seccionIndice]?.items[itemIndice]?.opciones ?? [];
      opciones.forEach((opcion, indice) => {
        opcion.correcta = indice === opcionIndice;
      });
    });
  }

  protected agregarOpcion(seccionIndice: number, itemIndice: number): void {
    this.mutarDefinicion((definicion) => {
      const opciones = definicion.secciones[seccionIndice]?.items[itemIndice]?.opciones;
      if (!opciones) return;
      const id = String.fromCharCode(65 + opciones.length);
      opciones.push({ id, texto: `Nueva opción ${id}`, puntos: 0, correcta: false });
    });
  }

  protected eliminarOpcion(seccionIndice: number, itemIndice: number, opcionIndice: number): void {
    this.mutarDefinicion((definicion) => {
      const opciones = definicion.secciones[seccionIndice]?.items[itemIndice]?.opciones;
      if (!opciones || opciones.length <= 2) return;
      opciones.splice(opcionIndice, 1);
      opciones.forEach((opcion, indice) => {
        opcion.id = String.fromCharCode(65 + indice);
      });
    });
  }

  protected agregarPregunta(seccionIndice: number): void {
    this.mutarDefinicion((definicion) => {
      const seccion = definicion.secciones[seccionIndice];
      if (!seccion) return;
      seccion.items.push({
        enunciado: `Nueva pregunta ${seccion.items.length + 1}`,
        rubrica: [{ criterio: 'Criterio de calificación', puntos: 1 }],
        opciones: [
          { id: 'A', texto: 'Opción A', puntos: 1, correcta: true },
          { id: 'B', texto: 'Opción B', puntos: 0, correcta: false },
        ],
      });
    });
  }

  protected eliminarPregunta(seccionIndice: number, itemIndice: number): void {
    const seccion = this.definicionEditada()?.secciones[seccionIndice];
    if (!seccion || seccion.items.length <= 1) return;
    if (!window.confirm(`¿Eliminar la pregunta ${itemIndice + 1}? El cambio se aplicará cuando guardes el borrador.`)) return;
    this.mutarDefinicion((definicion) => {
      definicion.secciones[seccionIndice]?.items.splice(itemIndice, 1);
    });
  }

  protected actualizarRubrica(
    seccionIndice: number,
    itemIndice: number,
    criterioIndice: number,
    campo: CampoRubrica,
    event: Event,
  ): void {
    const valor = campo === 'criterio' ? this.valorTexto(event) : Number(this.valorTexto(event));
    this.mutarDefinicion((definicion) => {
      const criterio = definicion.secciones[seccionIndice]?.items[itemIndice]?.rubrica[criterioIndice];
      if (criterio) (criterio as unknown as Record<string, unknown>)[campo] = valor;
    });
  }

  protected agregarRubrica(seccionIndice: number, itemIndice: number): void {
    this.mutarDefinicion((definicion) => {
      definicion.secciones[seccionIndice]?.items[itemIndice]?.rubrica.push({
        criterio: 'Nuevo criterio de calificación',
        puntos: 1,
      });
    });
  }

  protected eliminarRubrica(seccionIndice: number, itemIndice: number, criterioIndice: number): void {
    this.mutarDefinicion((definicion) => {
      definicion.secciones[seccionIndice]?.items[itemIndice]?.rubrica.splice(criterioIndice, 1);
    });
  }

  protected actualizarActividad(actividadIndice: number, campo: CampoActividad, event: Event): void {
    const valor = this.valorTexto(event);
    this.mutarDefinicion((definicion) => {
      (definicion.verificacion_en_vivo.actividades[actividadIndice] as unknown as Record<string, unknown>)[campo] = valor;
    });
  }

  protected agregarActividad(): void {
    this.mutarDefinicion((definicion) => {
      definicion.verificacion_en_vivo.actividades.push({
        solicitud: 'Nueva actividad de verificación',
        respuesta_esperada: 'Respuesta esperada',
      });
    });
  }

  protected eliminarActividad(actividadIndice: number): void {
    this.mutarDefinicion((definicion) => {
      definicion.verificacion_en_vivo.actividades.splice(actividadIndice, 1);
    });
  }

  protected guardarBorrador(): void {
    const plantilla = this.detallePlantilla();
    const definicion = this.definicionEditada();
    if (!plantilla || !definicion) return;
    this.limpiarMensajes();
    this.guardandoPlantilla.set(true);
    this.servicio.actualizarPlantilla(plantilla.id, definicion, this.notasVersion()).subscribe({
      next: ({ plantilla: actualizada }) => {
        this.aplicarDetalle(actualizada);
        this.guardandoPlantilla.set(false);
        this.aviso.set('Borrador guardado. La versión publicada sigue sin cambios.');
        this.cargarResumenesPlantillas();
      },
      error: (error: HttpErrorResponse) => this.fallarPlantilla(error, 'No se pudo guardar el borrador.'),
    });
  }

  protected publicarPlantilla(): void {
    const plantilla = this.detallePlantilla();
    if (!plantilla) return;
    if (!window.confirm('¿Publicar esta versión? Los nuevos intentos usarán esta prueba; los resultados anteriores no cambiarán.')) return;
    this.limpiarMensajes();
    this.guardandoPlantilla.set(true);
    this.servicio.publicarPlantilla(plantilla.id).subscribe({
      next: ({ plantilla: publicada }) => {
        this.aplicarDetalle(publicada);
        this.guardandoPlantilla.set(false);
        this.aviso.set('La nueva versión ya está publicada y la usarán los nuevos intentos.');
        this.cargarResumenesPlantillas();
        this.cargarPlantillas();
      },
      error: (error: HttpErrorResponse) => this.fallarPlantilla(error, 'No se pudo publicar la plantilla.'),
    });
  }

  protected alternarActivaPlantilla(): void {
    const plantilla = this.detallePlantilla();
    if (!plantilla) return;
    if (plantilla.activa && !window.confirm('¿Desactivar esta prueba personalizada? Los nuevos intentos usarán la configuración base del puesto.')) return;
    this.limpiarMensajes();
    this.guardandoPlantilla.set(true);
    this.servicio.activarPlantilla(plantilla.id, !plantilla.activa).subscribe({
      next: ({ plantilla: actualizada }) => {
        this.aplicarDetalle(actualizada);
        this.guardandoPlantilla.set(false);
        this.aviso.set(actualizada.activa
          ? 'La plantilla volvió a estar activa.'
          : 'La plantilla quedó inactiva; los candidatos usarán la configuración base.');
        this.cargarResumenesPlantillas();
        this.cargarPlantillas();
      },
      error: (error: HttpErrorResponse) => this.fallarPlantilla(error, 'No se pudo cambiar el estado de la plantilla.'),
    });
  }

  protected cargarVersionEnEditor(version: VersionDetallePlantilla): void {
    this.definicionEditada.set(this.clonar(version.definicion));
    this.notasVersion.set(`Basada en la versión ${version.numero}`);
    this.aviso.set(`Versión ${version.numero} cargada en el editor. Guárdala como borrador para conservarla.`);
  }

  protected restaurarVersion(version: VersionDetallePlantilla): void {
    const plantilla = this.detallePlantilla();
    if (!plantilla) return;
    this.limpiarMensajes();
    this.guardandoPlantilla.set(true);
    this.servicio.restaurarVersionPlantilla(plantilla.id, version.id).subscribe({
      next: ({ plantilla: restaurada }) => {
        this.aplicarDetalle(restaurada);
        this.guardandoPlantilla.set(false);
        this.aviso.set(`La versión ${version.numero} se cargó como nuevo borrador. Revísala y publícala.`);
        this.cargarResumenesPlantillas();
      },
      error: (error: HttpErrorResponse) => this.fallarPlantilla(error, 'No se pudo restaurar la versión.'),
    });
  }

  // Control de perfiles de candidato

  protected editarPerfil(candidato: RegistroCandidatoSeleccion): void {
    if (candidato.id === null) return;
    this.limpiarMensajes();
    this.cancelarReintento();
    this.editandoPerfilId.set(candidato.id);
    this.perfilEdicion.set({
      nombres: candidato.nombres ?? '',
      apellidos: candidato.apellidos ?? '',
      fecha_nacimiento: candidato.fecha_nacimiento ?? '',
      puesto_id: Number(candidato.puesto_id ?? 0),
      curriculum: null,
    });
  }

  protected cancelarEdicionPerfil(): void {
    this.editandoPerfilId.set(null);
  }

  protected actualizarPerfilEdicion(campo: 'nombres' | 'apellidos' | 'fecha_nacimiento' | 'puesto_id', event: Event): void {
    const valor = campo === 'puesto_id' ? Number(this.valorTexto(event)) : this.valorTexto(event);
    this.perfilEdicion.update((perfil) => ({ ...perfil, [campo]: valor }));
  }

  protected seleccionarCurriculumAdmin(event: Event): void {
    const archivo = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.perfilEdicion.update((perfil) => ({ ...perfil, curriculum: archivo }));
  }

  protected guardarPerfil(): void {
    const candidatoId = this.editandoPerfilId();
    const perfil = this.perfilEdicion();
    if (candidatoId === null) return;
    if (!perfil.nombres.trim() || !perfil.apellidos.trim() || !perfil.fecha_nacimiento || !perfil.puesto_id) {
      this.error.set('Completa nombres, apellidos, fecha de nacimiento y puesto antes de guardar.');
      return;
    }
    if (perfil.curriculum && (perfil.curriculum.type !== 'application/pdf' || perfil.curriculum.size > 5 * 1024 * 1024)) {
      this.error.set('El currículum debe ser un PDF de máximo 5 MB.');
      return;
    }
    this.limpiarMensajes();
    this.guardando.set(true);
    this.servicio.actualizarPerfilCandidato(candidatoId, perfil).subscribe({
      next: () => {
        this.aviso.set('Perfil del candidato actualizado.');
        this.guardando.set(false);
        this.editandoPerfilId.set(null);
        this.cargarCandidatos();
        this.cargarResultados();
      },
      error: (error: HttpErrorResponse) => this.fallar(error, 'No se pudo actualizar el perfil.'),
    });
  }

  protected cambiarActivoCuenta(candidato: RegistroCandidatoSeleccion): void {
    if (candidato.acceso_id === undefined) return;
    const activar = !(candidato.activo ?? true);
    const nombre = candidato.nombres ? `${candidato.nombres} ${candidato.apellidos}` : candidato.usuario;
    const accion = activar ? 'reactivar' : 'dar de baja';
    if (!window.confirm(`¿Deseas ${accion} la cuenta de ${nombre}? El historial se conserva.`)) return;
    this.limpiarMensajes();
    this.guardando.set(true);
    this.servicio.cambiarActivoCuenta(candidato.acceso_id, activar).subscribe({
      next: ({ mensaje }) => {
        this.aviso.set(mensaje);
        this.guardando.set(false);
        this.cargarCandidatos();
      },
      error: (error: HttpErrorResponse) => this.fallar(error, 'No se pudo cambiar el estado de la cuenta.'),
    });
  }

  protected eliminarCuenta(candidato: RegistroCandidatoSeleccion): void {
    if (candidato.acceso_id === undefined) return;
    const nombre = candidato.nombres ? `${candidato.nombres} ${candidato.apellidos}` : candidato.usuario;
    if (!window.confirm(`¿Eliminar definitivamente la cuenta de ${nombre}? Solo se permite si no tiene intentos ni resultados.`)) return;
    this.limpiarMensajes();
    this.guardando.set(true);
    this.servicio.eliminarCuenta(candidato.acceso_id).subscribe({
      next: ({ mensaje }) => {
        this.aviso.set(mensaje);
        this.guardando.set(false);
        this.cargarCandidatos();
      },
      error: (error: HttpErrorResponse) => this.fallar(error, 'No se pudo eliminar la cuenta.'),
    });
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
        this.cargarResumenesPlantillas();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudieron cargar las pruebas de selección.');
        this.cargando.set(false);
      },
    });
  }

  private cargarResumenesPlantillas(): void {
    this.servicio.listarPlantillasAdmin().subscribe({
      next: ({ plantillas }) => this.resumenesPlantillas.set(plantillas),
      error: () => this.resumenesPlantillas.set([]),
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

  private aplicarDetalle(plantilla: DetallePlantillaSeleccion): void {
    this.detallePlantilla.set(plantilla);
    const version = [...plantilla.versiones].sort((a, b) => b.numero - a.numero)[0] ?? null;
    this.definicionEditada.set(version ? this.clonar(version.definicion) : null);
    this.notasVersion.set(version?.notas ?? '');
  }

  private validarDefinicion(definicion: PlantillaEvaluacionSeleccion): string[] {
    const errores: string[] = [];
    if (!definicion.titulo.trim()) errores.push('Escribe el título de la prueba.');
    if (!Number.isFinite(definicion.tiempo_total_minutos) || definicion.tiempo_total_minutos <= 0) {
      errores.push('El tiempo total debe ser mayor que cero.');
    }
    if (!Number.isFinite(definicion.puntaje_total) || definicion.puntaje_total <= 0) {
      errores.push('El puntaje total debe ser mayor que cero.');
    }

    const umbrales = Object.values(definicion.umbrales);
    if (umbrales.some((valor) => !Number.isFinite(valor) || valor < 0 || valor > definicion.puntaje_total)) {
      errores.push('Todos los criterios de decisión deben estar entre 0 y el puntaje total.');
    }
    if (definicion.umbrales.recomendable < definicion.umbrales.revision_adicional) {
      errores.push('El puntaje recomendable no puede ser menor que el de revisión adicional.');
    }

    const idsSeccion = ['aptitudes', 'conocimientos', 'practica', 'valores'];
    if (definicion.secciones.length !== idsSeccion.length
      || idsSeccion.some((id) => !definicion.secciones.some((seccion) => seccion.id === id))) {
      errores.push('La prueba debe conservar sus cuatro secciones: Aptitudes, Conocimientos, Práctica y Valores.');
    }
    definicion.secciones.forEach((seccion) => {
      const nombre = seccion.nombre || seccion.id;
      if (!seccion.nombre.trim()) errores.push(`${nombre}: escribe el nombre de la sección.`);
      if (!seccion.items.length) errores.push(`${nombre}: agrega al menos una pregunta.`);
      seccion.items.forEach((item, indice) => {
        const referencia = `${nombre}, pregunta ${indice + 1}`;
        if (!item.enunciado.trim()) errores.push(`${referencia}: escribe el enunciado.`);
        const opciones = item.opciones ?? [];
        if (opciones.length < 2) errores.push(`${referencia}: agrega al menos dos opciones.`);
        if (opciones.filter((opcion) => opcion.correcta).length !== 1) {
          errores.push(`${referencia}: marca una sola respuesta correcta.`);
        }
        opciones.forEach((opcion) => {
          if (!opcion.texto.trim()) errores.push(`${referencia}: completa el texto de cada opción.`);
          if (!Number.isFinite(opcion.puntos) || opcion.puntos < 0) {
            errores.push(`${referencia}: los puntos de las opciones no pueden ser negativos.`);
          }
        });
        item.rubrica.forEach((criterio) => {
          if (!criterio.criterio.trim()) errores.push(`${referencia}: completa los criterios de calificación.`);
          if (!Number.isFinite(criterio.puntos) || criterio.puntos < 0) {
            errores.push(`${referencia}: los puntos de la rúbrica no pueden ser negativos.`);
          }
        });
      });
    });
    return [...new Set(errores)];
  }

  private mutarDefinicion(mutador: (definicion: PlantillaEvaluacionSeleccion) => void): void {
    const actual = this.definicionEditada();
    if (!actual) return;
    const copia = this.clonar(actual);
    mutador(copia);
    this.definicionEditada.set(copia);
  }

  private clonar<T>(valor: T): T {
    return JSON.parse(JSON.stringify(valor)) as T;
  }

  private valorTexto(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
  }

  private limpiarMensajes(): void {
    this.error.set('');
    this.aviso.set('');
  }

  private fallar(error: HttpErrorResponse, mensaje: string): void {
    this.error.set(error.error?.mensaje || mensaje);
    this.guardando.set(false);
    this.guardandoPlantilla.set(false);
  }

  private fallarPlantilla(error: HttpErrorResponse, mensaje: string): void {
    this.error.set(error.error?.mensaje || mensaje);
    this.guardandoPlantilla.set(false);
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  CalificacionesGenerales,
  CalificacionesJefatura,
  DatosEvaluacion,
  EmpleadoEvaluacion,
  Evaluacion,
  EvaluacionesService,
} from '../../services/evaluaciones.service';
import { AuthService } from '../../services/auth.service';

type CriterioGeneral = {
  clave: keyof CalificacionesGenerales;
  nombre: string;
  descripcion: string;
};

type CriterioJefatura = {
  clave: keyof CalificacionesJefatura;
  nombre: string;
  descripcion: string;
};

type ClaveObservacion = keyof CalificacionesGenerales | keyof CalificacionesJefatura;
type Observaciones = Record<ClaveObservacion, string>;

const CRITERIOS_GENERALES: CriterioGeneral[] = [
  { clave: 'presentacion', nombre: 'Presentación', descripcion: 'Apariencia personal, orden e higiene profesional.' },
  { clave: 'desempeno', nombre: 'Desempeño del trabajo', descripcion: 'Eficiencia, efectividad y cumplimiento de tareas asignadas.' },
  { clave: 'atencion_cliente', nombre: 'Información hacia el cliente', descripcion: 'Comunicación, trato, solución de dudas y atención al cliente.' },
  { clave: 'puntualidad', nombre: 'Puntualidad', descripcion: 'Asistencia y cumplimiento estricto de horarios.' },
  { clave: 'conocimientos', nombre: 'Conocimientos', descripcion: 'Dominio técnico y aptitudes propias del puesto.' },
];

const CRITERIOS_JEFATURA: CriterioJefatura[] = [
  { clave: 'supervision_operaciones', nombre: 'Supervisión de operaciones', descripcion: 'Programación y ejecución del mantenimiento preventivo y correctivo en básculas, sistemas de pesaje e instrumental industrial.' },
  { clave: 'gestion_liderazgo_campo', nombre: 'Gestión y liderazgo de campo', descripcion: 'Asignación de rutas y órdenes de trabajo, y supervisión del equipo técnico y auxiliar.' },
  { clave: 'control_calidad_calibracion', nombre: 'Control de calidad y calibración', descripcion: 'Verificación de calibraciones, precisión e informes técnicos.' },
  { clave: 'gestion_recursos_inventario', nombre: 'Gestión de recursos e inventario', descripcion: 'Control de herramientas, repuestos e insumos, y optimización de tiempos de respuesta.' },
  { clave: 'atencion_tecnica_cliente', nombre: 'Atención técnica al cliente', descripcion: 'Resolución de fallas críticas e imprevistos en las instalaciones del cliente.' },
  { clave: 'liderazgo_personal', nombre: 'Liderazgo y manejo de personal', descripcion: 'Capacidad para dirigir, motivar y gestionar conflictos operativos.' },
  { clave: 'toma_decisiones_presion', nombre: 'Toma de decisiones bajo presión', descripcion: 'Resolución ante emergencias técnicas o paros de planta de clientes.' },
  { clave: 'pensamiento_analitico', nombre: 'Pensamiento analítico y diagnóstico', descripcion: 'Detección lógica del origen de fallas mecánicas, electrónicas y de software.' },
  { clave: 'organizacion_planificacion', nombre: 'Organización y planificación', descripcion: 'Control eficaz de cronogramas, logística y recursos técnicos.' },
];

@Component({
  selector: 'app-evaluaciones',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './evaluaciones.component.html',
})
export class EvaluacionesComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly evaluacionesService = inject(EvaluacionesService);
  private readonly auth = inject(AuthService);

  protected readonly usuario = this.auth.getUsuario();
  protected readonly escala = [1, 2, 3, 4, 5];
  protected readonly criteriosGenerales = CRITERIOS_GENERALES;
  protected readonly criteriosJefatura = CRITERIOS_JEFATURA;
  protected readonly empleados = signal<EmpleadoEvaluacion[]>([]);
  protected readonly evaluaciones = signal<Evaluacion[]>([]);
  protected readonly evaluacionDetalle = signal<Evaluacion | null>(null);
  protected readonly empleadoSeleccionado = signal<EmpleadoEvaluacion | null>(null);
  protected readonly cargandoEmpleados = signal(false);
  protected readonly cargandoEvaluaciones = signal(false);
  protected readonly guardando = signal(false);
  protected readonly aviso = signal<{ tipo: 'success' | 'error'; texto: string } | null>(null);

  protected readonly formulario = this.formBuilder.nonNullable.group({
    empleado_id: ['', Validators.required],
    fecha_evaluacion: [this.fechaHoy(), Validators.required],
    periodo: [this.periodoActual(), [Validators.required, Validators.maxLength(100)]],
    calificaciones: this.formBuilder.nonNullable.group({
      presentacion: [0, [Validators.min(1), Validators.max(5)]],
      desempeno: [0, [Validators.min(1), Validators.max(5)]],
      atencion_cliente: [0, [Validators.min(1), Validators.max(5)]],
      puntualidad: [0, [Validators.min(1), Validators.max(5)]],
      conocimientos: [0, [Validators.min(1), Validators.max(5)]],
    }),
    especializada: this.formBuilder.nonNullable.group({
      supervision_operaciones: [0, [Validators.min(1), Validators.max(5)]],
      gestion_liderazgo_campo: [0, [Validators.min(1), Validators.max(5)]],
      control_calidad_calibracion: [0, [Validators.min(1), Validators.max(5)]],
      gestion_recursos_inventario: [0, [Validators.min(1), Validators.max(5)]],
      atencion_tecnica_cliente: [0, [Validators.min(1), Validators.max(5)]],
      liderazgo_personal: [0, [Validators.min(1), Validators.max(5)]],
      toma_decisiones_presion: [0, [Validators.min(1), Validators.max(5)]],
      pensamiento_analitico: [0, [Validators.min(1), Validators.max(5)]],
      organizacion_planificacion: [0, [Validators.min(1), Validators.max(5)]],
    }),
    observaciones: this.formBuilder.nonNullable.group({
      presentacion: ['', Validators.maxLength(1000)],
      desempeno: ['', Validators.maxLength(1000)],
      atencion_cliente: ['', Validators.maxLength(1000)],
      puntualidad: ['', Validators.maxLength(1000)],
      conocimientos: ['', Validators.maxLength(1000)],
      supervision_operaciones: ['', Validators.maxLength(1000)],
      gestion_liderazgo_campo: ['', Validators.maxLength(1000)],
      control_calidad_calibracion: ['', Validators.maxLength(1000)],
      gestion_recursos_inventario: ['', Validators.maxLength(1000)],
      atencion_tecnica_cliente: ['', Validators.maxLength(1000)],
      liderazgo_personal: ['', Validators.maxLength(1000)],
      toma_decisiones_presion: ['', Validators.maxLength(1000)],
      pensamiento_analitico: ['', Validators.maxLength(1000)],
      organizacion_planificacion: ['', Validators.maxLength(1000)],
    }),
    comentarios: ['', Validators.maxLength(5000)],
  });

  constructor() {
    this.formulario.controls.especializada.disable();
  }

  ngOnInit(): void {
    this.cargarEmpleados();
    this.cargarEvaluaciones();
  }

  protected cambiarEmpleado(): void {
    const empleado = this.empleados().find(
      (opcion) => String(opcion.id) === this.formulario.controls.empleado_id.value,
    ) ?? null;
    this.empleadoSeleccionado.set(empleado);
    this.formulario.controls.calificaciones.reset({
      presentacion: 0,
      desempeno: 0,
      atencion_cliente: 0,
      puntualidad: 0,
      conocimientos: 0,
    });
    this.formulario.controls.especializada.reset({
      supervision_operaciones: 0,
      gestion_liderazgo_campo: 0,
      control_calidad_calibracion: 0,
      gestion_recursos_inventario: 0,
      atencion_tecnica_cliente: 0,
      liderazgo_personal: 0,
      toma_decisiones_presion: 0,
      pensamiento_analitico: 0,
      organizacion_planificacion: 0,
    });
    this.formulario.controls.observaciones.reset(this.observacionesVacias());

    if (empleado?.codigo_empleado === 'SUR-JM-005') {
      this.formulario.controls.especializada.enable();
    } else {
      this.formulario.controls.especializada.disable();
    }

    this.evaluacionDetalle.set(null);
    this.cargarEvaluaciones(empleado?.id);
  }

  protected guardar(): void {
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid || this.guardando()) return;

    const value = this.formulario.getRawValue();
    const empleado = this.empleadoSeleccionado();
    const datos: DatosEvaluacion = {
      empleado_id: Number(value.empleado_id),
      fecha_evaluacion: value.fecha_evaluacion,
      periodo: value.periodo.trim(),
      calificaciones: value.calificaciones,
      comentarios: value.comentarios.trim(),
      observaciones: this.obtenerObservaciones(value.observaciones, empleado?.codigo_empleado === 'SUR-JM-005'),
    };
    if (empleado?.codigo_empleado === 'SUR-JM-005') {
      datos.especializada = value.especializada;
    }

    this.guardando.set(true);
    this.aviso.set(null);
    this.evaluacionesService.crear(datos).subscribe({
      next: ({ mensaje }) => {
        this.aviso.set({ tipo: 'success', texto: mensaje });
        this.formulario.reset({
          empleado_id: '',
          fecha_evaluacion: this.fechaHoy(),
          periodo: this.periodoActual(),
          calificaciones: {
            presentacion: 0,
            desempeno: 0,
            atencion_cliente: 0,
            puntualidad: 0,
            conocimientos: 0,
          },
          especializada: {
            supervision_operaciones: 0,
            gestion_liderazgo_campo: 0,
            control_calidad_calibracion: 0,
            gestion_recursos_inventario: 0,
            atencion_tecnica_cliente: 0,
            liderazgo_personal: 0,
            toma_decisiones_presion: 0,
            pensamiento_analitico: 0,
            organizacion_planificacion: 0,
          },
          observaciones: this.observacionesVacias(),
          comentarios: '',
        });
        this.formulario.controls.especializada.disable();
        this.empleadoSeleccionado.set(null);
        this.evaluacionDetalle.set(null);
        this.guardando.set(false);
        this.cargarEvaluaciones();
      },
      error: (error: HttpErrorResponse) => {
        this.aviso.set({ tipo: 'error', texto: error.error?.mensaje || 'No se pudo guardar la evaluación.' });
        this.guardando.set(false);
      },
    });
  }

  protected verDetalle(id: number): void {
    this.evaluacionesService.obtener(id).subscribe({
      next: ({ evaluacion }) => this.evaluacionDetalle.set(evaluacion),
      error: (error: HttpErrorResponse) => {
        this.aviso.set({ tipo: 'error', texto: error.error?.mensaje || 'No se pudo cargar el detalle.' });
      },
    });
  }

  protected calificacionGeneral(evaluacion: Evaluacion, campo: keyof CalificacionesGenerales): number {
    return evaluacion[campo];
  }

  protected calificacionJefatura(evaluacion: Evaluacion, campo: keyof CalificacionesJefatura): number | null {
    return evaluacion[campo] ?? null;
  }

  protected observacion(evaluacion: Evaluacion, campo: ClaveObservacion): string {
    return evaluacion.observaciones?.[campo] ?? '';
  }

  protected formatoFecha(fecha: string): string {
    return new Date(`${fecha.slice(0, 10)}T12:00:00`).toLocaleDateString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'America/Guatemala',
    });
  }

  protected salir(): void {
    this.auth.logout();
  }

  private cargarEmpleados(): void {
    this.cargandoEmpleados.set(true);
    this.evaluacionesService.obtenerEmpleados().subscribe({
      next: ({ empleados }) => {
        this.empleados.set(empleados);
        this.cargandoEmpleados.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.aviso.set({ tipo: 'error', texto: error.error?.mensaje || 'No se pudo cargar la nómina.' });
        this.cargandoEmpleados.set(false);
      },
    });
  }

  private cargarEvaluaciones(empleadoId?: number): void {
    this.cargandoEvaluaciones.set(true);
    this.evaluacionesService.listar(empleadoId).subscribe({
      next: ({ evaluaciones }) => {
        this.evaluaciones.set(evaluaciones);
        this.cargandoEvaluaciones.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.aviso.set({ tipo: 'error', texto: error.error?.mensaje || 'No se pudieron cargar las evaluaciones.' });
        this.cargandoEvaluaciones.set(false);
      },
    });
  }

  private fechaHoy(): string {
    const ahora = new Date();
    return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  }

  private periodoActual(): string {
    return new Date().toLocaleDateString('es-GT', { month: 'long', year: 'numeric' });
  }

  private obtenerObservaciones(observaciones: Observaciones, incluirEspecializadas: boolean): Partial<Observaciones> {
    const campos: ClaveObservacion[] = incluirEspecializadas
      ? [...CRITERIOS_GENERALES, ...CRITERIOS_JEFATURA].map((criterio) => criterio.clave)
      : CRITERIOS_GENERALES.map((criterio) => criterio.clave);
    return Object.fromEntries(
      campos
        .map((campo) => [campo, observaciones[campo].trim()] as const)
        .filter(([, observacion]) => observacion.length > 0),
    );
  }

  private observacionesVacias(): Observaciones {
    return {
      presentacion: '',
      desempeno: '',
      atencion_cliente: '',
      puntualidad: '',
      conocimientos: '',
      supervision_operaciones: '',
      gestion_liderazgo_campo: '',
      control_calidad_calibracion: '',
      gestion_recursos_inventario: '',
      atencion_tecnica_cliente: '',
      liderazgo_personal: '',
      toma_decisiones_presion: '',
      pensamiento_analitico: '',
      organizacion_planificacion: '',
    };
  }
}

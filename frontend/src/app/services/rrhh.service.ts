import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Marcacion } from './asistencia.service';

export interface FiltrosAsistencia {
  busqueda?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  empleado_id?: number;
}

export interface DatosCorreccion {
  marcacion_id: number;
  motivo: string;
  hora_entrada?: string;
  hora_salida?: string;
  horas_extras?: number;
  justificacion_horas_extras?: string | null;
}

export interface DatosIncidencia {
  empleado_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  tipo: 'permiso_oficial' | 'ausencia_justificada' | 'suspension' | 'vacaciones';
  motivo: string;
}

export interface EmpleadoRrhh {
  id: number;
  codigo_empleado: string;
  nombre: string;
}

export interface EmpleadoAdministracion extends EmpleadoRrhh {
  activo: number | boolean;
  nombre_puesto: string;
  puesto_id: number;
  rol: string;
  ficha_completa?: boolean;
  fecha_nacimiento?: string | null;
  fecha_ingreso?: string | null;
}

export interface FichaEmpleado {
  nombre_completo: string | null;
  dpi: string | null;
  fecha_nacimiento: string | null;
  correo: string | null;
  telefono: string | null;
  fecha_ingreso: string | null;
  cv_nombre: string | null;
  cv_actualizado_en: string | null;
  actualizado_en: string | null;
}

export type DatosFicha = Pick<
  FichaEmpleado,
  'nombre_completo' | 'dpi' | 'fecha_nacimiento' | 'correo' | 'telefono' | 'fecha_ingreso'
>;

export interface RegistroAuditoriaFicha {
  id: number;
  accion: 'ficha' | 'cv_subida' | 'cv_descarga';
  campos: string | null;
  creado_en: string;
  usuario: string | null;
}

export interface IncidenciaRrhh {
  id: number;
  empleado_id: number;
  codigo_empleado?: string;
  nombre?: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo: 'permiso_oficial' | 'ausencia_justificada' | 'suspension' | 'vacaciones';
  motivo: string;
  registrado_por: number;
}

export interface DetalleEmpleado {
  empleado: EmpleadoAdministracion;
  ficha: FichaEmpleado;
  indicadores: {
    dias_registrados_30d: number;
    atrasos_30d: number;
    puntualidad_30d: number;
    horas_extras_30d: number;
  };
  asistencias: Marcacion[];
  evaluaciones: EvaluacionEmpleado[];
  conocimiento: ConocimientoEmpleado[];
  incidencias: IncidenciaRrhh[];
}

export interface EvaluacionEmpleado {
  id: number;
  fecha_evaluacion: string;
  periodo: string;
  presentacion: number;
  desempeno: number;
  atencion_cliente: number;
  puntualidad: number;
  conocimientos: number;
  promedio_general: number;
  comentarios?: string | null;
  observaciones?: Record<string, string> | null;
  supervision_operaciones?: number | null;
  gestion_liderazgo_campo?: number | null;
  control_calidad_calibracion?: number | null;
  gestion_recursos_inventario?: number | null;
  atencion_tecnica_cliente?: number | null;
  liderazgo_personal?: number | null;
  toma_decisiones_presion?: number | null;
  pensamiento_analitico?: number | null;
  organizacion_planificacion?: number | null;
}

export interface ConocimientoEmpleado {
  id: number;
  periodo: string;
  estado: 'pendiente' | 'completada';
  total_preguntas: number;
  respuestas_correctas: number | null;
  puntos_obtenidos: number | null;
  puntos_totales: number | null;
  porcentaje: number | null;
  resultado: 'Aprobado' | 'Requiere refuerzo' | null;
  fecha_realizacion: string | null;
  nombre_puesto: string;
  departamento: string;
}

export interface Puesto {
  id: number;
  codigo_abreviatura: string;
  nombre_puesto: string;
  departamento?: string;
  frecuencia_evaluacion?: 'mensual' | 'quincenal' | 'semanal';
  es_admin?: number | boolean;
}

export interface DatosPuesto {
  codigo_abreviatura: string;
  nombre_puesto: string;
  departamento: string;
  frecuencia_evaluacion: 'mensual' | 'quincenal' | 'semanal';
  es_admin: boolean;
  contrasena_admin: string;
}

export interface DatosEmpleado {
  nombre: string;
  puesto_id: number;
  password: string;
  contrasena_admin: string;
}

export interface DatosEdicionEmpleado {
  nombre: string;
  puesto_id: number;
  activo: boolean;
  password?: string;
  contrasena_admin: string;
}

@Injectable({ providedIn: 'root' })
export class RrhhService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/rrhh`;

  obtenerAsistencias(filtros: FiltrosAsistencia): Observable<{ asistencias: Marcacion[] }> {
    let params = new HttpParams();
    if (filtros.busqueda) params = params.set('codigo_empleado', filtros.busqueda);
    if (filtros.fecha_inicio) params = params.set('fecha_inicio', filtros.fecha_inicio);
    if (filtros.fecha_fin) params = params.set('fecha_fin', filtros.fecha_fin);
    if (filtros.empleado_id !== undefined) params = params.set('empleado_id', filtros.empleado_id);
    return this.http.get<{ asistencias: Marcacion[] }>(`${this.baseUrl}/asistencias`, { params });
  }

  obtenerHorasExtras(estado: 'pendiente' | 'aprobada' | 'rechazada' | 'todas' = 'pendiente'): Observable<{ horas_extras: Marcacion[] }> {
    return this.http.get<{ horas_extras: Marcacion[] }>(`${this.baseUrl}/horas-extras`, {
      params: new HttpParams().set('estado', estado),
    });
  }

  aprobarHorasExtras(id: number): Observable<{ mensaje: string }> {
    return this.http.put<{ mensaje: string }>(`${this.baseUrl}/horas-extras/${id}/aprobar`, {});
  }

  rechazarHorasExtras(id: number, motivo: string): Observable<{ mensaje: string }> {
    return this.http.put<{ mensaje: string }>(`${this.baseUrl}/horas-extras/${id}/rechazar`, { motivo });
  }

  obtenerEmpleados(): Observable<{ empleados: EmpleadoRrhh[] }> {
    return this.http.get<{ empleados: EmpleadoRrhh[] }>(`${this.baseUrl}/empleados`);
  }

  obtenerEmpleadosAdministracion(): Observable<{ empleados: EmpleadoAdministracion[] }> {
    return this.http.get<{ empleados: EmpleadoAdministracion[] }>(`${this.baseUrl}/administracion/empleados`);
  }

  registrarPuesto(datos: DatosPuesto): Observable<{ mensaje: string; puesto: Puesto }> {
    return this.http.post<{ mensaje: string; puesto: Puesto }>(
      `${this.baseUrl}/administracion/puestos`, datos
    );
  }

  actualizarPuesto(id: number, datos: DatosPuesto): Observable<{ mensaje: string; puesto: Puesto }> {
    return this.http.put<{ mensaje: string; puesto: Puesto }>(
      `${this.baseUrl}/administracion/puestos/${id}`, datos
    );
  }

  obtenerDetalleEmpleado(id: number): Observable<DetalleEmpleado> {
    return this.http.get<DetalleEmpleado>(`${this.baseUrl}/administracion/empleados/${id}/detalle`);
  }

  guardarFichaEmpleado(id: number, datos: DatosFicha): Observable<{ mensaje: string; ficha: DatosFicha }> {
    return this.http.put<{ mensaje: string; ficha: DatosFicha }>(
      `${this.baseUrl}/administracion/empleados/${id}/ficha`, datos
    );
  }

  subirCurriculumEmpleado(id: number, archivo: File): Observable<{ mensaje: string; cv_nombre: string }> {
    const datos = new FormData();
    datos.append('curriculum', archivo);
    return this.http.put<{ mensaje: string; cv_nombre: string }>(
      `${this.baseUrl}/administracion/empleados/${id}/curriculum`, datos
    );
  }

  descargarCurriculumEmpleado(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/administracion/empleados/${id}/curriculum`, {
      responseType: 'blob',
    });
  }

  obtenerAuditoriaFicha(id: number): Observable<{ registros: RegistroAuditoriaFicha[] }> {
    return this.http.get<{ registros: RegistroAuditoriaFicha[] }>(
      `${this.baseUrl}/administracion/empleados/${id}/ficha/auditoria`
    );
  }

  obtenerIncidencias(empleadoId: number): Observable<{ incidencias: IncidenciaRrhh[] }> {
    return this.http.get<{ incidencias: IncidenciaRrhh[] }>(`${this.baseUrl}/incidencias`, {
      params: new HttpParams().set('empleado_id', empleadoId),
    });
  }

  obtenerPuestos(): Observable<{ puestos: Puesto[] }> {
    return this.http.get<{ puestos: Puesto[] }>(`${this.baseUrl}/administracion/puestos`);
  }

  registrarEmpleado(datos: DatosEmpleado): Observable<{
    mensaje: string;
    empleado: { id: number; codigo_empleado: string };
  }> {
    return this.http.post<{
      mensaje: string;
      empleado: { id: number; codigo_empleado: string };
    }>(`${this.baseUrl}/administracion/empleados`, datos);
  }

  actualizarEmpleado(id: number, datos: DatosEdicionEmpleado): Observable<{
    mensaje: string;
    empleado: { id: number; codigo_empleado: string };
  }> {
    return this.http.put<{
      mensaje: string;
      empleado: { id: number; codigo_empleado: string };
    }>(`${this.baseUrl}/administracion/empleados/${id}`, datos);
  }

  eliminarEmpleado(id: number, contrasena_admin: string): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.baseUrl}/administracion/empleados/${id}`, {
      body: { contrasena_admin },
    });
  }

  corregirMarcacion(datos: DatosCorreccion): Observable<{ mensaje: string }> {
    return this.http.put<{ mensaje: string }>(`${this.baseUrl}/corregir`, datos);
  }

  registrarIncidencia(datos: DatosIncidencia): Observable<{ mensaje: string; id: number }> {
    return this.http.post<{ mensaje: string; id: number }>(`${this.baseUrl}/incidencias`, datos);
  }

  descargarExcel(filtros: FiltrosAsistencia): Observable<Blob> {
    let params = new HttpParams();
    if (filtros.busqueda) params = params.set('codigo_empleado', filtros.busqueda);
    if (filtros.fecha_inicio) params = params.set('fecha_inicio', filtros.fecha_inicio);
    if (filtros.fecha_fin) params = params.set('fecha_fin', filtros.fecha_fin);
    if (filtros.empleado_id !== undefined) params = params.set('empleado_id', filtros.empleado_id);
    return this.http.get(`${this.baseUrl}/exportar-excel`, { params, responseType: 'blob' });
  }
}
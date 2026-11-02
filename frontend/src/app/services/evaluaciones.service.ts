import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EmpleadoEvaluacion {
  id: number;
  codigo_empleado: string;
  nombre: string;
  nombre_puesto: string;
  dias_registrados_30d: number;
  atrasos_30d: number;
  puntualidad_30d: number;
}

export interface CalificacionesGenerales {
  presentacion: number;
  desempeno: number;
  atencion_cliente: number;
  puntualidad: number;
  conocimientos: number;
}

export interface CalificacionesJefatura {
  supervision_operaciones: number;
  gestion_liderazgo_campo: number;
  control_calidad_calibracion: number;
  gestion_recursos_inventario: number;
  atencion_tecnica_cliente: number;
  liderazgo_personal: number;
  toma_decisiones_presion: number;
  pensamiento_analitico: number;
  organizacion_planificacion: number;
}

export interface DatosEvaluacion {
  empleado_id: number;
  fecha_evaluacion: string;
  periodo: string;
  calificaciones: CalificacionesGenerales;
  especializada?: CalificacionesJefatura;
  comentarios: string;
}

export interface Evaluacion {
  id: number;
  empleado_id: number;
  codigo_empleado: string;
  empleado: string;
  nombre_puesto: string;
  evaluador_id: number;
  fecha_evaluacion: string;
  periodo: string;
  presentacion: number;
  desempeno: number;
  atencion_cliente: number;
  puntualidad: number;
  conocimientos: number;
  promedio_general: number;
  comentarios?: string | null;
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

@Injectable({ providedIn: 'root' })
export class EvaluacionesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/evaluaciones`;

  obtenerEmpleados(): Observable<{ empleados: EmpleadoEvaluacion[] }> {
    return this.http.get<{ empleados: EmpleadoEvaluacion[] }>(`${this.baseUrl}/empleados`);
  }

  listar(empleadoId?: number): Observable<{ evaluaciones: Evaluacion[] }> {
    let params = new HttpParams();
    if (empleadoId !== undefined) params = params.set('empleado_id', empleadoId);
    return this.http.get<{ evaluaciones: Evaluacion[] }>(this.baseUrl, { params });
  }

  obtener(id: number): Observable<{ evaluacion: Evaluacion }> {
    return this.http.get<{ evaluacion: Evaluacion }>(`${this.baseUrl}/${id}`);
  }

  crear(datos: DatosEvaluacion): Observable<{ mensaje: string; id: number }> {
    return this.http.post<{ mensaje: string; id: number }>(this.baseUrl, datos);
  }
}

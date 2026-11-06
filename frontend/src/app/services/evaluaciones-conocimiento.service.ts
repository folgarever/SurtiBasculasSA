import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PreguntaConocimiento {
  id: string;
  texto: string;
  opciones: string[];
  respuesta: number | null;
  correcta?: number;
}

export interface EvaluacionConocimiento {
  id: number;
  empleado_id: number;
  codigo_empleado?: string;
  empleado?: string;
  puesto_id: number;
  nombre_puesto?: string;
  departamento?: string;
  periodo: string;
  estado: 'pendiente' | 'completada';
  total_preguntas: number;
  respuestas_correctas: number | null;
  porcentaje: number | null;
  resultado: 'Aprobado' | 'Requiere refuerzo' | null;
  fecha_realizacion: string | null;
  preguntas?: PreguntaConocimiento[];
}

export interface EmpleadoConocimiento {
  id: number;
  codigo_empleado: string;
  nombre: string;
  puesto_id: number;
  nombre_puesto: string;
  departamento: string;
}

export interface PuestoConocimiento {
  id: number;
  nombre_puesto: string;
  departamento: string;
}

@Injectable({ providedIn: 'root' })
export class EvaluacionesConocimientoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/evaluaciones-conocimiento`;

  obtenerMiEvaluacion(): Observable<{
    puesto: string;
    periodo_actual: string;
    evaluacion_actual: EvaluacionConocimiento;
    historial: EvaluacionConocimiento[];
  }> {
    return this.http.get<{
      puesto: string;
      periodo_actual: string;
      evaluacion_actual: EvaluacionConocimiento;
      historial: EvaluacionConocimiento[];
    }>(`${this.baseUrl}/mi`);
  }

  responder(respuestas: Record<string, number>): Observable<{
    mensaje: string;
    respuestas_correctas: number;
    porcentaje: number;
    resultado: string;
  }> {
    return this.http.post<{
      mensaje: string;
      respuestas_correctas: number;
      porcentaje: number;
      resultado: string;
    }>(`${this.baseUrl}/mi/responder`, { respuestas });
  }

  obtenerCatalogosAdmin(): Observable<{
    empleados: EmpleadoConocimiento[];
    puestos: PuestoConocimiento[];
    departamentos: string[];
  }> {
    return this.http.get<{
      empleados: EmpleadoConocimiento[];
      puestos: PuestoConocimiento[];
      departamentos: string[];
    }>(`${this.baseUrl}/admin/catalogos`);
  }

  listarAdmin(filtros: {
    empleado_id?: number;
    puesto_id?: number;
    departamento?: string;
  }): Observable<{ periodo_actual: string; evaluaciones: EvaluacionConocimiento[] }> {
    let params = new HttpParams();
    if (filtros.empleado_id) params = params.set('empleado_id', filtros.empleado_id);
    if (filtros.puesto_id) params = params.set('puesto_id', filtros.puesto_id);
    if (filtros.departamento) params = params.set('departamento', filtros.departamento);
    return this.http.get<{ periodo_actual: string; evaluaciones: EvaluacionConocimiento[] }>(
      `${this.baseUrl}/admin`,
      { params },
    );
  }

  obtenerDetalleAdmin(id: number): Observable<{ evaluacion: EvaluacionConocimiento }> {
    return this.http.get<{ evaluacion: EvaluacionConocimiento }>(`${this.baseUrl}/admin/${id}`);
  }
}

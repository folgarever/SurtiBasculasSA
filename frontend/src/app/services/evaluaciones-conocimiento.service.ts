import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type FrecuenciaEvaluacion = 'mensual' | 'quincenal' | 'semanal';

export function etiquetaFrecuenciaEvaluacion(frecuencia: FrecuenciaEvaluacion): string {
  return { mensual: 'Mensual', quincenal: 'Quincenal', semanal: 'Semanal' }[frecuencia];
}

export function formatoPeriodoEvaluacion(periodo: string): string {
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
    const [anio, mes] = periodo.split('-').map(Number);
    return new Date(anio, mes - 1, 1).toLocaleDateString('es-GT', {
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Guatemala',
    });
  }
  const quincenal = /^(\d{4})-(0[1-9]|1[0-2])-Q([12])$/.exec(periodo);
  if (quincenal) {
    const anio = Number(quincenal[1]);
    const mes = Number(quincenal[2]);
    const nombreMes = new Date(anio, mes - 1, 1).toLocaleDateString('es-GT', {
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Guatemala',
    });
    return `${quincenal[3] === '1' ? '1.ª' : '2.ª'} quincena de ${nombreMes}`;
  }
  const semanal = /^(\d{4})-W(\d{2})$/.exec(periodo);
  if (semanal) return `Semana ${Number(semanal[2])} de ${semanal[1]}`;
  return periodo;
}

export interface PreguntaConocimiento {
  id: string;
  texto: string;
  opciones: string[];
  respuesta: number | null;
  correcta?: number;
  puntajes_opciones?: number[];
  puntaje_maximo?: number;
}

export interface EvaluacionConocimiento {
  id: number;
  empleado_id: number;
  codigo_empleado?: string;
  empleado?: string;
  puesto_id: number;
  nombre_puesto?: string;
  departamento?: string;
  frecuencia_evaluacion?: FrecuenciaEvaluacion;
  periodo: string;
  periodo_actual?: string | null;
  estado: 'pendiente' | 'completada';
  total_preguntas: number;
  respuestas_correctas: number | null;
  puntos_obtenidos: number | null;
  puntos_totales: number | null;
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
  frecuencia_evaluacion?: FrecuenciaEvaluacion;
  periodo_actual?: string;
  periodos?: string[];
}

export interface PuestoConocimiento {
  id: number;
  nombre_puesto: string;
  departamento: string;
  frecuencia_evaluacion: FrecuenciaEvaluacion;
  periodo_actual: string;
  periodos: string[];
}

export interface FrecuenciaConocimiento {
  valor: FrecuenciaEvaluacion;
  etiqueta: string;
}

export type TipoPuntuacionOpcion = 'correcta' | 'intermedia' | 'incorrecta';

export interface PreguntaBanco {
  id: number;
  texto: string;
  opciones: OpcionBanco[];
  puntos_maximos: number;
}

export interface OpcionBanco {
  texto: string;
  puntos: number;
  tipo: TipoPuntuacionOpcion;
  porcentaje: number;
}

export interface OpcionPreguntaInput {
  texto: string;
  tipo: TipoPuntuacionOpcion;
  porcentaje: number;
}

export interface PreguntaBancoInput {
  texto: string;
  opciones: OpcionPreguntaInput[];
  puntos_maximos: number;
}

@Injectable({ providedIn: 'root' })
export class EvaluacionesConocimientoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/evaluaciones-conocimiento`;

  obtenerMiEvaluacion(): Observable<{
    puesto: string;
    frecuencia_evaluacion: FrecuenciaEvaluacion;
    periodo_actual: string;
    evaluacion_actual: EvaluacionConocimiento;
    historial: EvaluacionConocimiento[];
  }> {
    return this.http.get<{
      puesto: string;
      frecuencia_evaluacion: FrecuenciaEvaluacion;
      periodo_actual: string;
      evaluacion_actual: EvaluacionConocimiento;
      historial: EvaluacionConocimiento[];
    }>(`${this.baseUrl}/mi`);
  }

  responder(respuestas: Record<string, number>): Observable<{
    mensaje: string;
    periodo: string;
    respuestas_correctas: number;
    puntos_obtenidos: number;
    puntos_totales: number;
    porcentaje: number;
    resultado: string;
  }> {
    return this.http.post<{
      mensaje: string;
      periodo: string;
      respuestas_correctas: number;
      puntos_obtenidos: number;
      puntos_totales: number;
      porcentaje: number;
      resultado: string;
    }>(`${this.baseUrl}/mi/responder`, { respuestas });
  }

  obtenerCatalogosAdmin(): Observable<{
    empleados: EmpleadoConocimiento[];
    puestos: PuestoConocimiento[];
    departamentos: string[];
    frecuencias: FrecuenciaConocimiento[];
  }> {
    return this.http.get<{
      empleados: EmpleadoConocimiento[];
      puestos: PuestoConocimiento[];
      departamentos: string[];
      frecuencias: FrecuenciaConocimiento[];
    }>(`${this.baseUrl}/admin/catalogos`);
  }

  actualizarFrecuenciaPuestoAdmin(
    puestoId: number,
    frecuencia: FrecuenciaEvaluacion,
  ): Observable<{ mensaje: string; puesto: PuestoConocimiento }> {
    return this.http.put<{ mensaje: string; puesto: PuestoConocimiento }>(
      `${this.baseUrl}/admin/puestos/${puestoId}/frecuencia`,
      { frecuencia },
    );
  }

  listarAdmin(filtros: {
    empleado_id?: number;
    puesto_id?: number;
    departamento?: string;
  }): Observable<{
    periodo_actual: string | null;
    periodos_por_puesto: Record<string, string>;
    evaluaciones: EvaluacionConocimiento[];
  }> {
    let params = new HttpParams();
    if (filtros.empleado_id) params = params.set('empleado_id', filtros.empleado_id);
    if (filtros.puesto_id) params = params.set('puesto_id', filtros.puesto_id);
    if (filtros.departamento) params = params.set('departamento', filtros.departamento);
    return this.http.get<{
      periodo_actual: string | null;
      periodos_por_puesto: Record<string, string>;
      evaluaciones: EvaluacionConocimiento[];
    }>(`${this.baseUrl}/admin`, { params });
  }

  obtenerDetalleAdmin(id: number): Observable<{ evaluacion: EvaluacionConocimiento }> {
    return this.http.get<{ evaluacion: EvaluacionConocimiento }>(`${this.baseUrl}/admin/${id}`);
  }

  private parametroPeriodo(periodo: string): HttpParams {
    return new HttpParams().set('periodo', periodo);
  }

  obtenerBancoAdmin(puestoId: number, periodo: string): Observable<{
    periodo: string;
    preguntas: PreguntaBanco[];
  }> {
    return this.http.get<{ periodo: string; preguntas: PreguntaBanco[] }>(
      `${this.baseUrl}/admin/banco/${puestoId}/preguntas`,
      { params: this.parametroPeriodo(periodo) },
    );
  }

  obtenerCopiaBancoAdmin(puestoId: number, destino: string): Observable<{
    origen: string;
    destino: string;
    preguntas: PreguntaBanco[];
  }> {
    return this.http.get<{ origen: string; destino: string; preguntas: PreguntaBanco[] }>(
      `${this.baseUrl}/admin/banco/${puestoId}/preguntas/copiar`,
      { params: this.parametroPeriodo(destino) },
    );
  }

  copiarBancoAdmin(
    puestoId: number,
    destino: string,
    origen: string,
    preguntas: PreguntaBancoInput[],
  ): Observable<{ mensaje: string; periodo: string; origen: string; copiadas: number }> {
    return this.http.post<{ mensaje: string; periodo: string; origen: string; copiadas: number }>(
      `${this.baseUrl}/admin/banco/${puestoId}/preguntas/copiar`,
      { origen, preguntas },
      { params: this.parametroPeriodo(destino) },
    );
  }

  crearPreguntaAdmin(
    puestoId: number,
    periodo: string,
    pregunta: PreguntaBancoInput,
  ): Observable<{ mensaje: string; periodo: string }> {
    return this.http.post<{ mensaje: string; periodo: string }>(
      `${this.baseUrl}/admin/banco/${puestoId}/preguntas`,
      pregunta,
      { params: this.parametroPeriodo(periodo) },
    );
  }

  editarPreguntaAdmin(
    puestoId: number,
    periodo: string,
    preguntaId: number,
    pregunta: PreguntaBancoInput,
  ): Observable<{ mensaje: string; periodo: string }> {
    return this.http.put<{ mensaje: string; periodo: string }>(
      `${this.baseUrl}/admin/banco/${puestoId}/preguntas/${preguntaId}`,
      pregunta,
      { params: this.parametroPeriodo(periodo) },
    );
  }

  eliminarPreguntaAdmin(
    puestoId: number,
    periodo: string,
    preguntaId: number,
  ): Observable<{ mensaje: string; periodo: string }> {
    return this.http.delete<{ mensaje: string; periodo: string }>(
      `${this.baseUrl}/admin/banco/${puestoId}/preguntas/${preguntaId}`,
      { params: this.parametroPeriodo(periodo) },
    );
  }
}

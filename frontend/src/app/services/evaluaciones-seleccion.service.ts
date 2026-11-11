import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type SeccionSeleccion = 'aptitudes' | 'conocimientos' | 'practica' | 'valores';

export interface CriterioSeleccion {
  criterio: string;
  puntos: number;
}

export interface ItemPlantillaSeleccion {
  enunciado: string;
  detalle?: string;
  rubrica: CriterioSeleccion[];
}

export interface SeccionPlantillaSeleccion {
  id: SeccionSeleccion;
  nombre: string;
  tiempo_minutos: number;
  puntaje_maximo: number;
  instrucciones: string;
  items: ItemPlantillaSeleccion[];
}

export interface PlantillaEvaluacionSeleccion {
  titulo: string;
  tiempo_total_minutos: number;
  puntaje_total: number;
  umbrales: {
    recomendable: number;
    revision_adicional: number;
    minimo_practica: number;
    minimo_conocimientos: number;
    minimo_valores: number;
  };
  verificacion_en_vivo: {
    tiempo_minutos: number;
    instrucciones: string;
    actividades: Array<{ solicitud: string; respuesta_esperada: string }>;
  };
  secciones: SeccionPlantillaSeleccion[];
}

export interface PuestoPlantillaSeleccion {
  id: number;
  codigo_abreviatura: string;
  nombre_puesto: string;
  departamento: string;
  evaluacion: PlantillaEvaluacionSeleccion;
}

export interface ItemPruebaCandidato {
  enunciado: string;
  detalle?: string;
}

export interface SeccionPruebaCandidato {
  id: SeccionSeleccion;
  nombre: string;
  tiempo_minutos: number;
  instrucciones: string;
  items: ItemPruebaCandidato[];
}

export interface PuestoPruebaCandidato {
  id: number;
  nombre_puesto: string;
  evaluacion: {
    titulo: string;
    tiempo_total_minutos: number;
    secciones: SeccionPruebaCandidato[];
  };
}

export interface ResultadoSeleccion {
  id: number;
  candidato: string;
  puesto_id: number;
  nombre_puesto: string;
  fecha_evaluacion: string;
  puntaje_aptitudes: number;
  puntaje_conocimientos: number;
  puntaje_practica: number;
  puntaje_valores: number;
  puntaje_total: number;
  fecha_nacimiento: string | null;
  edad: number | null;
  discrepancia_pendiente: boolean;
  riesgo_control_pendiente: boolean;
  decision: 'recomendable' | 'revision_adicional' | 'no_demostrada';
  observaciones: string | null;
  evaluador: string;
  creado_en: string;
}

export interface ResultadoSeleccionInput {
  candidato?: string;
  candidato_id?: number;
  puesto_id: number;
  fecha_evaluacion: string;
  puntajes: Record<SeccionSeleccion, number>;
  discrepancia_pendiente: boolean;
  riesgo_control_pendiente: boolean;
  observaciones: string;
}

export interface RegistroCandidatoSeleccion {
  id: number;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  edad: number;
  puesto_id: number;
  nombre_puesto?: string;
  respuestas: Record<string, string> | null;
  estado: 'registro' | 'completada' | 'evaluada';
  creado_en?: string;
  completada_en?: string | null;
}

@Injectable({ providedIn: 'root' })
export class EvaluacionesSeleccionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/evaluaciones-seleccion`;

  obtenerPlantillas(): Observable<{ plantillas: PuestoPlantillaSeleccion[] }> {
    return this.http.get<{ plantillas: PuestoPlantillaSeleccion[] }>(`${this.baseUrl}/plantillas`);
  }

  listarResultados(puestoId?: number): Observable<{ resultados: ResultadoSeleccion[] }> {
    let params = new HttpParams();
    if (puestoId) params = params.set('puesto_id', puestoId);
    return this.http.get<{ resultados: ResultadoSeleccion[] }>(`${this.baseUrl}/resultados`, { params });
  }

  registrarResultado(
    resultado: ResultadoSeleccionInput,
  ): Observable<{ mensaje: string; resultado: { id: number; puntaje_total: number; decision: ResultadoSeleccion['decision'] } }> {
    return this.http.post<{
      mensaje: string;
      resultado: { id: number; puntaje_total: number; decision: ResultadoSeleccion['decision'] };
    }>(`${this.baseUrl}/resultados`, resultado);
  }

  obtenerPlantillasCandidato(): Observable<{ plantillas: PuestoPruebaCandidato[] }> {
    return this.http.get<{ plantillas: PuestoPruebaCandidato[] }>(`${this.baseUrl}/candidato/plantillas`);
  }

  obtenerMiRegistroCandidato(): Observable<{ candidato: RegistroCandidatoSeleccion | null }> {
    return this.http.get<{ candidato: RegistroCandidatoSeleccion | null }>(`${this.baseUrl}/candidato/mi`);
  }

  registrarCandidato(registro: {
    nombres: string;
    apellidos: string;
    fecha_nacimiento: string;
    puesto_id: number;
  }): Observable<{ candidato: RegistroCandidatoSeleccion }> {
    return this.http.post<{ candidato: RegistroCandidatoSeleccion }>(
      `${this.baseUrl}/candidato/registro`,
      registro,
    );
  }

  entregarPruebaCandidato(
    respuestas: Record<string, string>,
  ): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(
      `${this.baseUrl}/candidato/entregar`,
      { respuestas },
    );
  }

  listarCandidatosPendientes(puestoId?: number): Observable<{ candidatos: RegistroCandidatoSeleccion[] }> {
    let params = new HttpParams();
    if (puestoId) params = params.set('puesto_id', puestoId);
    return this.http.get<{ candidatos: RegistroCandidatoSeleccion[] }>(
      `${this.baseUrl}/admin/candidatos`,
      { params },
    );
  }
}

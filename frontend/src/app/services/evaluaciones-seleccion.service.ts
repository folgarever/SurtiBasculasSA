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
  opciones?: Array<{ id: string; texto: string; puntos: number; correcta?: boolean }>;
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
  opciones: Array<{ id: string; texto: string }>;
  rubrica?: CriterioSeleccion[];
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
    puntaje_total: number;
    umbrales: PlantillaEvaluacionSeleccion['umbrales'];
    secciones: Array<SeccionPruebaCandidato & { puntaje_maximo: number }>;
  };
}

export interface ResultadoSeleccion {
  id: number;
  candidato: string;
  candidato_id: number | null;
  puesto_id: number;
  nombre_puesto: string;
  fecha_evaluacion: string;
  puntaje_aptitudes: number;
  puntaje_conocimientos: number;
  puntaje_practica: number;
  puntaje_valores: number;
  puntaje_total: number;
  respuestas_correctas: number | null;
  total_preguntas: number | null;
  porcentaje_correctas: number | null;
  numero_intento: number | null;
  origen: 'automatica' | 'manual_anterior';
  estado_candidato?: RegistroCandidatoSeleccion['estado'];
  reintento_motivo?: string | null;
  fecha_nacimiento: string | null;
  edad: number | null;
  discrepancia_pendiente: boolean;
  riesgo_control_pendiente: boolean;
  decision: 'recomendable' | 'revision_adicional' | 'no_demostrada';
  observaciones: string | null;
  evaluador: string;
  creado_en: string;
}

export interface RegistroCandidatoSeleccion {
  id: number | null;
  acceso_id?: number;
  usuario?: string;
  nombres: string | null;
  apellidos: string | null;
  fecha_nacimiento: string | null;
  edad: number | null;
  puesto_id: number | null;
  nombre_puesto?: string;
  respuestas: Record<string, string> | null;
  estado: 'pendiente_perfil' | 'registro' | 'completada' | 'evaluada';
  creado_en?: string;
  completada_en?: string | null;
  curriculum_nombre?: string | null;
  puntajes_automaticos?: Record<SeccionSeleccion, number> | null;
  puntaje_total?: number | null;
  respuestas_correctas?: number | null;
  total_preguntas?: number | null;
  porcentaje_correctas?: number | null;
  numero_intento?: number | null;
  decision?: ResultadoSeleccion['decision'] | null;
}

export interface CuentaCandidato {
  usuario: string;
  password: string;
}

export interface PerfilCandidatoInput {
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  puesto_id: number;
  curriculum: File;
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

  obtenerPlantillasCandidato(): Observable<{ plantillas: PuestoPruebaCandidato[] }> {
    return this.http.get<{ plantillas: PuestoPruebaCandidato[] }>(`${this.baseUrl}/candidato/plantillas`);
  }

  obtenerMiRegistroCandidato(): Observable<{ candidato: RegistroCandidatoSeleccion | null }> {
    return this.http.get<{ candidato: RegistroCandidatoSeleccion | null }>(`${this.baseUrl}/candidato/mi`);
  }

  registrarCandidatoAdmin(puesto_id: number): Observable<{ cuenta: CuentaCandidato }> {
    return this.http.post<{ cuenta: CuentaCandidato }>(
      `${this.baseUrl}/admin/candidatos`,
      { puesto_id },
    );
  }

  registrarPerfilCandidato(perfil: PerfilCandidatoInput): Observable<{ candidato: RegistroCandidatoSeleccion }> {
    const datos = new FormData();
    datos.append('nombres', perfil.nombres);
    datos.append('apellidos', perfil.apellidos);
    datos.append('fecha_nacimiento', perfil.fecha_nacimiento);
    datos.append('puesto_id', String(perfil.puesto_id));
    datos.append('curriculum', perfil.curriculum);
    return this.http.post<{ candidato: RegistroCandidatoSeleccion }>(
      `${this.baseUrl}/candidato/perfil`,
      datos,
    );
  }

  entregarPruebaCandidato(
    respuestas: Record<string, string>,
  ): Observable<{
    mensaje: string;
    resultado: {
      numero_intento: number;
      puntajes: Record<SeccionSeleccion, number>;
      puntaje_total: number;
      respuestas_correctas: number;
      total_preguntas: number;
      porcentaje_correctas: number;
      decision: ResultadoSeleccion['decision'];
    };
  }> {
    return this.http.post<{
      mensaje: string;
      resultado: {
        numero_intento: number;
        puntajes: Record<SeccionSeleccion, number>;
        puntaje_total: number;
        respuestas_correctas: number;
        total_preguntas: number;
        porcentaje_correctas: number;
        decision: ResultadoSeleccion['decision'];
      };
    }>(
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

  obtenerCurriculum(candidatoId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/admin/candidatos/${candidatoId}/curriculum`, {
      responseType: 'blob',
    });
  }

  autorizarReintento(candidatoId: number, motivo: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(
      `${this.baseUrl}/admin/candidatos/${candidatoId}/reintentar`,
      { motivo },
    );
  }
}

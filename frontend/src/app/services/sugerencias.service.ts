import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Sugerencia {
  id: number;
  folio: string;
  titulo: string;
  descripcion: string;
  anonima: boolean;
  creado_en: string;
  respuesta: string | null;
  respondido_en: string | null;
  respondido_por: string | null;
  empleado?: string;
  codigo_empleado?: string;
}

export interface ResultadoCrearSugerencia {
  mensaje: string;
  sugerencia: { id: number; folio: string };
}

const CLAVE_RESPUESTAS_VISTAS = 'surtibasculas_sugerencias_respuestas_vistas';

export function sugerenciaRespondida(sugerencia: Sugerencia): boolean {
  return Boolean(sugerencia.respuesta || sugerencia.respondido_en);
}

export function marcadorRespuesta(sugerencia: Sugerencia): string {
  return `${sugerencia.respondido_en || ''}::${sugerencia.respuesta || ''}`;
}

export function leerRespuestasVistas(): Record<number, string> {
  try {
    const contenido = localStorage.getItem(CLAVE_RESPUESTAS_VISTAS);
    const datos = contenido ? JSON.parse(contenido) : {};
    return datos && typeof datos === 'object' && !Array.isArray(datos) ? datos : {};
  } catch {
    return {};
  }
}

export function guardarRespuestasVistas(vistas: Record<number, string>): void {
  try {
    localStorage.setItem(CLAVE_RESPUESTAS_VISTAS, JSON.stringify(vistas));
  } catch {
    // El aviso de nuevas respuestas es solo una ayuda visual; no bloquea el flujo.
  }
}

export function contarRespuestasNuevas(
  sugerencias: Sugerencia[],
  vistas: Record<number, string>
): number {
  return sugerencias.filter((sugerencia) => (
    sugerenciaRespondida(sugerencia)
    && vistas[sugerencia.id] !== marcadorRespuesta(sugerencia)
  )).length;
}

@Injectable({ providedIn: 'root' })
export class SugerenciasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/sugerencias`;

  obtenerMisSugerencias(): Observable<{ sugerencias: Sugerencia[] }> {
    return this.http.get<{ sugerencias: Sugerencia[] }>(`${this.baseUrl}/mis-sugerencias`);
  }

  crearSugerencia(datos: { titulo: string; descripcion: string; anonima: boolean }): Observable<ResultadoCrearSugerencia> {
    return this.http.post<ResultadoCrearSugerencia>(`${this.baseUrl}/mis-sugerencias`, datos);
  }

  obtenerTodas(): Observable<{ sugerencias: Sugerencia[] }> {
    return this.http.get<{ sugerencias: Sugerencia[] }>(`${this.baseUrl}/admin`);
  }

  responder(id: number, respuesta: string): Observable<{ mensaje: string }> {
    return this.http.put<{ mensaje: string }>(`${this.baseUrl}/admin/${id}/respuesta`, { respuesta });
  }
}

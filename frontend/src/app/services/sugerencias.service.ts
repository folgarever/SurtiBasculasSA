import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Sugerencia {
  id: number;
  titulo: string;
  descripcion: string;
  creado_en: string;
  respuesta: string | null;
  respondido_en: string | null;
  respondido_por: string | null;
  empleado?: string;
  codigo_empleado?: string;
}

@Injectable({ providedIn: 'root' })
export class SugerenciasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/sugerencias`;

  obtenerMisSugerencias(): Observable<{ sugerencias: Sugerencia[] }> {
    return this.http.get<{ sugerencias: Sugerencia[] }>(`${this.baseUrl}/mis-sugerencias`);
  }

  crearSugerencia(datos: { titulo: string; descripcion: string }): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${this.baseUrl}/mis-sugerencias`, datos);
  }

  obtenerTodas(): Observable<{ sugerencias: Sugerencia[] }> {
    return this.http.get<{ sugerencias: Sugerencia[] }>(`${this.baseUrl}/admin`);
  }

  responder(id: number, respuesta: string): Observable<{ mensaje: string }> {
    return this.http.put<{ mensaje: string }>(`${this.baseUrl}/admin/${id}/respuesta`, { respuesta });
  }
}

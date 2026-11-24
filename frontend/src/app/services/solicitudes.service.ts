import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type TipoSolicitudAusencia = 'vacaciones' | 'permiso';
export type EstadoSolicitudAusencia = 'pendiente' | 'aprobada' | 'rechazada';

export interface SolicitudAusencia {
  id: number;
  empleado_id?: number;
  codigo_empleado?: string;
  nombre?: string;
  tipo: TipoSolicitudAusencia;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
  estado: EstadoSolicitudAusencia;
  motivo_revision: string | null;
  creado_en: string;
  revisado_en: string | null;
  revisor?: string | null;
}

export interface DatosSolicitudAusencia {
  tipo: TipoSolicitudAusencia;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
}

@Injectable({ providedIn: 'root' })
export class SolicitudesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/solicitudes`;

  obtenerMias(): Observable<{ solicitudes: SolicitudAusencia[] }> {
    return this.http.get<{ solicitudes: SolicitudAusencia[] }>(`${this.baseUrl}/mias`);
  }

  obtenerAdministracion(): Observable<{ solicitudes: SolicitudAusencia[] }> {
    return this.http.get<{ solicitudes: SolicitudAusencia[] }>(`${this.baseUrl}/administracion`);
  }

  crear(datos: DatosSolicitudAusencia): Observable<{ mensaje: string; id: number }> {
    return this.http.post<{ mensaje: string; id: number }>(this.baseUrl, datos);
  }

  aprobar(id: number): Observable<{ mensaje: string; estado: 'aprobada' }> {
    return this.http.put<{ mensaje: string; estado: 'aprobada' }>(`${this.baseUrl}/${id}/aprobar`, {});
  }

  rechazar(id: number, motivo: string): Observable<{ mensaje: string; estado: 'rechazada' }> {
    return this.http.put<{ mensaje: string; estado: 'rechazada' }>(
      `${this.baseUrl}/${id}/rechazar`,
      { motivo },
    );
  }
}

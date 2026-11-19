import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Marcacion {
  id: number;
  fecha: string;
  hora_entrada: string | null;
  hora_salida: string | null;
  estado_entrada: 'puntual' | 'tolerancia' | 'atraso' | null;
  estado_salida: 'normal' | 'anticipada' | null;
  horas_extras?: number;
  justificacion_horas_extras?: string | null;
  extras_estado?: 'sin_extras' | 'pendiente' | 'aprobada' | 'rechazada';
  extras_aprobado_en?: string | null;
  extras_rechazo_motivo?: string | null;
  codigo_empleado?: string;
  nombre?: string;
  nombre_puesto?: string;
  empleado_id?: number;
}

export interface ResultadoMarcacion {
  tipo: 'entrada' | 'salida';
  hora: string;
  estado: string;
  horas_extras?: number;
  justificacion_horas_extras?: string | null;
  extras_estado?: 'sin_extras' | 'pendiente';
}

@Injectable({ providedIn: 'root' })
export class AsistenciaService {
  private readonly http = inject(HttpClient);

  registrarMarcacion(justificacion?: string): Observable<ResultadoMarcacion> {
    return this.http.post<ResultadoMarcacion>(
      `${environment.apiUrl}/asistencia/marcar`,
      justificacion ? { justificacion } : {}
    );
  }

  obtenerHistorial(): Observable<{ marcaciones: Marcacion[] }> {
    return this.http.get<{ marcaciones: Marcacion[] }>(`${environment.apiUrl}/asistencia/mi-historial`);
  }
}
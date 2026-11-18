import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ResumenDashboard {
  empleados_activos: number;
  empleados_inactivos: number;
  marcaciones_hoy: number;
  empleados_presentes: number;
  llegadas_tarde_hoy: number;
  puntualidad_hoy: number;
  evaluaciones_pendientes: number;
  evaluaciones_completadas: number;
  evaluaciones_desempeno_mes: number;
  sugerencias_pendientes: number;
  sugerencias_totales: number;
  candidatos_registro: number;
  candidatos_completados: number;
  incidencias_vigentes: number;
}

export interface AsistenciaDia {
  fecha: string;
  total: number;
  atrasos: number;
}

export interface DistribucionPuesto {
  puesto: string;
  total: number;
}

export interface ActividadDashboard {
  tipo: 'sugerencia' | 'evaluacion' | 'asistencia';
  id: number;
  persona: string;
  titulo: string;
  estado: string;
  fecha: string;
}

export interface DashboardAdmin {
  actualizado_en: string;
  periodo: string;
  fecha: string;
  resumen: ResumenDashboard;
  asistencia_semanal: AsistenciaDia[];
  distribucion_puestos: DistribucionPuesto[];
  actividad_reciente: ActividadDashboard[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/dashboard`;

  obtenerResumenAdmin(): Observable<DashboardAdmin> {
    return this.http.get<DashboardAdmin>(`${this.baseUrl}/admin`);
  }
}

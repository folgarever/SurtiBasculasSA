import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Usuario {
  id: number;
  codigo_empleado: string;
  nombre: string;
  puesto: string;
  rol: string;
  rol_id: number;
  role: 'ADMIN' | 'EMPLOYEE' | 'CANDIDATE';
  sesion_seleccion_id?: string;
}

interface LoginResponse {
  token: string;
  usuario: Usuario;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenKey = 'surtibasculas_token';
  private readonly userKey = 'surtibasculas_usuario';
  private readonly legacyTokenKey = 'simet_token';
  private readonly legacyUserKey = 'simet_usuario';

  login(codigo_empleado: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, {
      codigo_empleado,
      password,
    }).pipe(tap((response) => this.guardarSesion(response.token, response.usuario)));
  }

  loginCandidato(usuario: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login-candidato`, {
      usuario,
      password,
    }).pipe(tap((response) => this.guardarSesion(response.token, response.usuario)));
  }

  private guardarSesion(token: string, usuario: Usuario): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(usuario));
    localStorage.removeItem(this.legacyTokenKey);
    localStorage.removeItem(this.legacyUserKey);
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.legacyTokenKey);
    localStorage.removeItem(this.legacyUserKey);
    void this.router.navigate(['/login']);
  }

  getToken(): string | null {
    const token = localStorage.getItem(this.tokenKey);
    if (token) return token;

    const anterior = localStorage.getItem(this.legacyTokenKey);
    if (anterior) {
      localStorage.setItem(this.tokenKey, anterior);
      localStorage.removeItem(this.legacyTokenKey);
    }
    return anterior;
  }

  getUsuario(): Usuario | null {
    let cached = localStorage.getItem(this.userKey);
    if (!cached) {
      const anterior = localStorage.getItem(this.legacyUserKey);
      if (anterior) {
        localStorage.setItem(this.userKey, anterior);
        localStorage.removeItem(this.legacyUserKey);
        cached = anterior;
      }
    }
    if (cached) {
      try {
        return JSON.parse(cached) as Usuario;
      } catch {
        localStorage.removeItem(this.userKey);
        localStorage.removeItem(this.legacyUserKey);
      }
    }
    return this.getPayload();
  }

  getPayload(): Usuario | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = token.split('.')[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      const normalized = decodeURIComponent(Array.from(decoded)
        .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''));
      return JSON.parse(normalized) as Usuario;
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
      return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  hasRrhhRole(): boolean {
    if (this.getPayload()?.role === 'ADMIN' || this.getUsuario()?.role === 'ADMIN') return true;
    const roleId = Number(this.getPayload()?.rol_id ?? this.getUsuario()?.rol_id);
    return roleId === 2 || roleId === 3;
  }

  hasAdminRole(): boolean {
    return (this.getPayload() ?? this.getUsuario())?.role === 'ADMIN';
  }

  hasEvaluationRole(): boolean {
    const usuario = this.getPayload() ?? this.getUsuario();
    return usuario?.role === 'ADMIN'
      && ['SUR-GG-001', 'SUR-AC-002'].includes(usuario.codigo_empleado);
  }

  isCandidate(): boolean {
    return (this.getPayload() ?? this.getUsuario())?.role === 'CANDIDATE';
  }
}
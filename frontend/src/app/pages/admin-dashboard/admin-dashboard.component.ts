import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideActivity,
  lucideAlertTriangle,
  lucideArrowRight,
  lucideArrowUpRight,
  lucideBuilding2,
  lucideCalendarDays,
  lucideClipboardCheck,
  lucideLightbulb,
  lucideMessageSquare,
  lucideRefreshCw,
  lucideSparkles,
  lucideTrendingUp,
  lucideUserRoundCog,
  lucideUsers,
} from '@ng-icons/lucide';
import { AppShellComponent } from '../../components/app-shell/app-shell.component';
import { NAV_ADMIN, SUGERENCIAS_ADMIN } from '../../components/app-shell/nav-items';
import { AuthService } from '../../services/auth.service';
import { ActividadDashboard, AsistenciaDia, DashboardAdmin, DashboardService } from '../../services/dashboard.service';

interface Pendiente {
  icono: string;
  etiqueta: string;
  valor: number;
  ruta: string;
  tono: 'rojo' | 'azul';
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [AppShellComponent, RouterLink, NgIcon],
  providers: [provideIcons({
    lucideActivity,
    lucideAlertTriangle,
    lucideArrowRight,
    lucideArrowUpRight,
    lucideBuilding2,
    lucideCalendarDays,
    lucideClipboardCheck,
    lucideLightbulb,
    lucideMessageSquare,
    lucideRefreshCw,
    lucideSparkles,
    lucideTrendingUp,
    lucideUserRoundCog,
    lucideUsers,
  })],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  protected readonly navItems = NAV_ADMIN;
  protected readonly bottomItems = [SUGERENCIAS_ADMIN];
  private readonly auth = inject(AuthService);
  private readonly dashboard = inject(DashboardService);

  protected readonly usuario = this.auth.getUsuario();
  protected readonly puedeEvaluar = this.auth.hasEvaluationRole();
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly datos = signal<DashboardAdmin | null>(null);
  protected readonly hoy = new Intl.DateTimeFormat('es-GT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date());
  protected readonly saludo = this.obtenerSaludo();

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.dashboard.obtenerResumenAdmin().subscribe({
      next: (respuesta) => {
        this.datos.set(respuesta);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los indicadores. Intenta nuevamente.');
        this.cargando.set(false);
      },
    });
  }

  readonly resumen = computed(() => this.datos()?.resumen ?? null);

  protected get serieAsistencia(): AsistenciaDia[] {
    const porFecha = new Map(
      (this.datos()?.asistencia_semanal ?? []).map((dia) => [dia.fecha.slice(0, 10), dia])
    );
    const hoy = new Date();

    return Array.from({ length: 7 }, (_, indice) => {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() - (6 - indice));
      const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
      return porFecha.get(clave) ?? { fecha: clave, total: 0, atrasos: 0 };
    });
  }

  protected get maximoAsistencia(): number {
    return Math.max(1, ...this.serieAsistencia.map((dia) => dia.total));
  }

  protected get maximoPuesto(): number {
    return Math.max(1, ...(this.datos()?.distribucion_puestos.map((puesto) => puesto.total) ?? []));
  }

  protected get totalSemanal(): number {
    return this.serieAsistencia.reduce((total, dia) => total + dia.total, 0);
  }

  protected get atrasosSemana(): number {
    return this.serieAsistencia.reduce((total, dia) => total + dia.atrasos, 0);
  }

  protected get puntualidadSegura(): number {
    const valor = Number(this.resumen()?.puntualidad_hoy ?? 0);
    if (!Number.isFinite(valor)) return 0;
    return Math.min(100, Math.max(0, valor));
  }

  protected get estadoPuntualidad(): string {
    const valor = this.puntualidadSegura;
    if (valor >= 90) return 'Óptima';
    if (valor >= 75) return 'Aceptable';
    return 'Requiere atención';
  }

  protected get pendientes(): Pendiente[] {
    const resumen = this.resumen();
    if (!resumen) return [];

    const items: Pendiente[] = [
      { icono: 'lucideMessageSquare', etiqueta: 'Sugerencias sin responder', valor: resumen.sugerencias_pendientes, ruta: '/admin/sugerencias', tono: 'rojo' },
      { icono: 'lucideAlertTriangle', etiqueta: 'Incidencias vigentes', valor: resumen.incidencias_vigentes, ruta: '/rrhh', tono: 'azul' },
    ];
    if (this.puedeEvaluar) {
      items.unshift(
        { icono: 'lucideClipboardCheck', etiqueta: 'Evaluaciones por periodo', valor: resumen.evaluaciones_pendientes, ruta: '/admin/evaluaciones-conocimiento', tono: 'rojo' },
        { icono: 'lucideUsers', etiqueta: 'Candidatos en registro', valor: resumen.candidatos_registro, ruta: '/admin/evaluaciones-seleccion', tono: 'azul' }
      );
    }
    return items;
  }

  protected get totalPendientes(): number {
    return this.pendientes.reduce((total, item) => total + item.valor, 0);
  }

  protected etiquetaDia(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    return DIAS[new Date(anio, mes - 1, dia).getDay()];
  }

  protected alturaBarra(total: number): number {
    return Math.max(4, Math.round((total / this.maximoAsistencia) * 100));
  }

  protected iconoActividad(actividad: ActividadDashboard): string {
    if (actividad.tipo === 'sugerencia') return 'lucideLightbulb';
    if (actividad.tipo === 'evaluacion') return 'lucideClipboardCheck';
    return 'lucideUsers';
  }

  protected fechaCorta(valor: string | null): string {
    if (!valor) return '—';
    const fecha = new Date(valor.replace(' ', 'T'));
    if (Number.isNaN(fecha.getTime())) return valor.slice(0, 10);
    return new Intl.DateTimeFormat('es-GT', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    }).format(fecha);
  }

  private obtenerSaludo(): string {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }
}

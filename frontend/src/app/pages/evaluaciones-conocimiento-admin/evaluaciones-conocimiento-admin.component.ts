import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClipboardCheck, lucideLayoutDashboard, lucideLogOut, lucideMessageSquare, lucideUserRoundCog, lucideUsers } from '@ng-icons/lucide';
import { AuthService } from '../../services/auth.service';
import {
  EmpleadoConocimiento,
  EvaluacionConocimiento,
  EvaluacionesConocimientoService,
  PuestoConocimiento,
} from '../../services/evaluaciones-conocimiento.service';

@Component({
  selector: 'app-evaluaciones-conocimiento-admin',
  standalone: true,
  imports: [RouterLink, NgIcon],
  providers: [provideIcons({ lucideClipboardCheck, lucideLayoutDashboard, lucideLogOut, lucideMessageSquare, lucideUserRoundCog, lucideUsers })],
  templateUrl: './evaluaciones-conocimiento-admin.component.html',
})
export class EvaluacionesConocimientoAdminComponent implements OnInit {
  private readonly servicio = inject(EvaluacionesConocimientoService);
  private readonly auth = inject(AuthService);

  protected readonly usuario = this.auth.getUsuario();
  protected readonly evaluaciones = signal<EvaluacionConocimiento[]>([]);
  protected readonly empleados = signal<EmpleadoConocimiento[]>([]);
  protected readonly puestos = signal<PuestoConocimiento[]>([]);
  protected readonly departamentos = signal<string[]>([]);
  protected readonly detalle = signal<EvaluacionConocimiento | null>(null);
  protected readonly periodoActual = signal('');
  protected readonly filtroEmpleado = signal('');
  protected readonly filtroPuesto = signal('');
  protected readonly filtroDepartamento = signal('');
  protected readonly cargando = signal(true);
  protected readonly cargandoDetalle = signal(false);
  protected readonly error = signal('');
  protected readonly completadasActuales = computed(
    () => this.evaluaciones().filter((item) => item.periodo === this.periodoActual() && item.estado === 'completada'),
  );
  protected readonly pendientesActuales = computed(
    () => this.evaluaciones().filter((item) => item.periodo === this.periodoActual() && item.estado === 'pendiente').length,
  );
  protected readonly cumplimientoActual = computed(() => {
    const actuales = this.evaluaciones().filter((item) => item.periodo === this.periodoActual());
    if (!actuales.length) return 0;
    return Math.round((this.completadasActuales().length / actuales.length) * 100);
  });
  protected readonly promedioActual = computed(() => {
    const completas = this.completadasActuales();
    if (!completas.length) return null;
    return Math.round(completas.reduce((total, item) => total + (item.porcentaje ?? 0), 0) / completas.length);
  });
  protected readonly totalActuales = computed(
    () => this.evaluaciones().filter((item) => item.periodo === this.periodoActual()).length,
  );
  protected readonly evolucionEmpleado = computed(() => {
    const seleccionado = this.detalle();
    if (!seleccionado) return [];
    return this.evaluaciones()
      .filter((item) => item.empleado_id === seleccionado.empleado_id && item.estado === 'completada')
      .sort((a, b) => a.periodo.localeCompare(b.periodo));
  });

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarEvaluaciones();
  }

  protected actualizarFiltro(tipo: 'empleado' | 'puesto' | 'departamento', event: Event): void {
    const valor = (event.target as HTMLSelectElement).value;
    if (tipo === 'empleado') this.filtroEmpleado.set(valor);
    if (tipo === 'puesto') this.filtroPuesto.set(valor);
    if (tipo === 'departamento') this.filtroDepartamento.set(valor);
    this.detalle.set(null);
    this.cargarEvaluaciones();
  }

  protected verDetalle(id: number): void {
    this.cargandoDetalle.set(true);
    this.error.set('');
    this.servicio.obtenerDetalleAdmin(id).subscribe({
      next: ({ evaluacion }) => {
        this.detalle.set(evaluacion);
        this.cargandoDetalle.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudo cargar el detalle de la evaluación.');
        this.cargandoDetalle.set(false);
      },
    });
  }

  protected cerrarDetalle(): void {
    this.detalle.set(null);
  }

  protected formatoPeriodo(periodo: string): string {
    const [anio, mes] = periodo.split('-').map(Number);
    return new Date(anio, mes - 1, 1).toLocaleDateString('es-GT', {
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Guatemala',
    });
  }

  protected formatoFecha(fecha: string | null): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'America/Guatemala',
    });
  }

  protected salir(): void {
    this.auth.logout();
  }

  private cargarCatalogos(): void {
    this.servicio.obtenerCatalogosAdmin().subscribe({
      next: ({ empleados, puestos, departamentos }) => {
        this.empleados.set(empleados);
        this.puestos.set(puestos);
        this.departamentos.set(departamentos);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudieron cargar los filtros.');
      },
    });
  }

  private cargarEvaluaciones(): void {
    this.cargando.set(true);
    this.servicio.listarAdmin({
      empleado_id: this.filtroEmpleado() ? Number(this.filtroEmpleado()) : undefined,
      puesto_id: this.filtroPuesto() ? Number(this.filtroPuesto()) : undefined,
      departamento: this.filtroDepartamento() || undefined,
    }).subscribe({
      next: ({ periodo_actual: periodo, evaluaciones }) => {
        this.periodoActual.set(periodo);
        this.evaluaciones.set(evaluaciones);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudieron cargar las evaluaciones.');
        this.cargando.set(false);
      },
    });
  }
}

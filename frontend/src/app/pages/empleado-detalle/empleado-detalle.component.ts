import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideClipboardCheck,
  lucideLayoutDashboard,
  lucideLogOut,
  lucideMessageSquare,
  lucideUserRoundCog,
  lucideUsers,
} from '@ng-icons/lucide';
import { distinctUntilChanged, map } from 'rxjs';
import { AppShellComponent } from '../../components/app-shell/app-shell.component';
import { NAV_ADMIN, SUGERENCIAS_ADMIN } from '../../components/app-shell/nav-items';
import { AuthService } from '../../services/auth.service';
import { DetalleEmpleado, RrhhService } from '../../services/rrhh.service';

@Component({
  selector: 'app-empleado-detalle',
  standalone: true,
  imports: [AppShellComponent, RouterLink, NgIcon],
  providers: [provideIcons({
    lucideArrowLeft,
    lucideClipboardCheck,
    lucideLayoutDashboard,
    lucideLogOut,
    lucideMessageSquare,
    lucideUserRoundCog,
    lucideUsers,
  })],
  templateUrl: './empleado-detalle.component.html',
})
export class EmpleadoDetalleComponent implements OnInit {
  protected readonly navItems = NAV_ADMIN;
  protected readonly bottomItems = [SUGERENCIAS_ADMIN];
  private readonly route = inject(ActivatedRoute);
  private readonly rrhh = inject(RrhhService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly usuario = this.auth.getUsuario();
  protected readonly detalle = signal<DetalleEmpleado | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.route.paramMap.pipe(
      map((params) => Number(params.get('id'))),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((id) => this.cargar(id));
  }

  protected formatoFecha(fecha: string | null | undefined): string {
    if (!fecha) return '—';
    return new Date(`${fecha.slice(0, 10)}T12:00:00`).toLocaleDateString('es-GT', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Guatemala',
    });
  }

  protected hora(valor: string | null | undefined): string {
    return valor ? valor.slice(11, 16) : '—';
  }

  protected formatoExtras(horas: number | undefined): string {
    if (!horas) return '—';
    return `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  }

  protected etiquetaEntrada(estado: string | null): string {
    if (estado === 'tolerancia') return 'Tolerancia de entrada';
    if (estado === 'atraso') return 'Atraso';
    return estado === 'puntual' ? 'Puntual' : 'Pendiente';
  }

  protected etiquetaSalida(estado: string | null, horasExtras?: number): string {
    if (horasExtras) return 'Horas extra';
    if (estado === 'anticipada') return 'Anticipada';
    return estado === 'normal' ? 'Normal' : 'Pendiente';
  }

  private cargar(id: number): void {
    if (!Number.isInteger(id) || id <= 0) {
      this.error.set('El identificador del empleado no es válido.');
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.error.set('');
    this.rrhh.obtenerDetalleEmpleado(id).subscribe({
      next: (detalle) => {
        this.detalle.set(detalle);
        this.cargando.set(false);
      },
      error: (error: { error?: { mensaje?: string } }) => {
        this.error.set(error.error?.mensaje || 'No se pudo cargar el detalle del empleado.');
        this.detalle.set(null);
        this.cargando.set(false);
      },
    });
  }
}

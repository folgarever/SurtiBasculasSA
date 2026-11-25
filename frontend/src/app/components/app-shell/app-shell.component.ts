import { NgClass } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalendarDays,
  lucideClipboardCheck,
  lucideLayoutDashboard,
  lucideLightbulb,
  lucideLogOut,
  lucideMessageSquare,
  lucideUserRoundCog,
  lucideUsers,
} from '@ng-icons/lucide';
import { AuthService } from '../../services/auth.service';
import { NotificacionesComponent } from '../notificaciones/notificaciones.component';
import { SelectorTemaComponent } from '../selector-tema/selector-tema.component';
import { NavItem, obtenerNavegacion, obtenerSeccionesAdmin } from './nav-items';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [NgClass, RouterLink, NgIcon, SelectorTemaComponent, NotificacionesComponent],
  providers: [provideIcons({
    lucideCalendarDays,
    lucideClipboardCheck,
    lucideLayoutDashboard,
    lucideLightbulb,
    lucideLogOut,
    lucideMessageSquare,
    lucideUserRoundCog,
    lucideUsers,
  })],
  templateUrl: './app-shell.component.html',
})
export class AppShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly esAdmin = this.auth.hasAdminRole();
  protected readonly navegacion = obtenerNavegacion(this.esAdmin);
  protected readonly seccionesAdmin = this.esAdmin
    ? obtenerSeccionesAdmin(this.auth.esGerenteGeneral())
        .map((seccion) => ({ ...seccion, items: seccion.items.filter((item) => this.visible(item)) }))
        .filter((seccion) => seccion.items.length > 0)
    : [];

  @Input() inicio = '/dashboard';
  @Input() caption = 'ESPACIO DE TRABAJO';
  @Input() topbarLabel = '';
  @Input() topbarTitle = '';
  @Input() workspaceClass = '';
  @Input() admin = false;
  @Input() nombre = '';
  @Input() inicial = 'U';
  @Input() footerTitulo = 'Portal activo';
  @Input() footerDetalle = 'Gestión de personal';
  @Input() items: NavItem[] = [];
  @Input() bottomItems: NavItem[] = [];
  @Input() bottomActive = '';

  protected salir(): void {
    this.auth.logout();
  }

  // Evita que el router interprete el ancla y mueve el foco al contenido principal.
  protected saltarAlContenido(event: Event): void {
    event.preventDefault();
    document.getElementById('contenido-principal')?.focus();
  }

  protected visible(item: NavItem): boolean {
    switch (item.visible) {
      case 'admin': return this.auth.hasAdminRole();
      case 'rrhh': return this.auth.hasRrhhRole();
      case 'evaluation': return this.auth.hasEvaluationRole();
      case 'employee': return !this.auth.hasAdminRole() && !this.auth.isCandidate();
      default: return true;
    }
  }

  protected esActivo(route: string): boolean {
    const url = this.router.url.split(/[?#]/, 1)[0];
    return url === route || (route === '/admin/empleados' && url.startsWith(`${route}/`));
  }
}

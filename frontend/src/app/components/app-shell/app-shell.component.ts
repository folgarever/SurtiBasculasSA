import { NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, Input, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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
import { RrhhService } from '../../services/rrhh.service';
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
export class AppShellComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly rrhh = inject(RrhhService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  private urlFotoPerfil: string | null = null;
  protected readonly fotoPerfil = signal<SafeResourceUrl | null>(null);
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
  @Input() items: NavItem[] = [];
  @Input() bottomItems: NavItem[] = [];
  @Input() bottomActive = '';

  ngOnInit(): void {
    const usuario = this.auth.getUsuario();
    if (!usuario || usuario.role === 'CANDIDATE') return;

    this.rrhh.descargarMiFoto().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (foto) => {
        this.urlFotoPerfil = URL.createObjectURL(foto);
        this.fotoPerfil.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.urlFotoPerfil));
      },
      error: (error: HttpErrorResponse) => {
        if (error.status !== 404) console.error('No fue posible cargar la foto del perfil.', error);
      },
    });

    this.destroyRef.onDestroy(() => {
      if (this.urlFotoPerfil) URL.revokeObjectURL(this.urlFotoPerfil);
    });
  }

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

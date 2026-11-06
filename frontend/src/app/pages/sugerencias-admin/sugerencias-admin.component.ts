import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClipboardCheck, lucideLayoutDashboard, lucideLogOut, lucideMessageSquare, lucideSend, lucideUserRoundCog, lucideUsers } from '@ng-icons/lucide';
import { AuthService } from '../../services/auth.service';
import { Sugerencia, SugerenciasService } from '../../services/sugerencias.service';

type FiltroSugerencias = 'todas' | 'pendientes' | 'respondidas';

@Component({
  selector: 'app-sugerencias-admin',
  standalone: true,
  imports: [RouterLink, NgIcon],
  providers: [provideIcons({ lucideClipboardCheck, lucideLayoutDashboard, lucideLogOut, lucideMessageSquare, lucideSend, lucideUserRoundCog, lucideUsers })],
  templateUrl: './sugerencias-admin.component.html',
})
export class SugerenciasAdminComponent implements OnInit {
  private readonly servicio = inject(SugerenciasService);
  private readonly auth = inject(AuthService);

  protected readonly usuario = this.auth.getUsuario();
  protected readonly sugerencias = signal<Sugerencia[]>([]);
  protected readonly respuestas = signal<Record<number, string>>({});
  protected readonly filtro = signal<FiltroSugerencias>('todas');
  protected readonly cargando = signal(true);
  protected readonly guardandoId = signal<number | null>(null);
  protected readonly error = signal('');
  protected readonly aviso = signal('');
  protected readonly pendientes = computed(() => this.sugerencias().filter((sugerencia) => !sugerencia.respuesta).length);
  protected readonly sugerenciasFiltradas = computed(() => this.sugerencias().filter((sugerencia) => {
    if (this.filtro() === 'pendientes') return !sugerencia.respuesta;
    if (this.filtro() === 'respondidas') return Boolean(sugerencia.respuesta);
    return true;
  }));

  ngOnInit(): void {
    this.cargarSugerencias();
  }

  protected actualizarRespuesta(id: number, event: Event): void {
    const respuesta = (event.target as HTMLTextAreaElement).value;
    this.respuestas.update((actuales) => ({ ...actuales, [id]: respuesta }));
  }

  protected guardarRespuesta(sugerencia: Sugerencia): void {
    const respuesta = (this.respuestas()[sugerencia.id] ?? sugerencia.respuesta ?? '').trim();
    if (!respuesta || respuesta.length > 5000 || this.guardandoId() !== null) {
      this.error.set('La respuesta debe tener entre 1 y 5,000 caracteres.');
      return;
    }

    this.error.set('');
    this.aviso.set('');
    this.guardandoId.set(sugerencia.id);
    this.servicio.responder(sugerencia.id, respuesta).subscribe({
      next: ({ mensaje }) => {
        this.aviso.set(mensaje);
        this.guardandoId.set(null);
        this.error.set('');
        this.cargarSugerencias();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudo guardar la respuesta.');
        this.guardandoId.set(null);
      },
    });
  }

  protected seleccionarFiltro(filtro: FiltroSugerencias): void {
    this.filtro.set(filtro);
  }

  protected formatoFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-GT', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Guatemala',
    });
  }

  protected salir(): void {
    this.auth.logout();
  }

  private cargarSugerencias(): void {
    this.cargando.set(true);
    this.servicio.obtenerTodas().subscribe({
      next: ({ sugerencias }) => {
        this.sugerencias.set(sugerencias);
        this.respuestas.set({});
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudieron cargar las sugerencias.');
        this.cargando.set(false);
      },
    });
  }
}

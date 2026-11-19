import { Component, ElementRef, HostListener, OnInit, ViewChild, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBell, lucideBellDot } from '@ng-icons/lucide';
import { NotificacionItem, NotificacionesService } from '../../services/notificaciones.service';

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [NgIcon],
  providers: [provideIcons({ lucideBell, lucideBellDot })],
  templateUrl: './notificaciones.component.html',
})
export class NotificacionesComponent implements OnInit {
  protected readonly servicio = inject(NotificacionesService);
  private readonly router = inject(Router);
  private readonly elemento = inject(ElementRef<HTMLElement>);

  protected readonly abierto = signal(false);
  @ViewChild('activador') private activador?: ElementRef<HTMLButtonElement>;

  ngOnInit(): void {
    this.servicio.cargar();
  }

  protected alternar(): void {
    this.abierto.update((valor) => !valor);
  }

  protected abrir(item: NotificacionItem): void {
    this.servicio.marcarLeido(item);
    this.cerrar();
    void this.router.navigateByUrl(item.ruta);
  }

  protected marcarTodas(): void {
    this.servicio.marcarTodos();
  }

  protected cerrar(enfocar = false): void {
    if (!this.abierto()) return;
    this.abierto.set(false);
    if (enfocar) this.activador?.nativeElement.focus();
  }

  @HostListener('document:click', ['$event'])
  protected cerrarAlHacerClicFuera(evento: MouseEvent): void {
    if (evento.target instanceof Node && !this.elemento.nativeElement.contains(evento.target)) this.cerrar();
  }
}

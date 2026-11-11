import { Component, ElementRef, HostListener, ViewChild, inject, input, signal } from '@angular/core';
import { PreferenciaTema, TemaService } from '../../services/tema.service';

@Component({
  selector: 'app-selector-tema',
  standalone: true,
  template: `
    <div class="theme-control" (keydown.escape)="cerrar(true)">
      <button #activador type="button" class="theme-trigger"
        [class.theme-trigger-logo]="tipo() === 'logo'"
        [class.user-chip]="tipo() === 'perfil'"
        [attr.aria-label]="tipo() === 'logo' ? 'Cambiar apariencia' : 'Perfil y apariencia' "
        [attr.aria-expanded]="abierto()"
        aria-haspopup="true"
        title="Cambiar apariencia"
        (click)="alternar()">
        @if (tipo() === 'logo') {
          <ng-content />
        } @else {
          <span class="avatar" [class.avatar-admin]="admin()">{{ inicial() }}</span>
          <span class="theme-trigger-name">{{ nombre() }}</span>
        }
      </button>
      @if (abierto()) {
        <div class="theme-popover" role="group" aria-label="Tema de apariencia">
          <span class="theme-label">Apariencia</span>
          <div class="theme-selector">
            <button type="button" [attr.aria-pressed]="tema.preferencia() === 'sistema'" (click)="elegir('sistema')">Sistema</button>
            <button type="button" [attr.aria-pressed]="tema.preferencia() === 'claro'" (click)="elegir('claro')">Claro</button>
            <button type="button" [attr.aria-pressed]="tema.preferencia() === 'oscuro'" (click)="elegir('oscuro')">Oscuro</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class SelectorTemaComponent {
  readonly tipo = input<'perfil' | 'logo'>('perfil');
  readonly nombre = input('');
  readonly inicial = input('U');
  readonly admin = input(false);
  protected readonly tema = inject(TemaService);
  protected readonly abierto = signal(false);
  private readonly elemento = inject(ElementRef<HTMLElement>);
  @ViewChild('activador') private activador?: ElementRef<HTMLButtonElement>;

  protected alternar(): void {
    this.abierto.update(valor => !valor);
  }

  protected elegir(preferencia: PreferenciaTema): void {
    this.tema.elegir(preferencia);
    this.cerrar(true);
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

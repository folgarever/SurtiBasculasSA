import { AfterViewInit, Directive, ElementRef, HostListener, inject, OnDestroy } from '@angular/core';

const FOCUSABLES =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Mueve el foco al abrir el modal, lo mantiene dentro con Tab y lo devuelve al elemento que lo abrió.
@Directive({ selector: '[appModalFoco]', standalone: true })
export class ModalFocoDirective implements AfterViewInit, OnDestroy {
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly previo = document.activeElement as HTMLElement | null;

  ngAfterViewInit(): void {
    const primero = this.enfocables()[0];
    (primero ?? this.elemento).focus();
  }

  ngOnDestroy(): void {
    if (this.previo?.isConnected) this.previo.focus();
  }

  @HostListener('keydown', ['$event'])
  protected atraparTab(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const lista = this.enfocables();
    if (lista.length === 0) {
      event.preventDefault();
      return;
    }
    const primero = lista[0];
    const ultimo = lista[lista.length - 1];
    const activo = document.activeElement;
    if (event.shiftKey && (activo === primero || activo === this.elemento)) {
      event.preventDefault();
      ultimo.focus();
    } else if (!event.shiftKey && activo === ultimo) {
      event.preventDefault();
      primero.focus();
    }
  }

  private enfocables(): HTMLElement[] {
    return Array.from(this.elemento.querySelectorAll<HTMLElement>(FOCUSABLES))
      .filter((el) => el.offsetParent !== null || el === document.activeElement);
  }
}

import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';

export type PreferenciaTema = 'sistema' | 'claro' | 'oscuro';

@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly documento = inject(DOCUMENT);
  private readonly ventana = this.documento.defaultView;
  private readonly clave = 'surtibasculas_tema';
  private readonly consulta = this.ventana?.matchMedia?.('(prefers-color-scheme: dark)');
  private readonly preferenciaActual = signal<PreferenciaTema>(this.leerPreferencia());
  readonly preferencia = this.preferenciaActual.asReadonly();

  constructor() {
    if (!this.consulta) console.warn('No se pudo detectar el tema del dispositivo; se usará el tema claro.');
    this.aplicarTema();
    this.consulta?.addEventListener('change', this.alCambiarSistema);
    this.ventana?.addEventListener('storage', this.alCambiarAlmacenamiento);
    inject(DestroyRef).onDestroy(() => {
      this.consulta?.removeEventListener('change', this.alCambiarSistema);
      this.ventana?.removeEventListener('storage', this.alCambiarAlmacenamiento);
    });
  }

  elegir(preferencia: PreferenciaTema): void {
    this.ventana?.localStorage.setItem(this.clave, preferencia);
    this.preferenciaActual.set(preferencia);
    this.aplicarTema();
  }

  private leerPreferencia(): PreferenciaTema {
    const valor = this.ventana?.localStorage.getItem(this.clave);
    if (valor === null || valor === undefined || valor === 'sistema') return 'sistema';
    if (valor === 'claro' || valor === 'oscuro') return valor;
    console.warn('Preferencia de tema desconocida; se usará el tema del dispositivo.');
    return 'sistema';
  }

  private aplicarTema(): void {
    const preferencia = this.preferenciaActual();
    const oscuro = preferencia === 'oscuro' || (preferencia === 'sistema' && !!this.consulta?.matches);
    this.documento.documentElement.dataset['theme'] = oscuro ? 'dark' : 'light';
  }

  private readonly alCambiarSistema = (): void => {
    if (this.preferenciaActual() === 'sistema') this.aplicarTema();
  };

  private readonly alCambiarAlmacenamiento = (evento: StorageEvent): void => {
    if (evento.key !== this.clave && evento.key !== null) return;
    this.preferenciaActual.set(this.leerPreferencia());
    this.aplicarTema();
  };
}

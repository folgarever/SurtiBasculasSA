import { CanDeactivateFn } from '@angular/router';

export interface ConCambiosSinGuardar {
  tieneCambiosSinGuardar(): boolean;
}

export const cambiosSinGuardarGuard: CanDeactivateFn<ConCambiosSinGuardar> = (componente) =>
  !componente.tieneCambiosSinGuardar() ||
  window.confirm('Tienes cambios sin guardar en la ficha. ¿Quieres salir sin guardarlos?');

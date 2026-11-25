import { NAV_ADMIN, NAV_EMPLEADO, obtenerNavegacion, SUGERENCIAS_ADMIN, SUGERENCIAS_EMPLEADO } from './nav-items';

describe('obtenerNavegacion', () => {
  it('mantiene todos los accesos administrativos en los módulos compartidos', () => {
    const navegacion = obtenerNavegacion(true);

    expect(navegacion.items).toBe(NAV_ADMIN);
    expect(navegacion.bottomItems).toEqual([SUGERENCIAS_ADMIN]);
  });

  it('selecciona la navegación y los accesos inferiores de empleado', () => {
    const navegacion = obtenerNavegacion(false);

    expect(navegacion.items).toBe(NAV_EMPLEADO);
    expect(navegacion.items.some((item) => item.route === '/solicitudes')).toBe(false);
    expect(navegacion.bottomItems).toEqual([SUGERENCIAS_ADMIN, SUGERENCIAS_EMPLEADO]);
  });
});

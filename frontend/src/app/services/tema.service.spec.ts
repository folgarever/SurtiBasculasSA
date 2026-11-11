import { TestBed } from '@angular/core/testing';
import { TemaService } from './tema.service';

describe('TemaService', () => {
  const clave = 'surtibasculas_tema';
  let eventos: EventTarget;
  let consulta: { matches: boolean; addEventListener: EventTarget['addEventListener']; removeEventListener: EventTarget['removeEventListener'] };

  beforeEach(() => {
    localStorage.removeItem(clave);
    eventos = new EventTarget();
    consulta = {
      matches: false,
      addEventListener: eventos.addEventListener.bind(eventos),
      removeEventListener: eventos.removeEventListener.bind(eventos),
    };
    vi.stubGlobal('matchMedia', vi.fn(() => consulta));
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.removeItem(clave);
    delete document.documentElement.dataset['theme'];
    vi.unstubAllGlobals();
  });

  it('sigue el tema del sistema y sus cambios cuando no hay elección manual', () => {
    consulta.matches = true;
    const tema = TestBed.inject(TemaService);
    expect(tema.preferencia()).toBe('sistema');
    expect(document.documentElement.dataset['theme']).toBe('dark');

    consulta.matches = false;
    eventos.dispatchEvent(new Event('change'));
    expect(document.documentElement.dataset['theme']).toBe('light');
  });

  it('conserva la elección manual e ignora cambios del sistema', () => {
    const tema = TestBed.inject(TemaService);
    tema.elegir('oscuro');
    expect(localStorage.getItem(clave)).toBe('oscuro');
    expect(document.documentElement.dataset['theme']).toBe('dark');

    consulta.matches = false;
    eventos.dispatchEvent(new Event('change'));
    expect(document.documentElement.dataset['theme']).toBe('dark');

    tema.elegir('sistema');
    expect(localStorage.getItem(clave)).toBe('sistema');
    expect(document.documentElement.dataset['theme']).toBe('light');
  });

  it('restaura la preferencia guardada al iniciar', () => {
    localStorage.setItem(clave, 'claro');
    consulta.matches = true;
    const tema = TestBed.inject(TemaService);
    expect(tema.preferencia()).toBe('claro');
    expect(document.documentElement.dataset['theme']).toBe('light');
  });

  it('sincroniza los cambios realizados en otra pestaña', () => {
    const tema = TestBed.inject(TemaService);
    localStorage.setItem(clave, 'oscuro');
    window.dispatchEvent(new StorageEvent('storage', { key: clave }));
    expect(tema.preferencia()).toBe('oscuro');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });
});

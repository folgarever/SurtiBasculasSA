import { TestBed } from '@angular/core/testing';
import { CanActivateFn, provideRouter, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';
import { employeeGuard } from './employee.guard';

describe('guards de acceso', () => {
  const auth = {
    isAuthenticated: vi.fn(),
    isCandidate: vi.fn(),
    hasAdminRole: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  function ejecutar(guard: CanActivateFn): UrlTree | boolean {
    return TestBed.runInInjectionContext(() => guard({} as never, {} as never)) as UrlTree | boolean;
  }

  function url(resultado: UrlTree | boolean): string | undefined {
    return resultado instanceof UrlTree ? TestBed.inject(Router).serializeUrl(resultado) : undefined;
  }

  it('envía a login cuando no hay sesión', () => {
    auth.isAuthenticated.mockReturnValue(false);
    expect(url(ejecutar(authGuard))).toBe('/login');
  });

  it('mantiene a los candidatos fuera del portal del personal', () => {
    auth.isAuthenticated.mockReturnValue(true);
    auth.isCandidate.mockReturnValue(true);
    expect(url(ejecutar(authGuard))).toBe('/seleccion-candidato');
    expect(url(ejecutar(employeeGuard))).toBe('/seleccion-candidato');
  });

  it('envía a los administradores al foro administrativo', () => {
    auth.isAuthenticated.mockReturnValue(true);
    auth.isCandidate.mockReturnValue(false);
    auth.hasAdminRole.mockReturnValue(true);
    expect(url(ejecutar(employeeGuard))).toBe('/admin/sugerencias');
  });

  it('permite el foro al personal no administrador', () => {
    auth.isAuthenticated.mockReturnValue(true);
    auth.isCandidate.mockReturnValue(false);
    auth.hasAdminRole.mockReturnValue(false);
    expect(ejecutar(employeeGuard)).toBe(true);
  });
});

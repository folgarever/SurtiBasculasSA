import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificacionesService } from '../../services/notificaciones.service';
import { AppShellComponent } from './app-shell.component';
import { NAV_ADMIN, SUGERENCIAS_ADMIN, SUGERENCIAS_EMPLEADO } from './nav-items';

describe('AppShellComponent', () => {
  const auth = {
    hasAdminRole: vi.fn(),
    hasRrhhRole: vi.fn(),
    hasEvaluationRole: vi.fn(),
    isCandidate: vi.fn(),
    logout: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    auth.hasAdminRole.mockReturnValue(false);
    auth.hasRrhhRole.mockReturnValue(false);
    auth.hasEvaluationRole.mockReturnValue(false);
    auth.isCandidate.mockReturnValue(false);
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        {
          provide: NotificacionesService,
          useValue: {
            cargar: vi.fn(),
            items: signal([]),
            noLeidos: signal(0),
            total: signal(0),
            cargando: signal(false),
            estaLeido: () => false,
            marcarLeido: vi.fn(),
            marcarTodos: vi.fn(),
          },
        },
      ],
    }).compileComponents();
  });

  function crear() {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.componentRef.setInput('items', NAV_ADMIN);
    fixture.componentRef.setInput('bottomItems', [SUGERENCIAS_ADMIN, SUGERENCIAS_EMPLEADO]);
    fixture.detectChanges();
    return fixture;
  }

  function enlaces(fixture: ReturnType<typeof crear>): string[] {
    const root = fixture.nativeElement as HTMLElement;
    return Array.from(root.querySelectorAll<HTMLAnchorElement>('.sidebar-link'))
      .map((enlace) => enlace.textContent?.trim() ?? '');
  }

  it('mantiene el menú ADMIN aunque la página solicite el menú de empleado', () => {
    auth.hasAdminRole.mockReturnValue(true);
    const menu = enlaces(crear());

    expect(menu).toContain('Empleados');
    expect(menu).toContain('Solicitudes');
    expect(menu).not.toContain('Mis solicitudes');
  });

  it('mantiene el menú de empleado aunque la página solicite el menú ADMIN', () => {
    auth.hasAdminRole.mockReturnValue(false);
    const menu = enlaces(crear());

    expect(menu).not.toContain('Mis solicitudes');
    expect(menu).toContain('Mi jornada');
    expect(menu).not.toContain('Empleados');
  });

  it('oculta los módulos de evaluación cuando el rol no los permite', () => {
    auth.hasEvaluationRole.mockReturnValue(true);
    expect(enlaces(crear())).toContain('Evaluaciones');

    auth.hasEvaluationRole.mockReturnValue(false);
    expect(enlaces(crear())).not.toContain('Evaluaciones');
  });

  it('muestra el foro correcto según el rol', () => {
    auth.hasAdminRole.mockReturnValue(true);
    expect(enlaces(crear())).toContain('Sugerencias');

    auth.hasAdminRole.mockReturnValue(false);
    expect(enlaces(crear())).toContain('Mis sugerencias');
  });

  it('cierra sesión desde la barra superior', () => {
    const fixture = crear();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('button[aria-label="Cerrar sesión"]')!.click();
    expect(auth.logout).toHaveBeenCalledOnce();
  });

  it('solo marca el enlace inferior como activo en su propia ruta', () => {
    auth.hasAdminRole.mockReturnValue(true);
    const url = vi.spyOn(TestBed.inject(Router), 'url', 'get').mockReturnValue('/admin');
    const fixture = crear();
    fixture.componentRef.setInput('bottomActive', SUGERENCIAS_ADMIN.route);
    fixture.detectChanges();
    const enlace = fixture.nativeElement.querySelector('.sidebar-bottom-link') as HTMLAnchorElement;
    expect(enlace.classList.contains('is-active')).toBe(false);
    expect(enlace.getAttribute('aria-current')).toBeNull();

    url.mockReturnValue(SUGERENCIAS_ADMIN.route);
    const activo = crear();
    activo.componentRef.setInput('bottomActive', SUGERENCIAS_ADMIN.route);
    activo.detectChanges();
    const enlaceActivo = activo.nativeElement.querySelector('.sidebar-bottom-link') as HTMLAnchorElement;
    expect(enlaceActivo.classList.contains('is-active')).toBe(true);
    expect(enlaceActivo.getAttribute('aria-current')).toBe('page');
  });
});

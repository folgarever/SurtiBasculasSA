import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificacionesService } from '../../services/notificaciones.service';
import { RrhhService } from '../../services/rrhh.service';
import { AppShellComponent } from './app-shell.component';
import { NAV_ADMIN, SUGERENCIAS_ADMIN, SUGERENCIAS_EMPLEADO } from './nav-items';

describe('AppShellComponent', () => {
  const auth = {
    hasAdminRole: vi.fn(),
    esGerenteGeneral: vi.fn(),
    hasRrhhRole: vi.fn(),
    hasEvaluationRole: vi.fn(),
    isCandidate: vi.fn(),
    getUsuario: vi.fn(),
    logout: vi.fn(),
  };
  const rrhh = { descargarMiFoto: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    auth.hasAdminRole.mockReturnValue(false);
    auth.esGerenteGeneral.mockReturnValue(false);
    auth.hasRrhhRole.mockReturnValue(false);
    auth.hasEvaluationRole.mockReturnValue(false);
    auth.isCandidate.mockReturnValue(false);
    auth.getUsuario.mockReturnValue(null);
    rrhh.descargarMiFoto.mockReturnValue({ pipe: () => ({ subscribe: vi.fn() }) });
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: RrhhService, useValue: rrhh },
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

  it('no repite el título de módulos en el menú administrativo', () => {
    auth.hasAdminRole.mockReturnValue(true);
    const root = crear().nativeElement as HTMLElement;

    expect(root.querySelector('.sidebar-caption')).toBeNull();
  });

  it('mantiene el menú de empleado aunque la página solicite el menú ADMIN', () => {
    auth.hasAdminRole.mockReturnValue(false);
    const menu = enlaces(crear());

    expect(menu).not.toContain('Mis solicitudes');
    expect(menu).toContain('Mi jornada');
    expect(menu).not.toContain('Empleados');
  });

  it('agrupa los accesos del empleado y no muestra secciones sin permisos', () => {
    const root = crear().nativeElement as HTMLElement;
    const secciones = Array.from(root.querySelectorAll('.sidebar-section'))
      .map((seccion) => seccion.getAttribute('aria-label'));

    expect(secciones).toEqual(['Mi espacio', 'Comunicación']);
    expect(root.querySelector('[aria-label="Mi espacio"] [href="/dashboard"]')).not.toBeNull();
    expect(root.querySelector('[aria-label="Mi espacio"] [href="/evaluaciones-conocimiento"]')).not.toBeNull();
    expect(root.querySelector('[aria-label="Comunicación"] [href="/sugerencias"]')).not.toBeNull();
    expect(root.querySelector('[href="/rrhh"]')).toBeNull();
  });

  it('incluye la gestión de personal en su sección para empleados autorizados', () => {
    auth.hasRrhhRole.mockReturnValue(true);
    const root = crear().nativeElement as HTMLElement;

    expect(root.querySelector('[aria-label="Gestión de personal"] [href="/rrhh"]')).not.toBeNull();
    expect(root.querySelector('[href="/admin"]')).toBeNull();
  });

  it('mantiene activo el enlace de sugerencias del empleado dentro de su sección', () => {
    vi.spyOn(TestBed.inject(Router), 'url', 'get').mockReturnValue('/sugerencias');
    const root = crear().nativeElement as HTMLElement;

    expect(root.querySelector('[aria-label="Comunicación"] [href="/sugerencias"]')?.getAttribute('aria-current')).toBe('page');
  });

  it('oculta los módulos de evaluación cuando el rol no los permite', () => {
    auth.hasEvaluationRole.mockReturnValue(true);
    expect(enlaces(crear())).toContain('Evaluaciones');

    auth.hasEvaluationRole.mockReturnValue(false);
    expect(enlaces(crear())).not.toContain('Evaluaciones');
  });

  it('prioriza el espacio personal para administradores que son empleados', () => {
    auth.hasAdminRole.mockReturnValue(true);
    auth.hasEvaluationRole.mockReturnValue(false);
    const root = crear().nativeElement as HTMLElement;
    const secciones = Array.from(root.querySelectorAll('.sidebar-section'))
      .map((seccion) => seccion.getAttribute('aria-label'));

    expect(secciones).toEqual(['Módulos', 'Gestión de personal', 'Mi espacio', 'Comunicación']);
    expect(root.querySelector('[href="/evaluaciones-conocimiento"]')?.textContent).toContain('Mi evaluación');
    expect(root.querySelector('[href="/admin/evaluaciones-conocimiento"]')).toBeNull();
    expect(root.querySelector('[href="/solicitudes"]')).not.toBeNull();
  });

  it('prioriza la gestión para el Gerente General y conserva sus accesos personales', () => {
    auth.hasAdminRole.mockReturnValue(true);
    auth.esGerenteGeneral.mockReturnValue(true);
    auth.hasEvaluationRole.mockReturnValue(true);
    const root = crear().nativeElement as HTMLElement;
    const secciones = Array.from(root.querySelectorAll('.sidebar-section'))
      .map((seccion) => seccion.getAttribute('aria-label'));

    expect(secciones).toEqual(['Módulos', 'Gestión de personal', 'Mi espacio', 'Evaluación y selección', 'Comunicación']);
    expect(root.querySelector('[href="/admin/evaluaciones-conocimiento"]')).not.toBeNull();
    expect(root.querySelector('[href="/dashboard"]')).not.toBeNull();
  });

  it('conserva los módulos de evaluación para un administrador autorizado que no es gerente', () => {
    auth.hasAdminRole.mockReturnValue(true);
    auth.hasEvaluationRole.mockReturnValue(true);
    const root = crear().nativeElement as HTMLElement;

    expect(root.querySelector('[aria-label="Evaluación y selección"]')).not.toBeNull();
    expect(root.querySelector('[href="/admin/evaluaciones-seleccion"]')).not.toBeNull();
    expect(root.querySelector('[href="/evaluaciones-conocimiento"]')).not.toBeNull();
  });

  it('muestra el foro correcto según el rol', () => {
    auth.hasAdminRole.mockReturnValue(true);
    expect(enlaces(crear())).toContain('Sugerencias');

    auth.hasAdminRole.mockReturnValue(false);
    expect(enlaces(crear())).toContain('Mis sugerencias');
  });

  it('mantiene el mismo estado al cambiar de módulo', () => {
    auth.hasAdminRole.mockReturnValue(true);
    const url = vi.spyOn(TestBed.inject(Router), 'url', 'get').mockReturnValue('/admin');
    const fixture = crear();
    const footer = fixture.nativeElement.querySelector('.sidebar-footer') as HTMLElement;
    expect(footer.textContent).toContain('Sistema activo');
    expect(footer.textContent).toContain('Gestión de personal');

    url.mockReturnValue('/dashboard');
    fixture.detectChanges();
    expect(footer.textContent).toContain('Sistema activo');
    expect(footer.textContent).toContain('Gestión de personal');
  });

  it('cierra sesión desde la barra superior', () => {
    const fixture = crear();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('button[aria-label="Cerrar sesión"]')!.click();
    expect(auth.logout).toHaveBeenCalledOnce();
  });

  it('marca sugerencias como activa solo en su propia ruta', () => {
    auth.hasAdminRole.mockReturnValue(true);
    const url = vi.spyOn(TestBed.inject(Router), 'url', 'get').mockReturnValue('/admin');
    const fixture = crear();
    fixture.componentRef.setInput('bottomActive', SUGERENCIAS_ADMIN.route);
    fixture.detectChanges();
    const enlace = fixture.nativeElement.querySelector('a[href="/admin/sugerencias"]') as HTMLAnchorElement;
    expect(enlace.classList.contains('is-active')).toBe(false);
    expect(enlace.getAttribute('aria-current')).toBeNull();

    url.mockReturnValue(SUGERENCIAS_ADMIN.route);
    const activo = crear();
    activo.componentRef.setInput('bottomActive', SUGERENCIAS_ADMIN.route);
    activo.detectChanges();
    const enlaceActivo = activo.nativeElement.querySelector('a[href="/admin/sugerencias"]') as HTMLAnchorElement;
    expect(enlaceActivo.classList.contains('is-active')).toBe(true);
    expect(enlaceActivo.getAttribute('aria-current')).toBe('page');
  });

  it('mantiene activo Empleados al consultar una ficha', () => {
    auth.hasAdminRole.mockReturnValue(true);
    vi.spyOn(TestBed.inject(Router), 'url', 'get').mockReturnValue('/admin/empleados/7?tab=datos');
    const root = crear().nativeElement as HTMLElement;
    expect(root.querySelector('a[href="/admin/empleados"]')?.getAttribute('aria-current')).toBe('page');
    expect(root.querySelector('a[href="/admin"]')?.getAttribute('aria-current')).toBeNull();
  });
});

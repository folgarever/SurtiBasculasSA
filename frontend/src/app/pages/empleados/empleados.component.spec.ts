import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificacionesService } from '../../services/notificaciones.service';
import { EmpleadosComponent } from './empleados.component';

describe('EmpleadosComponent · puestos y permisos', () => {
  const puestosUrl = '/api/rrhh/administracion/puestos';
  const empleadosUrl = '/api/rrhh/administracion/empleados';
  let httpMock: HttpTestingController;

  async function crear(esGerente: boolean, empleados: unknown[] = []) {
    await TestBed.configureTestingModule({
      imports: [EmpleadosComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            getUsuario: () => ({
              id: 1,
              nombre: esGerente ? 'Héctor' : 'Mafer',
              rol: 'ADMIN',
              codigo_empleado: esGerente ? 'SUR-GG-001' : 'SUR-AC-002',
            }),
            hasAdminRole: () => true,
            hasRrhhRole: () => true,
            hasEvaluationRole: () => true,
            esGerenteGeneral: () => esGerente,
            isCandidate: () => false,
            logout: vi.fn(),
          },
        },
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

    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(EmpleadosComponent);
    fixture.detectChanges();
    httpMock.expectOne(empleadosUrl).flush({ empleados });
    httpMock.expectOne(puestosUrl).flush({
      puestos: [
        {
          id: 1,
          codigo_abreviatura: 'GG',
          nombre_puesto: 'Gerente General',
          departamento: 'Gerencia',
          frecuencia_evaluacion: 'mensual',
          es_admin: 1,
        },
        {
          id: 2,
          codigo_abreviatura: 'TECINF',
          nombre_puesto: 'Técnico Informático',
          departamento: 'Sistemas',
          frecuencia_evaluacion: 'mensual',
          es_admin: 1,
        },
        {
          id: 3,
          codigo_abreviatura: 'TEC',
          nombre_puesto: 'Técnico',
          departamento: 'Técnica',
          frecuencia_evaluacion: 'mensual',
          es_admin: 0,
        },
      ],
    });
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    httpMock?.verify();
    TestBed.resetTestingModule();
  });

  function escribir(root: HTMLElement, id: string, valor: string): void {
    const input = root.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  it('muestra el botón solo al Gerente General', async () => {
    const gerente = await crear(true);
    expect((gerente.nativeElement as HTMLElement).textContent).toContain('Puestos y permisos');

    TestBed.resetTestingModule();
    const otro = await crear(false);
    const botones = Array.from((otro.nativeElement as HTMLElement).querySelectorAll('button'));
    expect(botones.some((boton) => boton.textContent?.includes('Puestos y permisos'))).toBe(false);
  });

  it('permite al Gerente General editar y dar de baja cualquier ADMIN', async () => {
    const admin = {
      id: 2,
      codigo_empleado: 'SUR-TECINF-001',
      nombre: 'Técnico Informático',
      nombre_puesto: 'Técnico Informático',
      puesto_id: 2,
      rol: 'ADMIN',
      activo: 1,
    };
    const gerente = await crear(true, [admin]);
    const rootGerente = gerente.nativeElement as HTMLElement;

    rootGerente.querySelector<HTMLButtonElement>('button[title="Editar empleado"]')!.click();
    gerente.detectChanges();
    const puesto = rootGerente.querySelector<HTMLSelectElement>('#empleado-puesto')!;
    expect(puesto.disabled).toBe(false);
    puesto.value = '3';
    puesto.dispatchEvent(new Event('change'));
    gerente.detectChanges();
    expect(rootGerente.textContent).toContain('se retirará su acceso de administrador');
    expect(rootGerente.querySelector('button[title="Dar de baja"]')).not.toBeNull();

    TestBed.resetTestingModule();
    const otroAdmin = await crear(false, [admin]);
    const rootOtroAdmin = otroAdmin.nativeElement as HTMLElement;
    expect(rootOtroAdmin.textContent).toContain('Cuenta protegida');
    expect(rootOtroAdmin.querySelector('button[title="Editar empleado"]')).toBeNull();
    expect(rootOtroAdmin.querySelector('button[title="Dar de baja"]')).toBeNull();
  });

  it('pide contraseña y crea el puesto desde el modal', async () => {
    const fixture = await crear(true);
    const root = fixture.nativeElement as HTMLElement;
    const boton = Array.from(root.querySelectorAll('button'))
      .find((item) => item.textContent?.includes('Puestos y permisos'))!;
    boton.click();
    fixture.detectChanges();

    expect(root.textContent).toContain('Puestos registrados');
    escribir(root, 'puesto-codigo', 'AUXADM');
    escribir(root, 'puesto-nombre', 'Auxiliar Administrativo');
    escribir(root, 'puesto-departamento', 'Administración');
    root.querySelector<HTMLInputElement>('#puesto-admin')!.click();
    fixture.detectChanges();

    const formulario = root.querySelector('.puesto-formulario form')!;
    formulario.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    httpMock.expectNone(puestosUrl);
    expect(root.textContent).toContain('La contraseña del Gerente General es obligatoria.');

    escribir(root, 'contrasena-admin-puesto', 'secreta');
    formulario.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const alta = httpMock.expectOne(puestosUrl);
    expect(alta.request.method).toBe('POST');
    expect(alta.request.body).toMatchObject({
      codigo_abreviatura: 'AUXADM',
      es_admin: true,
      contrasena_admin: 'secreta',
    });
    alta.flush({ mensaje: 'Puesto registrado correctamente.', puesto: { id: 2 } });
    httpMock.expectOne(puestosUrl).flush({ puestos: [] });
  });
});

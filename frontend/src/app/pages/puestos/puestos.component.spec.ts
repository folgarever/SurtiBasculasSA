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
import { PuestosComponent } from './puestos.component';

describe('PuestosComponent', () => {
  const baseUrl = '/api/rrhh/administracion/puestos';
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PuestosComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            getUsuario: () => ({ nombre: 'Héctor', rol: 'ADMIN', codigo_empleado: 'SUR-GG-001' }),
            hasAdminRole: () => true,
            hasRrhhRole: () => true,
            hasEvaluationRole: () => true,
            esGerenteGeneral: () => true,
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
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  function crear() {
    const fixture = TestBed.createComponent(PuestosComponent);
    fixture.detectChanges();
    httpMock.expectOne(baseUrl).flush({
      puestos: [{
        id: 3,
        codigo_abreviatura: 'COOR',
        nombre_puesto: 'Coordinador de Operaciones',
        departamento: 'Operaciones',
        frecuencia_evaluacion: 'mensual',
        es_admin: 0,
      }],
    });
    fixture.detectChanges();
    return fixture;
  }

  function escribir(root: HTMLElement, id: string, valor: string): void {
    const input = root.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  it('muestra el catálogo de puestos y su indicador ADMIN', () => {
    const fixture = crear();
    const texto = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(texto).toContain('Coordinador de Operaciones');
    expect(texto).toContain('Empleado');
  });

  it('exige contraseña y envía el indicador ADMIN al registrar un puesto', () => {
    const fixture = crear();
    const root = fixture.nativeElement as HTMLElement;
    const agregar = Array.from(root.querySelectorAll('button'))
      .find((boton) => boton.textContent?.includes('Agregar puesto'))!;
    agregar.click();
    fixture.detectChanges();

    escribir(root, 'puesto-codigo', 'AUXADM');
    escribir(root, 'puesto-nombre', 'Auxiliar Administrativo');
    escribir(root, 'puesto-departamento', 'Administración');
    const admin = root.querySelector<HTMLInputElement>('#puesto-admin')!;
    admin.click();
    fixture.detectChanges();

    const formulario = root.querySelector('form')!;
    formulario.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    httpMock.expectNone(baseUrl);
    expect(root.textContent).toContain('La contraseña del Gerente General es obligatoria.');

    escribir(root, 'contrasena-admin-puesto', 'secreta');
    formulario.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const alta = httpMock.expectOne(baseUrl);
    expect(alta.request.method).toBe('POST');
    expect(alta.request.body).toMatchObject({
      codigo_abreviatura: 'AUXADM',
      nombre_puesto: 'Auxiliar Administrativo',
      es_admin: true,
      contrasena_admin: 'secreta',
    });
    alta.flush({ mensaje: 'Puesto registrado correctamente.', puesto: { id: 4 } });
    httpMock.expectOne(baseUrl).flush({ puestos: [] });
  });
});

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

  it('agrupa activos antes que inactivos y combina búsqueda, puesto y estado', async () => {
    const empleados = [
      { id: 2, codigo_empleado: 'SUR-TEC-001', nombre: 'Ana', nombre_puesto: 'Técnico', puesto_id: 3, rol: 'Empleado', activo: 0 },
      { id: 3, codigo_empleado: 'SUR-TECINF-001', nombre: 'Bruno', nombre_puesto: 'Técnico Informático', puesto_id: 2, rol: 'ADMIN', activo: 1 },
      { id: 4, codigo_empleado: 'SUR-TEC-002', nombre: 'Carla', nombre_puesto: 'Técnico', puesto_id: 3, rol: 'Empleado', activo: 1 },
      { id: 5, codigo_empleado: 'SUR-TEC-003', nombre: 'Daniel', nombre_puesto: 'Técnico', puesto_id: 3, rol: 'Empleado', activo: 0 },
    ];
    const fixture = await crear(true, empleados);
    const root = fixture.nativeElement as HTMLElement;
    const grupos = () => Array.from(root.querySelectorAll('.employee-table-frame tbody'))
      .map((grupo) => grupo.textContent?.replace(/\s+/g, ' ').trim());
    expect(grupos()).toHaveLength(2);
    expect(grupos()[0]).toContain('Empleados activos 2');
    expect(grupos()[0]).toContain('Carla');
    expect(grupos()[0]).not.toContain('Ana');
    expect(grupos()[1]).toContain('Empleados inactivos 2');
    expect(grupos()[1]).toContain('Ana');
    expect(root.querySelector('.table-footer')?.textContent).toContain('4 de 4 empleados');

    const [puesto, estado] = Array.from(root.querySelectorAll<HTMLSelectElement>('.employee-filter select'));
    puesto.value = '3';
    puesto.dispatchEvent(new Event('change'));
    estado.value = 'inactivos';
    estado.dispatchEvent(new Event('change'));
    const busqueda = root.querySelector<HTMLInputElement>('input[aria-label="Buscar empleados"]')!;
    busqueda.value = 'ana';
    busqueda.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(grupos()).toHaveLength(1);
    expect(grupos()[0]).toContain('Empleados inactivos 1');
    expect(grupos()[0]).toContain('Ana');
    expect(grupos()[0]).not.toContain('Daniel');
    expect(root.querySelector('.table-footer')?.textContent).toContain('1 de 4 empleados');

    busqueda.value = 'sin coincidencia';
    busqueda.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(root.textContent).toContain('No hay empleados que coincidan con los filtros.');
    expect(root.querySelector('.table-footer')?.textContent).toContain('0 de 4 empleados');

    root.querySelector<HTMLButtonElement>('.employee-clear-filters')!.click();
    fixture.detectChanges();
    expect(busqueda.value).toBe('');
    expect(puesto.value).toBe('');
    expect(estado.value).toBe('todos');
    expect(grupos()).toHaveLength(2);
  });

  it('mueve a la sección de inactivos al empleado dado de baja', async () => {
    const empleado = {
      id: 2, codigo_empleado: 'SUR-TEC-001', nombre: 'Ana',
      nombre_puesto: 'Técnico', puesto_id: 3, rol: 'Empleado', activo: 1,
    };
    const fixture = await crear(true, [empleado]);
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('button[title="Dar de baja"]')!.click();
    fixture.detectChanges();
    escribir(root, 'contrasena-admin-baja', 'secreta');
    root.querySelector('#contrasena-admin-baja')!.closest('form')!.dispatchEvent(new Event('submit'));
    const baja = httpMock.expectOne(`${empleadosUrl}/2`);
    expect(baja.request.method).toBe('DELETE');
    baja.flush({ mensaje: 'Empleado dado de baja.' });
    httpMock.expectOne(empleadosUrl).flush({ empleados: [{ ...empleado, activo: 0 }] });
    fixture.detectChanges();

    expect(root.querySelector('.employee-group-heading')?.textContent).toContain('Empleados inactivos 1');
    expect(root.querySelector('button[title="Dar de baja"]')).toBeNull();
    expect(root.querySelector('button[title="Editar empleado"]')).not.toBeNull();
  });

  it('filtra por ficha incompleta y exporta solo lo filtrado a CSV', async () => {
    const base = { nombre_puesto: 'Técnico', puesto_id: 3, rol: 'Empleado', activo: 1 };
    const fixture = await crear(true, [
      { ...base, id: 2, codigo_empleado: 'SUR-TEC-001', nombre: 'Ana', ficha_completa: true },
      { ...base, id: 3, codigo_empleado: 'SUR-TEC-002', nombre: '=Bruno', ficha_completa: false },
    ]);
    const root = fixture.nativeElement as HTMLElement;
    const ficha = root.querySelectorAll<HTMLSelectElement>('.employee-filter select')[2];
    ficha.value = 'incompletas';
    ficha.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(root.querySelector('.table-footer')?.textContent).toContain('1 de 2 empleados');

    let blob: Blob | undefined;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((objeto) => { blob = objeto as Blob; return 'blob:x'; });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.includes('Exportar CSV'))!.click();

    const texto = await blob!.text();
    expect(texto).toContain('"\'=Bruno"');
    expect(texto).toContain('"Incompleta"');
    expect(texto).not.toContain('Ana');
    vi.restoreAllMocks();
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

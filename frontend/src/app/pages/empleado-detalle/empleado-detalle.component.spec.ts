import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { NotificacionesService } from '../../services/notificaciones.service';
import { EmpleadoDetalleComponent } from './empleado-detalle.component';

describe('EmpleadoDetalleComponent · ficha', () => {
  const base = '/api/rrhh/administracion/empleados/7';
  let httpMock: HttpTestingController;

  const detalle = (ficha: Record<string, unknown> = {}) => ({
    empleado: {
      id: 7, codigo_empleado: 'SUR-TEC-007', nombre: 'Ana', nombre_puesto: 'Técnico',
      puesto_id: 3, rol: 'Empleado', activo: 1,
    },
    ficha: {
      nombre_completo: null, dpi: null, fecha_nacimiento: null, correo: null,
      telefono: null, fecha_ingreso: null, cv_nombre: null, cv_actualizado_en: null, ...ficha,
    },
    indicadores: { dias_registrados_30d: 0, atrasos_30d: 0, puntualidad_30d: 0, horas_extras_30d: 0 },
    asistencias: [], evaluaciones: [], conocimiento: [], incidencias: [],
  });

  async function crear(ficha: Record<string, unknown> = {}) {
    await TestBed.configureTestingModule({
      imports: [EmpleadoDetalleComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: new BehaviorSubject(convertToParamMap({ id: '7' })) } },
        {
          provide: AuthService,
          useValue: {
            getUsuario: () => ({ id: 1, nombre: 'Admin', rol: 'ADMIN', codigo_empleado: 'SUR-GG-001' }),
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
    const fixture = TestBed.createComponent(EmpleadoDetalleComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${base}/detalle`).flush(detalle(ficha));
    fixture.detectChanges();
    return fixture;
  }

  function escribir(root: HTMLElement, id: string, valor: string): void {
    const input = root.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  afterEach(() => {
    httpMock?.verify();
    TestBed.resetTestingModule();
  });

  it('muestra el avance de la ficha y precarga los datos guardados', async () => {
    const fixture = await crear({ dpi: '1234567890123', correo: 'ana@correo.com', cv_nombre: 'cv.pdf' });
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.profile-progress')?.textContent).toContain('3');
    expect(root.querySelector<HTMLInputElement>('#ficha-dpi')!.value).toBe('1234567890123');
    expect(root.querySelector('.profile-cv')?.textContent).toContain('cv.pdf');
  });

  it('calcula la edad con la fecha de nacimiento', async () => {
    const fixture = await crear();
    const root = fixture.nativeElement as HTMLElement;
    const hoy = new Date();
    const nacimiento = `${hoy.getFullYear() - 30}-01-01`;
    escribir(root, 'ficha-nacimiento', nacimiento);
    fixture.detectChanges();
    expect(root.querySelector('.profile-age')?.textContent).toContain('30 años');
  });

  it('no envía una ficha con DPI inválido y guarda una válida sin guiones', async () => {
    const fixture = await crear();
    const root = fixture.nativeElement as HTMLElement;
    const formulario = root.querySelector('form.profile-grid')!;

    escribir(root, 'ficha-dpi', '123');
    formulario.dispatchEvent(new Event('submit'));
    httpMock.expectNone(`${base}/ficha`);

    escribir(root, 'ficha-dpi', '1234-56789-0123');
    escribir(root, 'ficha-telefono', '5555-1234');
    formulario.dispatchEvent(new Event('submit'));
    const peticion = httpMock.expectOne(`${base}/ficha`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toMatchObject({ dpi: '1234567890123', telefono: '55551234', correo: null });
    peticion.flush({ mensaje: 'Ficha actualizada.', ficha: { dpi: '1234567890123', telefono: '55551234' } });
    fixture.detectChanges();
    expect(root.textContent).toContain('Ficha actualizada.');
  });

  it('rechaza un currículum que no es PDF sin llamar al servidor', async () => {
    const fixture = await crear();
    const root = fixture.nativeElement as HTMLElement;
    const entrada = root.querySelector<HTMLInputElement>('#ficha-cv')!;
    const archivo = new File(['x'], 'cv.docx', { type: 'application/msword' });
    Object.defineProperty(entrada, 'files', { value: [archivo], configurable: true });
    entrada.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    httpMock.expectNone(`${base}/curriculum`);
    expect(root.textContent).toContain('El currículum debe estar en formato PDF.');
  });

  it('sube un currículum PDF y actualiza el nombre mostrado', async () => {
    const fixture = await crear();
    const root = fixture.nativeElement as HTMLElement;
    const entrada = root.querySelector<HTMLInputElement>('#ficha-cv')!;
    const archivo = new File(['%PDF-1.4'], 'mi-cv.pdf', { type: 'application/pdf' });
    Object.defineProperty(entrada, 'files', { value: [archivo], configurable: true });
    entrada.dispatchEvent(new Event('change'));

    const peticion = httpMock.expectOne(`${base}/curriculum`);
    expect(peticion.request.method).toBe('PUT');
    expect((peticion.request.body as FormData).get('curriculum')).toBeInstanceOf(File);
    peticion.flush({ mensaje: 'Currículum guardado.', cv_nombre: 'mi-cv.pdf' });
    fixture.detectChanges();
    expect(root.querySelector('.profile-cv')?.textContent).toContain('mi-cv.pdf');
  });
});

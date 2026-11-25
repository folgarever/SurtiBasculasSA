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

  async function crear(ficha: Record<string, unknown> = {}, registros: unknown[] = []) {
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
    httpMock.expectOne('/api/mi-ficha/foto').flush(null, { status: 404, statusText: 'Not Found' });
    httpMock.expectOne(`${base}/detalle`).flush(detalle(ficha));
    if (ficha['foto_nombre']) {
      httpMock.expectOne(`${base}/foto`).flush(null, { status: 404, statusText: 'Not Found' });
    }
    httpMock.expectOne(`${base}/ficha/auditoria`).flush({ registros });
    httpMock.expectOne(`${base}/documentos`).flush({ documentos: [] });
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

  it('muestra un campo para nombrar los documentos tipo otro', async () => {
    const fixture = await crear();
    const root = fixture.nativeElement as HTMLElement;
    const tipo = root.querySelector<HTMLSelectElement>('select[aria-label="Tipo de documento"]')!;

    tipo.value = 'otro';
    tipo.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(root.querySelector<HTMLInputElement>('input[aria-label="Nombre del documento"]')).not.toBeNull();
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
    httpMock.expectOne(`${base}/ficha/auditoria`).flush({ registros: [] });
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
    httpMock.expectOne(`${base}/ficha/auditoria`).flush({ registros: [] });
    fixture.detectChanges();
    expect(root.querySelector('.profile-cv')?.textContent).toContain('mi-cv.pdf');
  });

  it('muestra el historial de cambios sin exponer valores', async () => {
    const fixture = await crear({}, [
      { id: 3, accion: 'ficha_exportada', campos: 'pdf', creado_en: '2026-11-24 22:00:00', usuario: 'Admin' },
      { id: 2, accion: 'ficha', campos: 'dpi,correo', creado_en: '2026-11-24 21:00:00', usuario: 'Admin' },
      { id: 1, accion: 'cv_descarga', campos: 'cv', creado_en: '2026-11-24 20:00:00', usuario: null },
    ]);
    const texto = (fixture.nativeElement as HTMLElement).querySelector('.profile-audit')!.textContent!;
    expect(texto).toContain('Modificó: DPI, correo');
    expect(texto).toContain('Exportó la ficha a PDF');
    expect(texto).toContain('Consultó o descargó el currículum');
    expect(texto).toContain('Usuario eliminado');
  });

  it('impide exportar a PDF mientras hay cambios sin guardar', async () => {
    const fixture = await crear();
    const root = fixture.nativeElement as HTMLElement;
    const boton = Array.from(root.querySelectorAll<HTMLButtonElement>('.profile-actions button'))
      .find((elemento) => elemento.textContent?.includes('Exportar a PDF'))!;
    expect(boton.disabled).toBe(false);

    escribir(root, 'ficha-nombre', 'Ana Pérez');
    fixture.detectChanges();

    expect(boton.disabled).toBe(true);
    expect(root.querySelector('.profile-actions')?.textContent).toContain('Guarda los datos antes de exportar a PDF.');
    httpMock.expectNone(`${base}/ficha/exportar/pdf`);
  });

  it('genera y descarga el PDF con los datos guardados y registra la exportación', async () => {
    const fixture = await crear({
      nombre_completo: 'Ana Perez', dpi: '0123456789012', fecha_nacimiento: '1990-05-10',
      correo: 'ana@example.com', telefono: '55551234', fecha_ingreso: '2020-01-02',
    });
    const root = fixture.nativeElement as HTMLElement;
    const crearUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:ficha');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const descargar = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    Array.from(root.querySelectorAll<HTMLButtonElement>('.profile-actions button'))
      .find((elemento) => elemento.textContent?.includes('Exportar a PDF'))!.click();

    const registro = await vi.waitFor(() => httpMock.expectOne(`${base}/ficha/exportar/pdf`), { timeout: 5000 });
    expect(registro.request.method).toBe('POST');
    registro.flush({ mensaje: 'Exportación de ficha registrada.' });
    const auditoria = await vi.waitFor(() => httpMock.expectOne(`${base}/ficha/auditoria`));
    auditoria.flush({ registros: [] });
    expect(descargar).toHaveBeenCalledOnce();

    const archivo = crearUrl.mock.calls[0][0] as Blob;
    expect(archivo.type).toBe('application/pdf');
    const contenido = await new Promise<string>((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(String(lector.result));
      lector.onerror = () => reject(lector.error);
      lector.readAsText(archivo, 'iso-8859-1');
    });
    expect(contenido).toContain('%PDF-');
    expect(contenido).toContain('Ana Perez');
    expect(contenido).toContain('0123456789012');
    expect(contenido).toContain('10/05/1990');
    expect(contenido).toContain('ana@example.com');
    expect(contenido).toContain('02/01/2020');
    vi.restoreAllMocks();
  });

  it('informa el error si no se puede descargar la foto para el PDF', async () => {
    const fixture = await crear({ foto_nombre: 'foto.webp' });
    const root = fixture.nativeElement as HTMLElement;
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    Array.from(root.querySelectorAll<HTMLButtonElement>('.profile-actions button'))
      .find((elemento) => elemento.textContent?.includes('Exportar a PDF'))!.click();

    const foto = await vi.waitFor(() => httpMock.expectOne(`${base}/foto`), { timeout: 5000 });
    foto.flush(null, { status: 500, statusText: 'Error' });
    await vi.waitFor(() => expect(error).toHaveBeenCalledOnce());
    fixture.detectChanges();

    expect(root.querySelector('.alert-error')?.textContent).toContain('No se pudo exportar la ficha a PDF');
    httpMock.expectNone(`${base}/ficha/exportar/pdf`);
    vi.restoreAllMocks();
  });

  it('abre la vista previa del currículum y la cierra', async () => {
    const fixture = await crear({ cv_nombre: 'cv.pdf' });
    const root = fixture.nativeElement as HTMLElement;
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:cv');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    Array.from(root.querySelectorAll('.profile-cv-actions button'))
      .find((boton) => boton.textContent?.includes('Ver'))!.dispatchEvent(new Event('click'));
    httpMock.expectOne(`${base}/curriculum`).flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
    httpMock.expectOne(`${base}/ficha/auditoria`).flush({ registros: [] });
    fixture.detectChanges();
    expect(root.querySelector('iframe.profile-preview-frame')).not.toBeNull();

    root.querySelector<HTMLButtonElement>('button[aria-label="Cerrar vista previa"]')!.click();
    fixture.detectChanges();
    expect(root.querySelector('iframe.profile-preview-frame')).toBeNull();
    vi.restoreAllMocks();
  });
});

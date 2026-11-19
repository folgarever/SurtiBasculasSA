import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  contarRespuestasNuevas,
  marcadorRespuesta,
  Sugerencia,
  SugerenciasService,
  sugerenciaRespondida,
} from './sugerencias.service';

describe('SugerenciasService', () => {
  const baseUrl = '/api/sugerencias';
  let servicio: SugerenciasService;
  let httpMock: HttpTestingController;

  const anonimaRespondida: Sugerencia = {
    id: 3,
    folio: 'SG-2026-00003',
    titulo: 'Más mesas',
    descripcion: 'Debería haber más mesas en el comedor.',
    anonima: true,
    creado_en: '2026-11-18 09:15:00',
    respuesta: 'Se instalarán mesas el próximo mes.',
    respondido_en: '2026-11-18 14:30:00',
    respondido_por: 'Mafer García',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(SugerenciasService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('envía el indicador de anonimato al crear una sugerencia', () => {
    const datos = {
      titulo: 'Más mesas',
      descripcion: 'Debería haber más mesas en el comedor.',
      anonima: true,
    };
    servicio.crearSugerencia(datos).subscribe(({ sugerencia }) => {
      expect(sugerencia.folio).toBe('SG-2026-00003');
    });

    const peticion = httpMock.expectOne(`${baseUrl}/mis-sugerencias`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(datos);
    peticion.flush({
      mensaje: 'Tu sugerencia fue enviada.',
      sugerencia: { id: 3, folio: 'SG-2026-00003' },
    });
  });

  it('obtiene las sugerencias propias con folio, anonimato y respuesta', () => {
    servicio.obtenerMisSugerencias().subscribe(({ sugerencias }) => {
      expect(sugerencias[0].folio).toBe('SG-2026-00003');
      expect(sugerencias[0].anonima).toBe(true);
      expect(sugerencias[0].respuesta).toBe('Se instalarán mesas el próximo mes.');
      expect(sugerencias[0].respondido_por).toBe('Mafer García');
    });

    const peticion = httpMock.expectOne(`${baseUrl}/mis-sugerencias`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush({ sugerencias: [anonimaRespondida] });
  });

  it('obtiene sugerencias ADMIN con la identidad enmascarada', () => {
    servicio.obtenerTodas().subscribe(({ sugerencias }) => {
      expect(sugerencias[0].anonima).toBe(true);
      expect(sugerencias[0].empleado).toBe('Anónimo');
      expect(sugerencias[0].codigo_empleado).toBeNull();
      expect(sugerencias[1].anonima).toBe(false);
      expect(sugerencias[1].empleado).toBe('Mafer García');
    });

    const peticion = httpMock.expectOne(`${baseUrl}/admin`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush({
      sugerencias: [
        { ...anonimaRespondida, respuesta: null, respondido_en: null, respondido_por: null, empleado: 'Anónimo', codigo_empleado: null },
        {
          id: 2,
          folio: 'SG-2026-00002',
          titulo: 'Mejor señal',
          descripcion: 'La señal de internet es inestable.',
          anonima: false,
          creado_en: '2026-11-17 10:00:00',
          respuesta: 'Ya se revisó el router.',
          respondido_en: '2026-11-17 16:00:00',
          respondido_por: 'Héctor Ortiz',
          empleado: 'Mafer García',
          codigo_empleado: 'SUR-AC-002',
        },
      ],
    });
  });

  it('cuenta una respuesta como nueva hasta que su marcador se guarda como vista', () => {
    expect(sugerenciaRespondida(anonimaRespondida)).toBe(true);
    expect(contarRespuestasNuevas([anonimaRespondida], {})).toBe(1);

    const vistas = { [anonimaRespondida.id]: marcadorRespuesta(anonimaRespondida) };
    expect(contarRespuestasNuevas([anonimaRespondida], vistas)).toBe(0);

    const sinRespuesta: Sugerencia = { ...anonimaRespondida, respuesta: null, respondido_en: null };
    expect(sugerenciaRespondida(sinRespuesta)).toBe(false);
    expect(contarRespuestasNuevas([sinRespuesta], {})).toBe(0);
  });
});

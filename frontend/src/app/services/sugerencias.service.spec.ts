import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SugerenciasService } from './sugerencias.service';

describe('SugerenciasService', () => {
  const baseUrl = '/api/sugerencias';
  let servicio: SugerenciasService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(SugerenciasService);
    httpMock = TestBed.inject(HttpTestingController);
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
    servicio.crearSugerencia(datos).subscribe();

    const peticion = httpMock.expectOne(`${baseUrl}/mis-sugerencias`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(datos);
    peticion.flush({ mensaje: 'Tu sugerencia fue enviada.' });
  });

  it('obtiene las sugerencias propias con anonimato y respuesta', () => {
    servicio.obtenerMisSugerencias().subscribe(({ sugerencias }) => {
      expect(sugerencias[0].anonima).toBe(true);
      expect(sugerencias[0].respuesta).toBe('Se instalarán mesas el próximo mes.');
      expect(sugerencias[0].respondido_por).toBe('Mafer García');
    });

    const peticion = httpMock.expectOne(`${baseUrl}/mis-sugerencias`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush({
      sugerencias: [{
        id: 3,
        titulo: 'Más mesas',
        descripcion: 'Debería haber más mesas en el comedor.',
        anonima: true,
        creado_en: '2026-11-18 09:15:00',
        respuesta: 'Se instalarán mesas el próximo mes.',
        respondido_en: '2026-11-18 14:30:00',
        respondido_por: 'Mafer García',
      }],
    });
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
        {
          id: 3,
          titulo: 'Más mesas',
          descripcion: 'Debería haber más mesas en el comedor.',
          anonima: true,
          creado_en: '2026-11-18 09:15:00',
          respuesta: null,
          respondido_en: null,
          respondido_por: null,
          empleado: 'Anónimo',
          codigo_empleado: null,
        },
        {
          id: 2,
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
});

import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EvaluacionesSeleccionService } from './evaluaciones-seleccion.service';

describe('EvaluacionesSeleccionService', () => {
  const baseUrl = '/api/evaluaciones-seleccion';
  let servicio: EvaluacionesSeleccionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(EvaluacionesSeleccionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('envía la versión de la plantilla que vio el candidato al entregar', () => {
    const respuestas = { 'aptitudes-0': 'A' };
    servicio.entregarPruebaCandidato(respuestas, 42).subscribe();

    const peticion = httpMock.expectOne(`${baseUrl}/candidato/entregar`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({
      respuestas,
      plantilla_version_id: 42,
    });
    peticion.flush({ mensaje: 'Entregada', resultado: {} });
  });

  it('envía versión nula cuando la prueba viene del configuración base', () => {
    servicio.entregarPruebaCandidato({}).subscribe();

    const peticion = httpMock.expectOne(`${baseUrl}/candidato/entregar`);
    expect(peticion.request.body.plantilla_version_id).toBeNull();
    peticion.flush({ mensaje: 'Entregada', resultado: {} });
  });

  it('expone los endpoints ADMIN de plantillas versionadas', () => {
    servicio.listarPlantillasAdmin().subscribe();
    expect(httpMock.expectOne(`${baseUrl}/admin/plantillas`).request.method).toBe('GET');

    servicio.obtenerDetallePlantilla(7).subscribe();
    expect(httpMock.expectOne(`${baseUrl}/admin/plantillas/7`).request.method).toBe('GET');

    servicio.publicarPlantilla(7).subscribe();
    expect(httpMock.expectOne(`${baseUrl}/admin/plantillas/7/publicar`).request.method).toBe('POST');

    servicio.activarPlantilla(7, false).subscribe();
    const activacion = httpMock.expectOne(`${baseUrl}/admin/plantillas/7/activa`);
    expect(activacion.request.body).toEqual({ activa: false });

    servicio.restaurarVersionPlantilla(7, 3).subscribe();
    expect(httpMock.expectOne(`${baseUrl}/admin/plantillas/7/versiones/3/restaurar`).request.method).toBe('POST');

    httpMock.match(() => true).forEach((peticion) => peticion.flush({ plantillas: [], plantilla: {} }));
  });

  it('envía el perfil editado y las acciones de cuenta como ADMIN', () => {
    const curriculum = new File(['%PDF-1.4'], 'cv.pdf', { type: 'application/pdf' });
    servicio.actualizarPerfilCandidato(5, {
      nombres: 'Ana',
      apellidos: 'Pérez',
      fecha_nacimiento: '1998-04-12',
      puesto_id: 3,
      curriculum,
    }).subscribe();

    const edicion = httpMock.expectOne(`${baseUrl}/admin/candidatos/5/perfil`);
    expect(edicion.request.method).toBe('PUT');
    expect(edicion.request.body.get('nombres')).toBe('Ana');
    expect(edicion.request.body.get('puesto_id')).toBe('3');
    expect(edicion.request.body.get('curriculum')).toBe(curriculum);

    servicio.cambiarActivoCuenta(9, false).subscribe();
    expect(httpMock.expectOne(`${baseUrl}/admin/candidatos/acceso/9/estado`).request.body).toEqual({ activo: false });

    servicio.eliminarCuenta(9).subscribe();
    expect(httpMock.expectOne(`${baseUrl}/admin/candidatos/acceso/9`).request.method).toBe('DELETE');

    httpMock.match(() => true).forEach((peticion) => peticion.flush({ mensaje: 'OK', candidato: {} }));
  });
});

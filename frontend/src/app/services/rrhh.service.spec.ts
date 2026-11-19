import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RrhhService } from './rrhh.service';

describe('RrhhService', () => {
  const baseUrl = '/api/rrhh';
  let servicio: RrhhService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(RrhhService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('consulta el detalle integral y las incidencias de un empleado', () => {
    servicio.obtenerDetalleEmpleado(7).subscribe();
    servicio.obtenerIncidencias(7).subscribe();

    const detalle = httpMock.expectOne(`${baseUrl}/administracion/empleados/7/detalle`);
    const incidencias = httpMock.expectOne(
      (peticion) => peticion.url === `${baseUrl}/incidencias`
        && peticion.params.get('empleado_id') === '7',
    );

    expect(detalle.request.method).toBe('GET');
    expect(incidencias.request.method).toBe('GET');
    detalle.flush({ indicadores: {}, asistencias: [], evaluaciones: [], conocimiento: [], incidencias: [] });
    incidencias.flush({ incidencias: [] });
  });

  it('envía el filtro de empleado al reporte de asistencias', () => {
    servicio.obtenerAsistencias({ empleado_id: 4 }).subscribe();
    servicio.descargarExcel({ empleado_id: 4 }).subscribe();

    const peticiones = httpMock.match(
      (peticion) => peticion.params.get('empleado_id') === '4',
    );
    expect(peticiones.length).toBe(2);
    peticiones.forEach((peticion) => expect(peticion.request.method).toBe('GET'));
    peticiones[0].flush({ asistencias: [] });
    peticiones[1].flush(new Blob());
  });
});

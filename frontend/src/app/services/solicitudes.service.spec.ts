import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SolicitudesService } from './solicitudes.service';

describe('SolicitudesService', () => {
  let servicio: SolicitudesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(SolicitudesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('envía solicitudes de ausencia y consulta las del empleado', () => {
    const datos = {
      tipo: 'vacaciones' as const,
      fecha_inicio: '2026-12-01',
      fecha_fin: '2026-12-05',
      motivo: 'Descanso anual',
    };
    servicio.crear(datos).subscribe();
    servicio.obtenerMias().subscribe();

    const alta = httpMock.expectOne('/api/solicitudes');
    const propias = httpMock.expectOne('/api/solicitudes/mias');
    expect(alta.request.method).toBe('POST');
    expect(alta.request.body).toEqual(datos);
    expect(propias.request.method).toBe('GET');
    alta.flush({ mensaje: 'Solicitud enviada.', id: 8 });
    propias.flush({ solicitudes: [] });
  });

  it('usa endpoints de administración para resolver solicitudes', () => {
    servicio.obtenerAdministracion().subscribe();
    servicio.aprobar(8).subscribe();
    servicio.rechazar(9, 'No hay cobertura').subscribe();

    const lista = httpMock.expectOne('/api/solicitudes/administracion');
    const aprobacion = httpMock.expectOne('/api/solicitudes/8/aprobar');
    const rechazo = httpMock.expectOne('/api/solicitudes/9/rechazar');
    expect(lista.request.method).toBe('GET');
    expect(aprobacion.request.method).toBe('PUT');
    expect(rechazo.request.body).toEqual({ motivo: 'No hay cobertura' });
    lista.flush({ solicitudes: [] });
    aprobacion.flush({ mensaje: 'Aprobada.', estado: 'aprobada' });
    rechazo.flush({ mensaje: 'Rechazada.', estado: 'rechazada' });
  });
});

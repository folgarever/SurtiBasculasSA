import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  EvaluacionesConocimientoService,
  formatoPeriodoEvaluacion,
} from './evaluaciones-conocimiento.service';

describe('EvaluacionesConocimientoService', () => {
  const baseUrl = '/api/evaluaciones-conocimiento';
  let servicio: EvaluacionesConocimientoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(EvaluacionesConocimientoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('formata los tres tipos de periodo', () => {
    const mensual = formatoPeriodoEvaluacion('2026-11');
    const quincenal = formatoPeriodoEvaluacion('2026-11-Q2');
    const semanal = formatoPeriodoEvaluacion('2026-W47');

    expect(mensual).toContain('2026');
    expect(quincenal).toContain('2.ª quincena');
    expect(quincenal).toContain('2026');
    expect(semanal).toBe('Semana 47 de 2026');
  });

  it('envía el periodo en todas las operaciones del banco', () => {
    const url = `${baseUrl}/admin/banco/3/preguntas`;
    servicio.obtenerBancoAdmin(3, '2026-11-Q2').subscribe();
    servicio.crearPreguntaAdmin(3, '2026-11-Q2', {
      texto: 'Pregunta',
      puntos_maximos: 1,
      opciones: [],
    }).subscribe();
    servicio.editarPreguntaAdmin(3, '2026-11-Q2', 7, {
      texto: 'Pregunta',
      puntos_maximos: 1,
      opciones: [],
    }).subscribe();
    servicio.eliminarPreguntaAdmin(3, '2026-11-Q2', 7).subscribe();

    const peticiones = httpMock.match((peticion) => peticion.url.startsWith(url));
    expect(peticiones.length).toBe(4);
    for (const peticion of peticiones) {
      expect(peticion.request.params.get('periodo')).toBe('2026-11-Q2');
    }
    expect(peticiones.map((peticion) => peticion.request.method)).toEqual(['GET', 'POST', 'PUT', 'DELETE']);
    peticiones.forEach((peticion) => peticion.flush({ periodo: '2026-11-Q2', preguntas: [], mensaje: 'OK' }));
  });

  it('actualiza la frecuencia del puesto como ADMIN', () => {
    servicio.actualizarFrecuenciaPuestoAdmin(5, 'semanal').subscribe();

    const peticion = httpMock.expectOne(`${baseUrl}/admin/puestos/5/frecuencia`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual({ frecuencia: 'semanal' });
    peticion.flush({ mensaje: 'OK', puesto: {} });
  });
});

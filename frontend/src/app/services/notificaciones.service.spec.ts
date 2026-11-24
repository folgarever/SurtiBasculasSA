import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { NotificacionesService } from './notificaciones.service';

describe('NotificacionesService', () => {
  let servicio: NotificacionesService;
  let httpMock: HttpTestingController;
  let usuario: { id: number; codigo_empleado: string; role: string } | null;
  let admin: boolean;
  let candidato: boolean;

  const respondida = {
    id: 3,
    folio: 'SG-2026-00003',
    titulo: 'Más mesas',
    descripcion: 'Más mesas en el comedor.',
    anonima: false,
    creado_en: '2026-11-18 09:00:00',
    respuesta: 'Se instalarán mesas.',
    respondido_en: '2026-11-18 14:00:00',
    respondido_por: 'Mafer García',
  };

  const sinResponder = {
    id: 4,
    folio: 'SG-2026-00004',
    titulo: 'Mejor señal',
    descripcion: 'La señal es inestable.',
    anonima: true,
    creado_en: '2026-11-19 09:00:00',
    respuesta: null,
    respondido_en: null,
    respondido_por: null,
  };

  const evaluacionPendiente = {
    puesto: 'Técnico',
    frecuencia_evaluacion: 'mensual',
    periodo_actual: '2026-11',
    evaluacion_actual: {
      id: 21,
      empleado_id: 7,
      puesto_id: 2,
      nombre_puesto: 'Técnico',
      periodo: '2026-11',
      estado: 'pendiente',
      total_preguntas: 5,
    },
    historial: [],
  };

  beforeEach(() => {
    localStorage.clear();
    usuario = { id: 7, codigo_empleado: 'SUR-AUXTEC-010', role: 'EMPLOYEE' };
    admin = false;
    candidato = false;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            getUsuario: () => usuario,
            hasAdminRole: () => admin,
            isCandidate: () => candidato,
          },
        },
      ],
    });
    servicio = TestBed.inject(NotificacionesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('muestra respuestas nuevas y evaluaciones pendientes al empleado', () => {
    servicio.cargar();

    httpMock.expectOne((peticion) => peticion.url.endsWith('/sugerencias/mis-sugerencias'))
      .flush({ sugerencias: [respondida, sinResponder] });
    httpMock.expectOne((peticion) => peticion.url.endsWith('/evaluaciones-conocimiento/mi'))
      .flush(evaluacionPendiente);

    expect(servicio.items().map((item) => item.id)).toEqual(['respuesta-3', 'evaluacion-21']);
    expect(servicio.noLeidos()).toBe(2);

    servicio.marcarLeido(servicio.items()[0]);
    expect(servicio.noLeidos()).toBe(1);
    expect(JSON.parse(localStorage.getItem('surtibasculas_sugerencias_respuestas_vistas') ?? '{}')['3'])
      .toBe('2026-11-18 14:00:00::Se instalarán mesas.');

    servicio.marcarTodos();
    expect(servicio.noLeidos()).toBe(0);
    const guardado = JSON.parse(localStorage.getItem('surtibasculas_notificaciones_vistas:7') ?? '{}');
    expect(guardado['evaluacion-21']).toBe('2026-11:21');
  });

  it('muestra pendientes y resultados para el administrador', () => {
    admin = true;
    servicio.cargar();

    httpMock.expectOne((peticion) => peticion.url.endsWith('/sugerencias/admin'))
      .flush({ sugerencias: [respondida, sinResponder] });
    httpMock.expectOne((peticion) => peticion.url.endsWith('/dashboard/admin'))
      .flush({
        periodo: '2026-11',
        resumen: {
          evaluaciones_pendientes: 2,
          candidatos_registro: 1,
          candidatos_completados: 3,
        },
      });
    httpMock.expectOne((peticion) => peticion.url.endsWith('/rrhh/administracion/empleados'))
      .flush({ empleados: [] });

    expect(servicio.items().map((item) => item.id)).toEqual([
      'sugerencias-pendientes',
      'evaluaciones-pendientes',
      'candidatos-registro',
      'seleccion-resultados',
    ]);
    expect(servicio.items()[0].marcador).toBe('4');
    expect(servicio.noLeidos()).toBe(4);

    servicio.marcarTodos();
    expect(servicio.noLeidos()).toBe(0);
  });

  it('avisa al administrador de las fichas de empleados activos sin completar', () => {
    admin = true;
    servicio.cargar();

    httpMock.expectOne((peticion) => peticion.url.endsWith('/sugerencias/admin')).flush({ sugerencias: [] });
    httpMock.expectOne((peticion) => peticion.url.endsWith('/dashboard/admin')).flush({
      periodo: '2026-11',
      resumen: { evaluaciones_pendientes: 0, candidatos_registro: 0, candidatos_completados: 0 },
    });
    httpMock.expectOne((peticion) => peticion.url.endsWith('/rrhh/administracion/empleados')).flush({
      empleados: [
        { id: 5, activo: 1, ficha_completa: false },
        { id: 2, activo: 1, ficha_completa: false },
        { id: 8, activo: 1, ficha_completa: true },
        { id: 9, activo: 0, ficha_completa: false },
      ],
    });

    expect(servicio.items()).toHaveLength(1);
    expect(servicio.items()[0]).toMatchObject({
      id: 'fichas-incompletas',
      ruta: '/admin/empleados',
      marcador: '2,5',
      tipo: 'empleado',
    });
  });

  it('no falla si el servidor responde sin la lista de sugerencias', () => {
    admin = true;
    servicio.cargar();

    httpMock.expectOne((peticion) => peticion.url.endsWith('/sugerencias/admin')).flush({});
    httpMock.expectOne((peticion) => peticion.url.endsWith('/dashboard/admin')).flush(null);
    httpMock.expectOne((peticion) => peticion.url.endsWith('/rrhh/administracion/empleados')).flush({});

    expect(servicio.items()).toEqual([]);
    expect(servicio.cargando()).toBe(false);
  });

  it('muestra el resultado de selección al candidato', () => {
    candidato = true;
    usuario = { id: 12, codigo_empleado: 'CANDIDATO-2026-001', role: 'CANDIDATE' };
    servicio.cargar();

    httpMock.expectOne((peticion) => peticion.url.endsWith('/evaluaciones-seleccion/candidato/mi'))
      .flush({ candidato: { id: 9, estado: 'evaluada', decision: 'recomendable', numero_intento: 1 } });

    expect(servicio.items()).toHaveLength(1);
    expect(servicio.items()[0].titulo).toBe('Resultado de tu evaluación');
    expect(servicio.items()[0].detalle).toBe('Recomendable para el puesto');
    expect(servicio.noLeidos()).toBe(1);
  });

  it('respeta los marcadores guardados para cada usuario', () => {
    admin = true;
    localStorage.setItem(
      'surtibasculas_notificaciones_vistas:7',
      JSON.stringify({ 'sugerencias-pendientes': '4' }),
    );
    servicio.cargar();

    httpMock.expectOne((peticion) => peticion.url.endsWith('/sugerencias/admin'))
      .flush({ sugerencias: [sinResponder] });
    httpMock.expectOne((peticion) => peticion.url.endsWith('/dashboard/admin'))
      .flush({ periodo: '2026-11', resumen: {
        evaluaciones_pendientes: 0,
        candidatos_registro: 0,
        candidatos_completados: 0,
      } });
    httpMock.expectOne((peticion) => peticion.url.endsWith('/rrhh/administracion/empleados'))
      .flush({ empleados: [] });

    expect(servicio.noLeidos()).toBe(0);
  });
});

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { AuthService } from '../../services/auth.service';
import { NotificacionesService } from '../../services/notificaciones.service';

describe('AdminDashboardComponent', () => {
  let httpMock: HttpTestingController;

  const respuesta = {
    actualizado_en: '2026-11-18T12:00:00.000Z',
    periodo: '2026-11',
    fecha: '2026-11-18',
    resumen: {
      empleados_activos: 10,
      empleados_inactivos: 1,
      marcaciones_hoy: 10,
      empleados_presentes: 9,
      llegadas_tarde_hoy: 2,
      puntualidad_hoy: 80,
      evaluaciones_pendientes: 4,
      evaluaciones_completadas: 6,
      evaluaciones_desempeno_mes: 3,
      sugerencias_pendientes: 2,
      sugerencias_totales: 7,
      candidatos_registro: 1,
      candidatos_completados: 5,
      incidencias_vigentes: 1,
    },
    asistencia_semanal: [],
    distribucion_puestos: [{ puesto: 'Técnico', total: 4 }],
    actividad_reciente: [],
    comparativo: {
      marcaciones_ayer: 8,
      atrasos_ayer: 1,
      puntualidad_ayer: 88,
      sugerencias_actual: 2,
      sugerencias_anterior: 4,
      evaluaciones_actual: 3,
      evaluaciones_anterior: 2,
    },
    tendencias: {
      asistencia: [6, 7, 8, 9, 7, 8, 10],
      puntualidad: [80, 85, 88, 90, 86, 88, 80],
      sugerencias: [0, 1, 0, 2, 1, 0, 2],
      evaluaciones: [1, 0, 1, 0, 2, 0, 1],
    },
    tendencias_mensuales: [{
      periodo: '2026-11',
      asistencias: 30,
      horas_extras_aprobadas: 4,
      evaluaciones_completadas: 6,
      candidatos_nuevos: 2,
    }],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
        { provide: AuthService, useValue: {
                  getUsuario: () => ({ nombre: 'Héctor', rol: 'ADMIN' }),
          hasEvaluationRole: () => true,
          hasAdminRole: () => true,
          esGerenteGeneral: () => true,
        } },
        {
          provide: NotificacionesService,
          useValue: {
            cargar: vi.fn(),
            items: signal([]),
            noLeidos: signal(0),
            total: signal(0),
            cargando: signal(false),
            error: signal(''),
            estaLeido: () => false,
            marcarLeido: vi.fn(),
            marcarTodos: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('carga los indicadores reales del panel', () => {
    const fixture = TestBed.createComponent(AdminDashboardComponent);
    fixture.detectChanges();

    const peticion = httpMock.expectOne((req) => req.url.endsWith('/dashboard/admin'));
    expect(peticion.request.method).toBe('GET');
    peticion.flush(respuesta);
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Panel de administración');
    expect(texto).toContain('10');
    expect(texto).toContain('Presentes hoy');
    expect(texto).toContain('Foco del día');
    expect((fixture.nativeElement.querySelector('.kpi-ring') as HTMLElement | null)?.getAttribute('aria-label')).toContain('80%');
    expect(fixture.nativeElement.querySelector('.goal-strip')?.textContent).toContain('META DEL DÍA');
    expect(fixture.nativeElement.querySelector('.sparkline polyline')?.getAttribute('points')).toContain(',');
    expect(fixture.nativeElement.querySelector('.module-grid a[href="/solicitudes"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.module-grid a[href="/admin/sugerencias"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.panel-trend-monthly')?.textContent)
      .toContain('Horas extra aprobadas');
    expect(fixture.nativeElement.querySelector('.panel-trend-monthly')?.textContent)
      .toContain('Candidatos nuevos');
    expect(fixture.componentInstance.resumen()?.puntualidad_hoy).toBe(80);
  });

  it('presenta los pendientes junto a la asistencia y describe los días sin marcaciones', () => {
    const fixture = TestBed.createComponent(AdminDashboardComponent);
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url.endsWith('/dashboard/admin')).flush(respuesta);
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('.panel-grid') as HTMLElement;
    expect(panel.querySelector('.panel-asistencia')).not.toBeNull();
    expect(panel.querySelector('.panel-pendientes')).not.toBeNull();
    expect(panel.querySelector('[aria-label="Detalle de asistencia de los últimos siete días"]')?.textContent)
      .toContain('0 marcaciones, 0 atrasos');
    expect((panel.querySelector('.bar-primary') as HTMLElement).style.height).toBe('0%');
  });

  it('muestra un error y permite reintentar si falla la carga', () => {
    const fixture = TestBed.createComponent(AdminDashboardComponent);
    fixture.detectChanges();

    httpMock.expectOne((req) => req.url.endsWith('/dashboard/admin')).flush('error', { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    const alerta = fixture.nativeElement.querySelector('.alert-error') as HTMLElement | null;
    expect(alerta?.textContent).toContain('No se pudieron cargar los indicadores');

    fixture.componentInstance.cargar();
    httpMock.expectOne((req) => req.url.endsWith('/dashboard/admin')).flush(respuesta);
    expect(fixture.componentInstance.resumen()?.empleados_activos).toBe(10);
  });
});

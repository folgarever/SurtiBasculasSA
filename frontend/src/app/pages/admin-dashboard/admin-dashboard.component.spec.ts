import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { AuthService } from '../../services/auth.service';

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
        } },
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
    expect(fixture.componentInstance.resumen()?.puntualidad_hoy).toBe(80);
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

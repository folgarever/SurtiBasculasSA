import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AsistenciaService } from '../../services/asistencia.service';
import { AuthService } from '../../services/auth.service';
import { EvaluacionesConocimientoService } from '../../services/evaluaciones-conocimiento.service';
import { NotificacionesService } from '../../services/notificaciones.service';
import { SugerenciasService } from '../../services/sugerencias.service';
import { EmpleadoDashboardComponent } from './empleado-dashboard.component';

describe('EmpleadoDashboardComponent', () => {
  const auth = {
    getUsuario: () => ({ nombre: 'Usuario' }),
    hasAdminRole: vi.fn(),
    esGerenteGeneral: () => false,
    hasRrhhRole: () => false,
    hasEvaluationRole: () => false,
    isCandidate: () => false,
  };
  const sugerencias = { obtenerMisSugerencias: vi.fn(() => of({ sugerencias: [] })) };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [EmpleadoDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: AsistenciaService, useValue: { obtenerHistorial: () => of({ marcaciones: [] }) } },
        { provide: SugerenciasService, useValue: sugerencias },
        { provide: EvaluacionesConocimientoService, useValue: { obtenerMiEvaluacion: () => of({ evaluacion_actual: null, periodo_actual: '' }) } },
        { provide: NotificacionesService, useValue: {
          cargar: vi.fn(), items: signal([]), noLeidos: signal(0), total: signal(0),
          cargando: signal(false), estaLeido: () => false,
        } },
      ],
    }).compileComponents();
  });

  it('no ofrece ni solicita sugerencias personales a un administrador', () => {
    auth.hasAdminRole.mockReturnValue(true);
    const fixture = TestBed.createComponent(EmpleadoDashboardComponent);
    fixture.detectChanges();

    expect(sugerencias.obtenerMisSugerencias).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.suggestion-tracker-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/evaluaciones-conocimiento"]')).not.toBeNull();
    fixture.destroy();
  });

  it('mantiene el seguimiento de sugerencias para empleados', () => {
    auth.hasAdminRole.mockReturnValue(false);
    const fixture = TestBed.createComponent(EmpleadoDashboardComponent);
    fixture.detectChanges();

    expect(sugerencias.obtenerMisSugerencias).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('.suggestion-tracker-card')).not.toBeNull();
    fixture.destroy();
  });
});

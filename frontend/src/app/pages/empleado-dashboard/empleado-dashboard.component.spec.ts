import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AsistenciaService } from '../../services/asistencia.service';
import { AuthService } from '../../services/auth.service';
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

  it.each([true, false])('mantiene solo las tarjetas de solicitudes y horas extras (admin: %s)', (esAdmin) => {
    auth.hasAdminRole.mockReturnValue(esAdmin);
    const fixture = TestBed.createComponent(EmpleadoDashboardComponent);
    fixture.detectChanges();

    const tarjetas = fixture.nativeElement.querySelectorAll('.portal-cards .portal-card');
    expect(tarjetas.length).toBe(2);
    expect(tarjetas[0].textContent).toContain('Vacaciones y permisos');
    expect(tarjetas[1].textContent).toContain('MIS HORAS EXTRAS');
    expect(fixture.nativeElement.querySelector('.portal-cards a[href="/evaluaciones-conocimiento"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.sidebar-nav a[href="/evaluaciones-conocimiento"]')).not.toBeNull();
    fixture.destroy();
  });
});

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { DatosEvaluacion, EvaluacionesService } from '../../services/evaluaciones.service';
import { EvaluacionesComponent } from './evaluaciones.component';

describe('EvaluacionesComponent', () => {
  const crear = vi.fn((_datos: DatosEvaluacion) => of({ mensaje: 'Guardada', id: 1 }));

  beforeEach(async () => {
    crear.mockClear();
    await TestBed.configureTestingModule({
      imports: [EvaluacionesComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { getUsuario: () => null } },
        {
          provide: EvaluacionesService,
          useValue: {
            obtenerEmpleados: () => of({ empleados: [{
              id: 1, codigo_empleado: 'SUR-JM-005', nombre: 'Jefatura',
              nombre_puesto: 'Jefe de Mantenimiento', dias_registrados_30d: 0,
              atrasos_30d: 0, puntualidad_30d: 100,
            }] }),
            listar: () => of({ evaluaciones: [] }),
            crear,
          },
        },
      ],
    }).compileComponents();
  });

  it('permite calificar criterios generales de forma independiente', () => {
    const fixture = TestBed.createComponent(EvaluacionesComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const grupos = root.querySelectorAll<HTMLElement>('.criteria-section .score-options');
    const presentacion = grupos[0].querySelectorAll<HTMLInputElement>('input');
    const desempeno = grupos[1].querySelectorAll<HTMLInputElement>('input');

    presentacion[0].click();
    desempeno[1].click();
    presentacion[2].click();
    fixture.detectChanges();

    expect(presentacion[0].checked).toBe(false);
    expect(presentacion[2].checked).toBe(true);
    expect(desempeno[1].checked).toBe(true);
  });

  it('guarda las calificaciones generales y especializadas seleccionadas', () => {
    const fixture = TestBed.createComponent(EvaluacionesComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const empleado = root.querySelector<HTMLSelectElement>('#empleado-evaluacion')!;
    empleado.value = '1';
    empleado.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const grupos = root.querySelectorAll<HTMLElement>('.score-options');
    expect(grupos.length).toBe(14);
    grupos.forEach((grupo, indice) => {
      grupo.querySelectorAll<HTMLInputElement>('input')[indice % 5].click();
    });
    fixture.detectChanges();
    root.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(crear).toHaveBeenCalledOnce();
    expect(crear.mock.calls[0][0]).toMatchObject({
      empleado_id: 1,
      calificaciones: { presentacion: 1, desempeno: 2, atencion_cliente: 3, puntualidad: 4, conocimientos: 5 },
      especializada: { supervision_operaciones: 1, gestion_liderazgo_campo: 2, organizacion_planificacion: 4 },
    });
  });
});

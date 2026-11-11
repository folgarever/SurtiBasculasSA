import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import {
  EvaluacionesSeleccionService,
  PuestoPruebaCandidato,
  RegistroCandidatoSeleccion,
} from '../../services/evaluaciones-seleccion.service';

@Component({
  selector: 'app-seleccion-candidato',
  standalone: true,
  templateUrl: './seleccion-candidato.component.html',
  styleUrl: './seleccion-candidato.component.css',
})
export class SeleccionCandidatoComponent implements OnInit {
  private readonly servicio = inject(EvaluacionesSeleccionService);
  private readonly auth = inject(AuthService);

  protected readonly plantillas = signal<PuestoPruebaCandidato[]>([]);
  protected readonly candidato = signal<RegistroCandidatoSeleccion | null>(null);
  protected readonly respuestas = signal<Record<string, string>>({});
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly aviso = signal('');
  protected readonly plantillaActual = computed(
    () => this.plantillas().find((plantilla) => plantilla.id === this.candidato()?.puesto_id) ?? null,
  );

  ngOnInit(): void {
    this.cargando.set(true);
    this.servicio.obtenerPlantillasCandidato().subscribe({
      next: ({ plantillas }) => {
        this.plantillas.set(plantillas);
        this.servicio.obtenerMiRegistroCandidato().subscribe({
          next: ({ candidato }) => {
            this.candidato.set(candidato);
            this.respuestas.set(candidato?.respuestas ?? {});
            this.cargando.set(false);
          },
          error: (error: HttpErrorResponse) => {
            this.error.set(error.error?.mensaje || 'No se pudo consultar el registro del candidato.');
            this.cargando.set(false);
          },
        });
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudieron cargar las pruebas disponibles.');
        this.cargando.set(false);
      },
    });
  }

  protected actualizarRespuesta(clave: string, event: Event): void {
    const texto = (event.target as HTMLTextAreaElement).value;
    this.respuestas.update((actuales) => ({ ...actuales, [clave]: texto }));
  }

  protected entregarPrueba(): void {
    const plantilla = this.plantillaActual()?.evaluacion;
    if (!plantilla) return;
    const claves = plantilla.secciones.flatMap((seccion) => (
      seccion.items.map((item, indice) => `${seccion.id}-${indice}`)
    ));
    if (claves.some((clave) => !this.respuestas()[clave]?.trim())) {
      this.error.set('Completa todas las respuestas antes de entregar la prueba.');
      return;
    }
    if (!window.confirm('¿Entregar la prueba? Después de enviarla ya no podrás modificar tus respuestas.')) return;
    this.error.set('');
    this.aviso.set('');
    this.guardando.set(true);
    this.servicio.entregarPruebaCandidato(this.respuestas()).subscribe({
      next: ({ mensaje }) => {
        this.aviso.set(mensaje);
        this.servicio.obtenerMiRegistroCandidato().subscribe({
          next: ({ candidato }) => {
            this.candidato.set(candidato);
            this.guardando.set(false);
          },
          error: (error: HttpErrorResponse) => {
            this.error.set(error.error?.mensaje || 'La prueba se entregó, pero no se pudo actualizar su estado.');
            this.guardando.set(false);
          },
        });
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudo entregar la prueba.');
        this.guardando.set(false);
      },
    });
  }

  protected salir(): void {
    this.auth.logout();
  }
}

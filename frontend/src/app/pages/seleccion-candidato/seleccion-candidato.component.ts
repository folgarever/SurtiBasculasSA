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
  protected readonly nombres = signal('');
  protected readonly apellidos = signal('');
  protected readonly fechaNacimiento = signal('');
  protected readonly puestoId = signal('');
  protected readonly respuestas = signal<Record<string, string>>({});
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly aviso = signal('');
  protected readonly edadCalculada = computed(() => this.calcularEdad(this.fechaNacimiento()));
  protected readonly plantillaActual = computed(
    () => this.plantillas().find((plantilla) => String(plantilla.id) === this.puestoId())
      ?? this.plantillas().find((plantilla) => plantilla.id === this.candidato()?.puesto_id)
      ?? null,
  );

  ngOnInit(): void {
    this.cargando.set(true);
    this.servicio.obtenerPlantillasCandidato().subscribe({
      next: ({ plantillas }) => {
        this.plantillas.set(plantillas);
        if (plantillas.length) this.puestoId.set(String(plantillas[0].id));
        this.servicio.obtenerMiRegistroCandidato().subscribe({
          next: ({ candidato }) => {
            this.candidato.set(candidato);
            if (candidato) {
              this.nombres.set(candidato.nombres);
              this.apellidos.set(candidato.apellidos);
              this.fechaNacimiento.set(candidato.fecha_nacimiento);
              this.puestoId.set(String(candidato.puesto_id));
              this.respuestas.set(candidato.respuestas ?? {});
            }
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

  protected actualizarNombres(event: Event): void {
    this.nombres.set((event.target as HTMLInputElement).value);
  }

  protected actualizarApellidos(event: Event): void {
    this.apellidos.set((event.target as HTMLInputElement).value);
  }

  protected actualizarFechaNacimiento(event: Event): void {
    this.fechaNacimiento.set((event.target as HTMLInputElement).value);
  }

  protected actualizarPuesto(event: Event): void {
    this.puestoId.set((event.target as HTMLSelectElement).value);
  }

  protected actualizarRespuesta(clave: string, event: Event): void {
    const texto = (event.target as HTMLTextAreaElement).value;
    this.respuestas.update((actuales) => ({ ...actuales, [clave]: texto }));
  }

  protected iniciarPrueba(): void {
    if (!this.nombres().trim() || !this.apellidos().trim() || !this.fechaNacimiento() || !this.puestoId()) {
      this.error.set('Completa nombres, apellidos, fecha de nacimiento y puesto al que aspiras.');
      return;
    }
    const edad = this.edadCalculada();
    if (edad === null || edad < 0) {
      this.error.set('La fecha de nacimiento no es válida.');
      return;
    }
    this.error.set('');
    this.guardando.set(true);
    this.servicio.registrarCandidato({
      nombres: this.nombres().trim(),
      apellidos: this.apellidos().trim(),
      fecha_nacimiento: this.fechaNacimiento(),
      puesto_id: Number(this.puestoId()),
    }).subscribe({
      next: ({ candidato }) => {
        this.candidato.set(candidato);
        this.guardando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudo registrar la información del candidato.');
        this.guardando.set(false);
      },
    });
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

  private calcularEdad(fecha: string): number | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const nacimiento = new Date(anio, mes - 1, dia);
    if (
      nacimiento.getFullYear() !== anio
      || nacimiento.getMonth() !== mes - 1
      || nacimiento.getDate() !== dia
    ) return null;
    const hoy = new Date();
    let edad = hoy.getFullYear() - anio;
    if (hoy.getMonth() < mes - 1 || (hoy.getMonth() === mes - 1 && hoy.getDate() < dia)) edad -= 1;
    return edad;
  }
}

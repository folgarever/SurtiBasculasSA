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
  protected readonly nombres = signal('');
  protected readonly apellidos = signal('');
  protected readonly fechaNacimiento = signal('');
  protected readonly puestoId = signal('');
  protected readonly curriculum = signal<File | null>(null);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly aviso = signal('');
  protected readonly edadCalculada = computed(() => this.calcularEdad(this.fechaNacimiento()));
  protected readonly plantillaActual = computed(
    () => this.plantillas().find((plantilla) => plantilla.id === this.candidato()?.puesto_id) ?? null,
  );

  protected etiquetaDecision(decision: NonNullable<RegistroCandidatoSeleccion['decision']>): string {
    return {
      recomendable: 'Recomendable para el puesto',
      revision_adicional: 'Revisión adicional',
      no_demostrada: 'Competencia aún no demostrada',
    }[decision];
  }

  ngOnInit(): void {
    this.servicio.obtenerPlantillasCandidato().subscribe({
      next: ({ plantillas }) => {
        this.plantillas.set(plantillas);
        this.puestoId.set(plantillas[0] ? String(plantillas[0].id) : '');
        this.servicio.obtenerMiRegistroCandidato().subscribe({
          next: ({ candidato }) => {
            this.candidato.set(candidato);
            if (candidato) {
              this.nombres.set(candidato.nombres ?? '');
              this.apellidos.set(candidato.apellidos ?? '');
              this.fechaNacimiento.set(candidato.fecha_nacimiento ?? '');
              this.puestoId.set(String(candidato.puesto_id ?? ''));
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

  protected actualizarPerfil(campo: 'nombres' | 'apellidos' | 'fecha_nacimiento' | 'puesto_id', event: Event): void {
    const valor = (event.target as HTMLInputElement | HTMLSelectElement).value;
    if (campo === 'nombres') this.nombres.set(valor);
    if (campo === 'apellidos') this.apellidos.set(valor);
    if (campo === 'fecha_nacimiento') this.fechaNacimiento.set(valor);
    if (campo === 'puesto_id') this.puestoId.set(valor);
  }

  protected seleccionarCurriculum(event: Event): void {
    const archivo = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.curriculum.set(archivo);
  }

  protected registrarPerfil(): void {
    const archivo = this.curriculum();
    if (!this.nombres().trim() || !this.apellidos().trim() || !this.fechaNacimiento() || !this.puestoId() || !archivo) {
      this.error.set('Completa tus datos, selecciona el puesto y adjunta tu currículum PDF.');
      return;
    }
    if (archivo.type !== 'application/pdf' || archivo.size > 5 * 1024 * 1024) {
      this.error.set('El currículum debe ser un archivo PDF de máximo 5 MB.');
      return;
    }
    this.error.set('');
    this.guardando.set(true);
    this.servicio.registrarPerfilCandidato({
      nombres: this.nombres().trim(),
      apellidos: this.apellidos().trim(),
      fecha_nacimiento: this.fechaNacimiento(),
      puesto_id: Number(this.puestoId()),
      curriculum: archivo,
    }).subscribe({
      next: ({ candidato }) => {
        this.candidato.set(candidato);
        this.guardando.set(false);
        this.aviso.set('Tus datos y currículum se guardaron. Ya puedes iniciar la evaluación.');
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.mensaje || 'No se pudo guardar tu perfil y currículum.');
        this.guardando.set(false);
      },
    });
  }

  protected actualizarRespuesta(clave: string, valor: string): void {
    this.respuestas.update((actuales) => ({ ...actuales, [clave]: valor }));
  }

  protected entregarPrueba(): void {
    const plantilla = this.plantillaActual()?.evaluacion;
    if (!plantilla) return;
    const claves = plantilla.secciones.flatMap((seccion) => (
      seccion.items.map((item, indice) => `${seccion.id}-${indice}`)
    ));
    if (claves.some((clave) => !this.respuestas()[clave])) {
      this.error.set('Selecciona una opción en cada pregunta antes de entregar la prueba.');
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

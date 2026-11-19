import { AppShellComponent } from '../../components/app-shell/app-shell.component';
import { NAV_ADMIN, SUGERENCIAS_ADMIN } from '../../components/app-shell/nav-items';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideEye,
  lucideEyeClosed,
  lucideLayoutDashboard,
  lucideLogOut,
  lucideMessageSquare,
  lucidePencil,
  lucidePlus,
  lucideSearch,
  lucideShieldCheck,
  lucideUsers,
  lucideX,
} from '@ng-icons/lucide';
import { AuthService } from '../../services/auth.service';
import { DatosPuesto, Puesto, RrhhService } from '../../services/rrhh.service';

@Component({
  selector: 'app-puestos',
  standalone: true,
  imports: [AppShellComponent, ReactiveFormsModule, RouterLink, NgIcon],
  providers: [provideIcons({
    lucideEye,
    lucideEyeClosed,
    lucideLayoutDashboard,
    lucideLogOut,
    lucideMessageSquare,
    lucidePencil,
    lucidePlus,
    lucideSearch,
    lucideShieldCheck,
    lucideUsers,
    lucideX,
  })],
  templateUrl: './puestos.component.html',
})
export class PuestosComponent implements OnInit {
  protected readonly navItems = NAV_ADMIN;
  protected readonly bottomItems = [SUGERENCIAS_ADMIN];
  private readonly formBuilder = inject(FormBuilder);
  private readonly rrhh = inject(RrhhService);
  private readonly auth = inject(AuthService);

  protected readonly usuario = this.auth.getUsuario();
  protected readonly puestos = signal<Puesto[]>([]);
  protected readonly busqueda = signal('');
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly modal = signal<'crear' | 'editar' | null>(null);
  protected readonly puestoSeleccionado = signal<Puesto | null>(null);
  protected readonly errorModal = signal('');
  protected readonly aviso = signal<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  protected readonly mostrarContrasenaAdmin = signal(false);
  protected readonly puestosFiltrados = computed(() => {
    const termino = this.busqueda().trim().toLocaleLowerCase();
    if (!termino) return this.puestos();
    return this.puestos().filter((puesto) => (
      `${puesto.codigo_abreviatura} ${puesto.nombre_puesto} ${puesto.departamento || ''}`
        .toLocaleLowerCase()
        .includes(termino)
    ));
  });
  protected readonly administradores = computed(() => (
    this.puestos().filter((puesto) => Number(puesto.es_admin) === 1 || puesto.es_admin === true).length
  ));
  protected readonly formulario = this.formBuilder.nonNullable.group({
    codigo_abreviatura: ['', [
      Validators.required,
      Validators.pattern(/^[A-Za-z0-9]{1,10}$/),
    ]],
    nombre_puesto: ['', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(100),
    ]],
    departamento: ['General', [Validators.required, Validators.maxLength(100)]],
    frecuencia_evaluacion: ['mensual' as DatosPuesto['frecuencia_evaluacion'], Validators.required],
    es_admin: [false],
    contrasena_admin: ['', Validators.required],
  });

  ngOnInit(): void {
    this.cargarPuestos();
  }

  protected actualizarBusqueda(event: Event): void {
    this.busqueda.set((event.target as HTMLInputElement).value);
  }

  protected abrirFormulario(): void {
    this.errorModal.set('');
    this.mostrarContrasenaAdmin.set(false);
    this.puestoSeleccionado.set(null);
    this.formulario.controls.codigo_abreviatura.enable();
    this.formulario.controls.es_admin.enable();
    this.formulario.reset({
      codigo_abreviatura: '',
      nombre_puesto: '',
      departamento: 'General',
      frecuencia_evaluacion: 'mensual',
      es_admin: false,
      contrasena_admin: '',
    });
    this.modal.set('crear');
  }

  protected editarPuesto(puesto: Puesto): void {
    this.errorModal.set('');
    this.mostrarContrasenaAdmin.set(false);
    this.puestoSeleccionado.set(puesto);
    const protegido = this.esPuestoProtegido(puesto);
    if (protegido) {
      this.formulario.controls.codigo_abreviatura.disable();
      this.formulario.controls.es_admin.disable();
    } else {
      this.formulario.controls.codigo_abreviatura.enable();
      this.formulario.controls.es_admin.enable();
    }
    this.formulario.reset({
      codigo_abreviatura: puesto.codigo_abreviatura,
      nombre_puesto: puesto.nombre_puesto,
      departamento: puesto.departamento || 'General',
      frecuencia_evaluacion: puesto.frecuencia_evaluacion || 'mensual',
      es_admin: Number(puesto.es_admin) === 1 || puesto.es_admin === true,
      contrasena_admin: '',
    });
    this.modal.set('editar');
  }

  protected puestoProtegido(): boolean {
    const puesto = this.puestoSeleccionado();
    return Boolean(puesto && this.esPuestoProtegido(puesto));
  }

  protected esAdmin(puesto: Puesto): boolean {
    return Number(puesto.es_admin) === 1 || puesto.es_admin === true;
  }

  protected alternarVisibilidadContrasenaAdmin(): void {
    this.mostrarContrasenaAdmin.update((visible) => !visible);
  }

  protected cerrarFormulario(): void {
    if (!this.guardando()) {
      this.modal.set(null);
      this.mostrarContrasenaAdmin.set(false);
    }
  }

  protected guardarPuesto(): void {
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid || this.guardando()) return;

    const value = this.formulario.getRawValue();
    const datos: DatosPuesto = {
      codigo_abreviatura: value.codigo_abreviatura.trim().toUpperCase(),
      nombre_puesto: value.nombre_puesto.trim(),
      departamento: value.departamento.trim(),
      frecuencia_evaluacion: value.frecuencia_evaluacion,
      es_admin: value.es_admin,
      contrasena_admin: value.contrasena_admin,
    };
    const puesto = this.puestoSeleccionado();

    this.errorModal.set('');
    this.guardando.set(true);
    const operacion = puesto
      ? this.rrhh.actualizarPuesto(puesto.id, datos)
      : this.rrhh.registrarPuesto(datos);

    operacion.subscribe({
      next: ({ mensaje }) => {
        this.aviso.set({ tipo: 'success', texto: mensaje });
        this.modal.set(null);
        this.guardando.set(false);
        this.cargarPuestos();
      },
      error: (error: HttpErrorResponse) => {
        this.errorModal.set(error.error?.mensaje || 'No fue posible guardar el puesto.');
        this.guardando.set(false);
      },
    });
  }

  private esPuestoProtegido(puesto: Puesto): boolean {
    return puesto.codigo_abreviatura === 'GG' || puesto.codigo_abreviatura === 'AC';
  }

  private cargarPuestos(): void {
    this.cargando.set(true);
    this.rrhh.obtenerPuestos().subscribe({
      next: ({ puestos }) => {
        this.puestos.set(puestos);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.aviso.set({ tipo: 'error', texto: error.error?.mensaje || 'No se pudieron cargar los puestos.' });
      },
    });
  }
}

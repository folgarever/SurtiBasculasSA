import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideClipboardCheck,
  lucideEye,
  lucideEyeClosed,
  lucideLayoutDashboard,
  lucideLogOut,
  lucidePencil,
  lucidePlus,
  lucideSearch,
  lucideShieldCheck,
  lucideTrash2,
  lucideUsers,
  lucideUserRoundCog,
  lucideX,
} from '@ng-icons/lucide';
import { AuthService } from '../../services/auth.service';
import { EmpleadoAdministracion, RrhhService, Puesto } from '../../services/rrhh.service';

@Component({
  selector: 'app-empleados',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgIcon],
  providers: [provideIcons({
    lucideClipboardCheck,
    lucideEye,
    lucideEyeClosed,
    lucideLayoutDashboard,
    lucideLogOut,
    lucidePencil,
    lucidePlus,
    lucideSearch,
    lucideShieldCheck,
    lucideTrash2,
    lucideUsers,
    lucideUserRoundCog,
    lucideX,
  })],
  templateUrl: './empleados.component.html',
})
export class EmpleadosComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly rrhh = inject(RrhhService);
  private readonly auth = inject(AuthService);

  protected readonly usuario = this.auth.getUsuario();
  protected readonly empleados = signal<EmpleadoAdministracion[]>([]);
  protected readonly puestos = signal<Puesto[]>([]);
  protected readonly busqueda = signal('');
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly mostrarContrasenaEmpleado = signal(false);
  protected readonly mostrarContrasenaAdmin = signal(false);
  protected readonly mostrarContrasenaBaja = signal(false);
  protected readonly modal = signal<'crear' | 'editar' | 'eliminar' | null>(null);
  protected readonly empleadoSeleccionado = signal<EmpleadoAdministracion | null>(null);
  protected readonly errorModal = signal('');
  protected readonly aviso = signal<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  protected readonly empleadosFiltrados = computed(() => {
    const termino = this.busqueda().trim().toLocaleLowerCase();
    if (!termino) return this.empleados();
    return this.empleados().filter((empleado) => (
      `${empleado.codigo_empleado} ${empleado.nombre} ${empleado.nombre_puesto} ${empleado.rol}`
        .toLocaleLowerCase()
        .includes(termino)
    ));
  });
  protected readonly empleadosActivos = computed(() => this.empleados().filter((empleado) => empleado.activo).length);
  protected readonly formulario = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    puesto_id: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(72)]],
    activo: [true],
    contrasena_admin: ['', Validators.required],
  });
  protected readonly confirmacionForm = this.formBuilder.nonNullable.group({
    contrasena_admin: ['', Validators.required],
  });

  ngOnInit(): void {
    this.cargarEmpleados();
    this.rrhh.obtenerPuestos().subscribe({
      next: ({ puestos }) => this.puestos.set(puestos),
      error: (error: HttpErrorResponse) => this.mostrarError(error, 'No se pudieron cargar los puestos.'),
    });
  }

  protected actualizarBusqueda(event: Event): void {
    this.busqueda.set((event.target as HTMLInputElement).value);
  }

  protected abrirFormulario(): void {
    this.ocultarContrasenas();
    this.empleadoSeleccionado.set(null);
    this.errorModal.set('');
    this.formulario.controls.puesto_id.enable();
    this.formulario.controls.password.setValidators([
      Validators.required,
      Validators.minLength(6),
      Validators.maxLength(72),
    ]);
    this.formulario.reset({
      nombre: '',
      puesto_id: '',
      password: '',
      activo: true,
      contrasena_admin: '',
    });
    this.formulario.controls.password.updateValueAndValidity();
    this.modal.set('crear');
  }

  protected editarEmpleado(empleado: EmpleadoAdministracion): void {
    if (!this.puedeEditar(empleado)) return;
    this.ocultarContrasenas();
    this.empleadoSeleccionado.set(empleado);
    this.errorModal.set('');
    if (empleado.rol === 'ADMIN') {
      this.formulario.controls.puesto_id.disable();
    } else {
      this.formulario.controls.puesto_id.enable();
    }
    this.formulario.controls.password.setValidators([Validators.minLength(6), Validators.maxLength(72)]);
    this.formulario.reset({
      nombre: empleado.nombre,
      puesto_id: String(empleado.puesto_id),
      password: '',
      activo: Boolean(empleado.activo),
      contrasena_admin: '',
    });
    this.formulario.controls.password.updateValueAndValidity();
    this.modal.set('editar');
  }

  protected confirmarBaja(empleado: EmpleadoAdministracion): void {
    if (!this.puedeEditar(empleado)) return;
    this.ocultarContrasenas();
    this.empleadoSeleccionado.set(empleado);
    this.errorModal.set('');
    this.confirmacionForm.reset({ contrasena_admin: '' });
    this.modal.set('eliminar');
  }

  protected puedeEditar(empleado: EmpleadoAdministracion): boolean {
    if (empleado.id === this.usuario?.id) return false;
    if (empleado.rol !== 'ADMIN') return true;
    return this.usuario?.codigo_empleado === 'SUR-GG-001'
      && empleado.codigo_empleado === 'SUR-AC-002';
  }

  protected puedeDarBaja(empleado: EmpleadoAdministracion): boolean {
    return empleado.rol !== 'ADMIN' && empleado.id !== this.usuario?.id;
  }

  protected cerrarFormulario(): void {
    if (!this.guardando()) {
      this.modal.set(null);
      this.ocultarContrasenas();
    }
  }

  private ocultarContrasenas(): void {
    this.mostrarContrasenaEmpleado.set(false);
    this.mostrarContrasenaAdmin.set(false);
    this.mostrarContrasenaBaja.set(false);
  }

  protected codigoPrevisto(): string {
    const puesto = this.puestos().find((item) => item.id === Number(this.formulario.controls.puesto_id.value));
    return puesto ? `SUR-${puesto.codigo_abreviatura}-###` : 'Selecciona un puesto';
  }

  protected cambioDePuesto(): boolean {
    const empleado = this.empleadoSeleccionado();
    return Boolean(empleado && Number(this.formulario.controls.puesto_id.value) !== empleado.puesto_id);
  }

  protected puestoProtegido(): boolean {
    return this.empleadoSeleccionado()?.rol === 'ADMIN';
  }

  protected alternarVisibilidadContrasenaEmpleado(): void {
    this.mostrarContrasenaEmpleado.update((visible) => !visible);
  }

  protected alternarVisibilidadContrasenaAdmin(): void {
    this.mostrarContrasenaAdmin.update((visible) => !visible);
  }

  protected alternarVisibilidadContrasenaBaja(): void {
    this.mostrarContrasenaBaja.update((visible) => !visible);
  }

  protected guardarEmpleado(): void {
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid || this.guardando()) return;

    const value = this.formulario.getRawValue();
    const empleado = this.empleadoSeleccionado();
    this.errorModal.set('');
    this.guardando.set(true);
    const operacion = empleado
      ? this.rrhh.actualizarEmpleado(empleado.id, {
        nombre: value.nombre.trim(),
        puesto_id: Number(value.puesto_id),
        activo: value.activo,
        ...(value.password ? { password: value.password } : {}),
        contrasena_admin: value.contrasena_admin,
      })
      : this.rrhh.registrarEmpleado({
        nombre: value.nombre.trim(),
        puesto_id: Number(value.puesto_id),
        password: value.password,
        contrasena_admin: value.contrasena_admin,
      });

    operacion.subscribe({
      next: ({ mensaje, empleado }) => {
        this.aviso.set({
          tipo: 'success',
          texto: `${mensaje} Código de acceso: ${empleado.codigo_empleado}.`,
        });
        this.modal.set(null);
        this.guardando.set(false);
        this.cargarEmpleados();
      },
      error: (error: HttpErrorResponse) => {
        this.errorModal.set(error.error?.mensaje || 'No fue posible guardar los cambios.');
        this.guardando.set(false);
      },
    });
  }

  protected darDeBaja(): void {
    this.confirmacionForm.markAllAsTouched();
    const empleado = this.empleadoSeleccionado();
    if (this.confirmacionForm.invalid || !empleado || this.guardando()) return;

    this.errorModal.set('');
    this.guardando.set(true);
    this.rrhh.eliminarEmpleado(
      empleado.id,
      this.confirmacionForm.controls.contrasena_admin.value,
    ).subscribe({
      next: ({ mensaje }) => {
        this.aviso.set({ tipo: 'success', texto: mensaje });
        this.modal.set(null);
        this.guardando.set(false);
        this.cargarEmpleados();
      },
      error: (error: HttpErrorResponse) => {
        this.errorModal.set(error.error?.mensaje || 'No fue posible dar de baja al empleado.');
        this.guardando.set(false);
      },
    });
  }

  protected salir(): void {
    this.auth.logout();
  }

  private cargarEmpleados(): void {
    this.cargando.set(true);
    this.rrhh.obtenerEmpleadosAdministracion().subscribe({
      next: ({ empleados }) => {
        this.empleados.set(empleados);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.mostrarError(error, 'No se pudo cargar el directorio de empleados.');
      },
    });
  }

  private mostrarError(error: HttpErrorResponse, mensajePredeterminado: string): void {
    this.aviso.set({ tipo: 'error', texto: error.error?.mensaje || mensajePredeterminado });
  }
}

import { AppShellComponent } from '../../components/app-shell/app-shell.component';
import { NAV_ADMIN, SUGERENCIAS_ADMIN } from '../../components/app-shell/nav-items';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideClipboardCheck,
  lucideDownload,
  lucideEye,
  lucideEyeClosed,
  lucideLayoutDashboard,
  lucideLogOut,
  lucideMessageSquare,
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
import { DatosPuesto, EmpleadoAdministracion, RrhhService, Puesto } from '../../services/rrhh.service';

type ColumnaOrden = 'nombre' | 'puesto' | 'rol' | 'ficha';

@Component({
  selector: 'app-empleados',
  standalone: true,
  imports: [AppShellComponent, ReactiveFormsModule, RouterLink, NgIcon],
  providers: [provideIcons({
    lucideClipboardCheck,
    lucideDownload,
    lucideEye,
    lucideEyeClosed,
    lucideLayoutDashboard,
    lucideLogOut,
    lucideMessageSquare,
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
  protected readonly navItems = NAV_ADMIN;
  protected readonly bottomItems = [SUGERENCIAS_ADMIN];
  private readonly formBuilder = inject(FormBuilder);
  private readonly rrhh = inject(RrhhService);
  private readonly auth = inject(AuthService);

  protected readonly usuario = this.auth.getUsuario();
  protected readonly esGerenteGeneral = this.auth.esGerenteGeneral();
  protected readonly empleados = signal<EmpleadoAdministracion[]>([]);
  protected readonly puestos = signal<Puesto[]>([]);
  protected readonly busqueda = signal('');
  protected readonly filtroPuesto = signal('');
  protected readonly filtroEstado = signal<'todos' | 'activos' | 'inactivos'>('todos');
  protected readonly filtroFicha = signal<'todas' | 'incompletas' | 'completas'>('todas');
  protected readonly orden = signal<{ columna: ColumnaOrden; direccion: 'asc' | 'desc' }>({
    columna: 'nombre',
    direccion: 'asc',
  });
  protected readonly tamanoPagina = signal(10);
  protected readonly pagina = signal(1);
  protected readonly opcionesPagina = [10, 25, 50];
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly mostrarContrasenaEmpleado = signal(false);
  protected readonly mostrarContrasenaAdmin = signal(false);
  protected readonly mostrarContrasenaBaja = signal(false);
  protected readonly modal = signal<'crear' | 'editar' | 'eliminar' | null>(null);
  protected readonly empleadoSeleccionado = signal<EmpleadoAdministracion | null>(null);
  protected readonly errorModal = signal('');
  protected readonly modalPuesto = signal(false);
  protected readonly puestoEditando = signal<Puesto | null>(null);
  protected readonly errorModalPuesto = signal('');
  protected readonly guardandoPuesto = signal(false);
  protected readonly mostrarContrasenaAdminPuesto = signal(false);
  protected readonly aviso = signal<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  protected readonly empleadosFiltrados = computed(() => {
    const termino = this.busqueda().trim().toLocaleLowerCase();
    const puesto = this.filtroPuesto();
    const estado = this.filtroEstado();
    const ficha = this.filtroFicha();
    return this.empleados().filter((empleado) => {
      const coincideBusqueda = `${empleado.codigo_empleado} ${empleado.nombre} ${empleado.nombre_puesto} ${empleado.rol}`
        .toLocaleLowerCase().includes(termino);
      const coincidePuesto = !puesto || String(empleado.puesto_id) === puesto;
      const coincideEstado = estado === 'todos'
        || (estado === 'activos' ? Boolean(empleado.activo) : !empleado.activo);
      const coincideFicha = ficha === 'todas'
        || (ficha === 'completas' ? Boolean(empleado.ficha_completa) : !empleado.ficha_completa);
      return coincideBusqueda && coincidePuesto && coincideEstado && coincideFicha;
    });
  });
  protected readonly empleadosOrdenados = computed(() => {
    const { columna, direccion } = this.orden();
    const factor = direccion === 'asc' ? 1 : -1;
    const valor = (empleado: EmpleadoAdministracion): string | number => {
      if (columna === 'puesto') return empleado.nombre_puesto;
      if (columna === 'rol') return empleado.rol;
      if (columna === 'ficha') return empleado.ficha_completa ? 1 : 0;
      return empleado.nombre;
    };
    return [...this.empleadosFiltrados()].sort((a, b) => {
      // Los activos siempre se muestran antes que los inactivos.
      if (Boolean(a.activo) !== Boolean(b.activo)) return a.activo ? -1 : 1;
      const x = valor(a);
      const y = valor(b);
      const comparacion = typeof x === 'number' && typeof y === 'number'
        ? x - y
        : String(x).localeCompare(String(y), 'es', { sensitivity: 'base' });
      return (comparacion || a.nombre.localeCompare(b.nombre, 'es')) * factor;
    });
  });
  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.empleadosOrdenados().length / this.tamanoPagina())));
  protected readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  protected readonly empleadosPagina = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.tamanoPagina();
    return this.empleadosOrdenados().slice(inicio, inicio + this.tamanoPagina());
  });
  protected readonly gruposEmpleados = computed(() => {
    const empleados = this.empleadosPagina();
    return [
      { estado: 'activos', titulo: 'Empleados activos', empleados: empleados.filter((empleado) => empleado.activo) },
      { estado: 'inactivos', titulo: 'Empleados inactivos', empleados: empleados.filter((empleado) => !empleado.activo) },
    ].filter((grupo) => grupo.empleados.length > 0);
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
  protected readonly formularioPuesto = this.formBuilder.nonNullable.group({
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
    this.cargarEmpleados();
    this.cargarPuestos();
  }

  protected actualizarBusqueda(event: Event): void {
    this.busqueda.set((event.target as HTMLInputElement).value);
    this.pagina.set(1);
  }

  protected actualizarFiltroPuesto(event: Event): void {
    this.filtroPuesto.set((event.target as HTMLSelectElement).value);
    this.pagina.set(1);
  }

  protected actualizarFiltroEstado(event: Event): void {
    const estado = (event.target as HTMLSelectElement).value;
    if (estado === 'todos' || estado === 'activos' || estado === 'inactivos') {
      this.filtroEstado.set(estado);
      this.pagina.set(1);
    }
  }

  protected actualizarFiltroFicha(event: Event): void {
    const ficha = (event.target as HTMLSelectElement).value;
    if (ficha === 'todas' || ficha === 'incompletas' || ficha === 'completas') {
      this.filtroFicha.set(ficha);
      this.pagina.set(1);
    }
  }

  protected limpiarFiltros(): void {
    this.busqueda.set('');
    this.filtroPuesto.set('');
    this.filtroEstado.set('todos');
    this.filtroFicha.set('todas');
    this.pagina.set(1);
  }

  protected ordenarPor(columna: ColumnaOrden): void {
    this.orden.update((actual) => ({
      columna,
      direccion: actual.columna === columna && actual.direccion === 'asc' ? 'desc' : 'asc',
    }));
    this.pagina.set(1);
  }

  protected ariaOrden(columna: ColumnaOrden): 'ascending' | 'descending' | 'none' {
    const { columna: actual, direccion } = this.orden();
    if (actual !== columna) return 'none';
    return direccion === 'asc' ? 'ascending' : 'descending';
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina.set(Math.min(Math.max(1, pagina), this.totalPaginas()));
  }

  protected cambiarTamanoPagina(event: Event): void {
    const tamano = Number((event.target as HTMLSelectElement).value);
    if (this.opcionesPagina.includes(tamano)) {
      this.tamanoPagina.set(tamano);
      this.pagina.set(1);
    }
  }

  protected exportarCsv(): void {
    const celda = (valor: string) => {
      // Evita que Excel interprete el texto como fórmula.
      const texto = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
      return `"${texto.replace(/"/g, '""')}"`;
    };
    const filas = [
      ['Código', 'Nombre', 'Puesto', 'Rol', 'Estado', 'Ficha'],
      ...this.empleadosOrdenados().map((empleado) => [
        empleado.codigo_empleado,
        empleado.nombre,
        empleado.nombre_puesto,
        empleado.rol,
        empleado.activo ? 'Activo' : 'Inactivo',
        empleado.ficha_completa ? 'Completa' : 'Incompleta',
      ]),
    ];
    const contenido = `\uFEFF${filas.map((fila) => fila.map((valor) => celda(String(valor ?? ''))).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `empleados-${new Date().toISOString().slice(0, 10)}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  protected abrirFormulario(): void {
    this.modalPuesto.set(false);
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
    this.modalPuesto.set(false);
    this.ocultarContrasenas();
    this.empleadoSeleccionado.set(empleado);
    this.errorModal.set('');
    if (empleado.rol === 'ADMIN' && !this.esGerenteGeneral) {
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
    this.modalPuesto.set(false);
    this.ocultarContrasenas();
    this.empleadoSeleccionado.set(empleado);
    this.errorModal.set('');
    this.confirmacionForm.reset({ contrasena_admin: '' });
    this.modal.set('eliminar');
  }

  protected puedeEditar(empleado: EmpleadoAdministracion): boolean {
    if (empleado.id === this.usuario?.id) return false;
    if (empleado.rol !== 'ADMIN') return true;
    return this.esGerenteGeneral;
  }

  protected puedeDarBaja(empleado: EmpleadoAdministracion): boolean {
    return empleado.id !== this.usuario?.id
      && (empleado.rol !== 'ADMIN' || this.esGerenteGeneral);
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
    return this.empleadoSeleccionado()?.rol === 'ADMIN' && !this.esGerenteGeneral;
  }

  protected esPuestoAdmin(puesto: Puesto): boolean {
    return Number(puesto.es_admin) === 1 || puesto.es_admin === true;
  }

  protected abrirPuestos(): void {
    if (!this.esGerenteGeneral) return;
    this.modal.set(null);
    this.puestoEditando.set(null);
    this.errorModalPuesto.set('');
    this.mostrarContrasenaAdminPuesto.set(false);
    this.formularioPuesto.controls.codigo_abreviatura.enable();
    this.formularioPuesto.controls.es_admin.enable();
    this.formularioPuesto.reset({
      codigo_abreviatura: '',
      nombre_puesto: '',
      departamento: 'General',
      frecuencia_evaluacion: 'mensual',
      es_admin: false,
      contrasena_admin: '',
    });
    this.modalPuesto.set(true);
  }

  protected editarPuesto(puesto: Puesto): void {
    if (!this.esGerenteGeneral) return;
    this.errorModalPuesto.set('');
    this.mostrarContrasenaAdminPuesto.set(false);
    this.puestoEditando.set(puesto);
    if (this.esPuestoProtegido(puesto)) {
      this.formularioPuesto.controls.codigo_abreviatura.disable();
      this.formularioPuesto.controls.es_admin.disable();
    } else {
      this.formularioPuesto.controls.codigo_abreviatura.enable();
      this.formularioPuesto.controls.es_admin.enable();
    }
    this.formularioPuesto.reset({
      codigo_abreviatura: puesto.codigo_abreviatura,
      nombre_puesto: puesto.nombre_puesto,
      departamento: puesto.departamento || 'General',
      frecuencia_evaluacion: puesto.frecuencia_evaluacion || 'mensual',
      es_admin: this.esPuestoAdmin(puesto),
      contrasena_admin: '',
    });
  }

  protected esPuestoProtegido(puesto: Puesto): boolean {
    return puesto.codigo_abreviatura === 'GG' || puesto.codigo_abreviatura === 'AC';
  }

  protected alternarVisibilidadContrasenaAdminPuesto(): void {
    this.mostrarContrasenaAdminPuesto.update((visible) => !visible);
  }

  protected cancelarEdicionPuesto(): void {
    this.puestoEditando.set(null);
    this.errorModalPuesto.set('');
    this.formularioPuesto.controls.codigo_abreviatura.enable();
    this.formularioPuesto.controls.es_admin.enable();
    this.formularioPuesto.reset({
      codigo_abreviatura: '',
      nombre_puesto: '',
      departamento: 'General',
      frecuencia_evaluacion: 'mensual',
      es_admin: false,
      contrasena_admin: '',
    });
  }

  protected cerrarFormularioPuesto(): void {
    if (!this.guardandoPuesto()) {
      this.modalPuesto.set(false);
      this.mostrarContrasenaAdminPuesto.set(false);
    }
  }

  protected guardarPuesto(): void {
    if (!this.esGerenteGeneral) return;
    this.formularioPuesto.markAllAsTouched();
    if (this.formularioPuesto.invalid || this.guardandoPuesto()) return;

    const value = this.formularioPuesto.getRawValue();
    const datos: DatosPuesto = {
      codigo_abreviatura: value.codigo_abreviatura.trim().toUpperCase(),
      nombre_puesto: value.nombre_puesto.trim(),
      departamento: value.departamento.trim(),
      frecuencia_evaluacion: value.frecuencia_evaluacion,
      es_admin: value.es_admin,
      contrasena_admin: value.contrasena_admin,
    };
    const puesto = this.puestoEditando();

    this.errorModalPuesto.set('');
    this.guardandoPuesto.set(true);
    const operacion = puesto
      ? this.rrhh.actualizarPuesto(puesto.id, datos)
      : this.rrhh.registrarPuesto(datos);

    operacion.subscribe({
      next: ({ mensaje }) => {
        this.aviso.set({ tipo: 'success', texto: mensaje });
        this.guardandoPuesto.set(false);
        this.cancelarEdicionPuesto();
        this.cargarPuestos();
      },
      error: (error: HttpErrorResponse) => {
        this.errorModalPuesto.set(error.error?.mensaje || 'No fue posible guardar el puesto.');
        this.guardandoPuesto.set(false);
      },
    });
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

  private cargarPuestos(): void {
    this.rrhh.obtenerPuestos().subscribe({
      next: ({ puestos }) => this.puestos.set(puestos),
      error: (error: HttpErrorResponse) => this.mostrarError(error, 'No se pudieron cargar los puestos.'),
    });
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

export type NavVisibility = 'always' | 'admin' | 'rrhh' | 'evaluation' | 'employee';

export interface NavItem {
  label: string;
  route: string;
  icon?: string;
  visible?: NavVisibility;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_ADMIN: NavItem[] = [
  { label: 'Dashboard', route: '/admin', icon: 'lucideLayoutDashboard' },
  { label: 'Mi jornada', route: '/dashboard', icon: 'lucideClipboardCheck' },
  { label: 'Empleados', route: '/admin/empleados', icon: 'lucideUsers' },
  { label: 'Control de asistencia', route: '/rrhh', icon: 'lucideClipboardCheck' },
  { label: 'Solicitudes', route: '/solicitudes', icon: 'lucideCalendarDays' },
  { label: 'Evaluación de personal', route: '/evaluaciones', icon: 'lucideUserRoundCog', visible: 'evaluation' },
  { label: 'Evaluaciones de conocimiento', route: '/admin/evaluaciones-conocimiento', icon: 'lucideClipboardCheck', visible: 'evaluation' },
  { label: 'Pruebas de selección', route: '/admin/evaluaciones-seleccion', icon: 'lucideClipboardCheck', visible: 'evaluation' },
  { label: 'Mi evaluación de conocimiento', route: '/evaluaciones-conocimiento', icon: 'lucideClipboardCheck' },
];

export const NAV_EMPLEADO: NavItem[] = [
  { label: 'Mi jornada', route: '/dashboard', icon: 'lucideClipboardCheck' },
  { label: 'Gestión de personal', route: '/rrhh', icon: 'lucideUsers', visible: 'rrhh' },
  { label: 'Administración', route: '/admin', icon: 'lucideLayoutDashboard', visible: 'admin' },
  { label: 'Evaluación de conocimiento', route: '/evaluaciones-conocimiento', icon: 'lucideClipboardCheck' },
  { label: 'Evaluaciones', route: '/evaluaciones', icon: 'lucideUserRoundCog', visible: 'evaluation' },
  { label: 'Pruebas de selección', route: '/admin/evaluaciones-seleccion', icon: 'lucideClipboardCheck', visible: 'evaluation' },
];

export const SUGERENCIAS_ADMIN: NavItem = {
  label: 'Sugerencias',
  route: '/admin/sugerencias',
  icon: 'lucideMessageSquare',
  visible: 'admin',
};

export const SUGERENCIAS_EMPLEADO: NavItem = {
  label: 'Mis sugerencias',
  route: '/sugerencias',
  icon: 'lucideLightbulb',
  visible: 'employee',
};

export function obtenerNavegacion(esAdmin: boolean): { items: NavItem[]; bottomItems: NavItem[] } {
  return esAdmin
    ? { items: NAV_ADMIN, bottomItems: [SUGERENCIAS_ADMIN] }
    : { items: NAV_EMPLEADO, bottomItems: [SUGERENCIAS_ADMIN, SUGERENCIAS_EMPLEADO] };
}

export function obtenerSeccionesAdmin(_esGerenteGeneral: boolean): NavSection[] {
  const porRuta = (rutas: string[]) => NAV_ADMIN.filter((item) => rutas.includes(item.route));
  const modulos = { label: 'Módulos', items: porRuta(['/admin']) };
  const personal = { label: 'Mi espacio', items: porRuta(['/dashboard', '/evaluaciones-conocimiento']) };
  const gestion = { label: 'Gestión de personal', items: porRuta(['/admin/empleados', '/rrhh', '/solicitudes']) };
  const evaluaciones = { label: 'Evaluación y selección', items: porRuta(['/evaluaciones', '/admin/evaluaciones-conocimiento', '/admin/evaluaciones-seleccion']) };
  const comunicacion = { label: 'Comunicación', items: [SUGERENCIAS_ADMIN] };

  return [modulos, gestion, personal, evaluaciones, comunicacion];
}

export function obtenerSeccionesEmpleado(): NavSection[] {
  const porRuta = (rutas: string[]) => NAV_EMPLEADO.filter((item) => rutas.includes(item.route));
  return [
    { label: 'Mi espacio', items: porRuta(['/dashboard', '/evaluaciones-conocimiento']) },
    { label: 'Gestión de personal', items: porRuta(['/rrhh', '/admin']) },
    { label: 'Evaluación y selección', items: porRuta(['/evaluaciones', '/admin/evaluaciones-seleccion']) },
    { label: 'Comunicación', items: [SUGERENCIAS_ADMIN, SUGERENCIAS_EMPLEADO] },
  ];
}

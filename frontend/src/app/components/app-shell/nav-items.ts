export type NavVisibility = 'always' | 'admin' | 'rrhh' | 'evaluation' | 'employee';

export interface NavItem {
  label: string;
  route: string;
  icon?: string;
  visible?: NavVisibility;
}

export const NAV_ADMIN: NavItem[] = [
  { label: 'Dashboard', route: '/admin', icon: 'lucideLayoutDashboard' },
  { label: 'Empleados', route: '/admin/empleados', icon: 'lucideUsers' },
  { label: 'Control de asistencia', route: '/rrhh', icon: 'lucideClipboardCheck' },
  { label: 'Evaluación de personal', route: '/evaluaciones', icon: 'lucideUserRoundCog', visible: 'evaluation' },
  { label: 'Evaluaciones mensuales', route: '/admin/evaluaciones-conocimiento', icon: 'lucideClipboardCheck', visible: 'evaluation' },
  { label: 'Pruebas de selección', route: '/admin/evaluaciones-seleccion', icon: 'lucideClipboardCheck', visible: 'evaluation' },
];

export const NAV_EMPLEADO: NavItem[] = [
  { label: 'Mi jornada', route: '/dashboard', icon: 'lucideClipboardCheck' },
  { label: 'Gestión de personal', route: '/rrhh', icon: 'lucideUsers', visible: 'rrhh' },
  { label: 'Administración', route: '/admin', icon: 'lucideLayoutDashboard', visible: 'admin' },
  { label: 'Evaluación mensual', route: '/evaluaciones-conocimiento', icon: 'lucideClipboardCheck' },
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

import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { cambiosSinGuardarGuard } from './guards/cambios-sin-guardar.guard';
import { evaluationGuard } from './guards/evaluation.guard';
import { roleGuard } from './guards/role.guard';
import { employeeGuard } from './guards/employee.guard';
import { candidateGuard } from './guards/candidate.guard';

export const routes: Routes = [
	{
		path: 'login',
		loadComponent: () => import('./pages/login/login.component')
			.then((module) => module.LoginComponent),
	},
	{
		path: 'seleccion-candidato',
		loadComponent: () => import('./pages/seleccion-candidato/seleccion-candidato.component')
			.then((module) => module.SeleccionCandidatoComponent),
		canActivate: [candidateGuard],
	},
	{
		path: 'dashboard',
		loadComponent: () => import('./pages/empleado-dashboard/empleado-dashboard.component')
			.then((module) => module.EmpleadoDashboardComponent),
		canActivate: [authGuard],
	},
	{
		path: 'admin',
		loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.component')
			.then((module) => module.AdminDashboardComponent),
		canActivate: [adminGuard],
	},
	{
		path: 'admin/empleados',
		loadComponent: () => import('./pages/empleados/empleados.component')
			.then((module) => module.EmpleadosComponent),
		canActivate: [adminGuard],
	},
	{
		path: 'admin/empleados/:id',
		loadComponent: () => import('./pages/empleado-detalle/empleado-detalle.component')
			.then((module) => module.EmpleadoDetalleComponent),
		canActivate: [adminGuard],
		canDeactivate: [cambiosSinGuardarGuard],
	},
	{
		path: 'rrhh',
		loadComponent: () => import('./pages/rrhh-dashboard/rrhh-dashboard.component')
			.then((module) => module.RrhhDashboardComponent),
		canActivate: [authGuard, roleGuard],
	},
	{
		path: 'solicitudes',
		loadComponent: () => import('./pages/solicitudes/solicitudes.component')
			.then((module) => module.SolicitudesComponent),
		canActivate: [authGuard],
	},
	{
		path: 'evaluaciones',
		loadComponent: () => import('./pages/evaluaciones/evaluaciones.component')
			.then((module) => module.EvaluacionesComponent),
		canActivate: [authGuard, evaluationGuard],
	},
	{
		path: 'evaluaciones-conocimiento',
		loadComponent: () => import('./pages/evaluacion-conocimiento-empleado/evaluacion-conocimiento-empleado.component')
			.then((module) => module.EvaluacionConocimientoEmpleadoComponent),
		canActivate: [authGuard],
	},
	{
		path: 'admin/evaluaciones-conocimiento',
		loadComponent: () => import('./pages/evaluaciones-conocimiento-admin/evaluaciones-conocimiento-admin.component')
			.then((module) => module.EvaluacionesConocimientoAdminComponent),
		canActivate: [authGuard, evaluationGuard],
	},
	{
		path: 'admin/evaluaciones-seleccion',
		loadComponent: () => import('./pages/evaluaciones-seleccion/evaluaciones-seleccion.component')
			.then((module) => module.EvaluacionesSeleccionComponent),
		canActivate: [authGuard, evaluationGuard],
	},
	{
		path: 'sugerencias',
		loadComponent: () => import('./pages/sugerencias-empleado/sugerencias-empleado.component')
			.then((module) => module.SugerenciasEmpleadoComponent),
		canActivate: [employeeGuard],
	},
	{
		path: 'admin/sugerencias',
		loadComponent: () => import('./pages/sugerencias-admin/sugerencias-admin.component')
			.then((module) => module.SugerenciasAdminComponent),
		canActivate: [adminGuard],
	},
	{ path: '', pathMatch: 'full', redirectTo: 'login' },
	{ path: '**', redirectTo: 'login' },
];

import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { evaluationGuard } from './guards/evaluation.guard';
import { roleGuard } from './guards/role.guard';
import { employeeGuard } from './guards/employee.guard';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { EmpleadosComponent } from './pages/empleados/empleados.component';
import { EmpleadoDashboardComponent } from './pages/empleado-dashboard/empleado-dashboard.component';
import { EvaluacionesComponent } from './pages/evaluaciones/evaluaciones.component';
import { LoginComponent } from './pages/login/login.component';
import { RrhhDashboardComponent } from './pages/rrhh-dashboard/rrhh-dashboard.component';
import { SugerenciasEmpleadoComponent } from './pages/sugerencias-empleado/sugerencias-empleado.component';
import { SugerenciasAdminComponent } from './pages/sugerencias-admin/sugerencias-admin.component';

export const routes: Routes = [
	{ path: 'login', component: LoginComponent },
	{ path: 'dashboard', component: EmpleadoDashboardComponent, canActivate: [authGuard] },
	{ path: 'admin', component: AdminDashboardComponent, canActivate: [adminGuard] },
	{ path: 'admin/empleados', component: EmpleadosComponent, canActivate: [adminGuard] },
	{ path: 'rrhh', component: RrhhDashboardComponent, canActivate: [authGuard, roleGuard] },
	{ path: 'evaluaciones', component: EvaluacionesComponent, canActivate: [authGuard, evaluationGuard] },
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
	{ path: 'sugerencias', component: SugerenciasEmpleadoComponent, canActivate: [employeeGuard] },
	{ path: 'admin/sugerencias', component: SugerenciasAdminComponent, canActivate: [adminGuard] },
	{ path: '', pathMatch: 'full', redirectTo: 'login' },
	{ path: '**', redirectTo: 'login' },
];

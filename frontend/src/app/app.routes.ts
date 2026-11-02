import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { evaluationGuard } from './guards/evaluation.guard';
import { roleGuard } from './guards/role.guard';
import { EmpleadoDashboardComponent } from './pages/empleado-dashboard/empleado-dashboard.component';
import { EvaluacionesComponent } from './pages/evaluaciones/evaluaciones.component';
import { LoginComponent } from './pages/login/login.component';
import { RrhhDashboardComponent } from './pages/rrhh-dashboard/rrhh-dashboard.component';

export const routes: Routes = [
	{ path: 'login', component: LoginComponent },
	{ path: 'dashboard', component: EmpleadoDashboardComponent, canActivate: [authGuard] },
	{ path: 'rrhh', component: RrhhDashboardComponent, canActivate: [authGuard, roleGuard] },
	{ path: 'evaluaciones', component: EvaluacionesComponent, canActivate: [authGuard, evaluationGuard] },
	{ path: '', pathMatch: 'full', redirectTo: 'login' },
	{ path: '**', redirectTo: 'login' },
];
